param(
  [ValidateSet("Start", "Run", "Status", "Stop")]
  [string]$Action = "Start"
)

$ErrorActionPreference = "Stop"
$repoPath = Split-Path -Parent $PSScriptRoot
$bridgeScript = Join-Path $PSScriptRoot "imageflow-bridge.mjs"
$envFile = Join-Path $repoPath ".env.local"
$runtimeRoot = Join-Path $env:LOCALAPPDATA "FBSHV-CRM\imageflow-bridge"
$supervisorPidFile = Join-Path $runtimeRoot "supervisor.pid"
$bridgePidFile = Join-Path $runtimeRoot "bridge.pid"
$stopFile = Join-Path $runtimeRoot "stop.requested"
$stdoutLog = Join-Path $runtimeRoot "bridge.out.log"
$stderrLog = Join-Path $runtimeRoot "bridge.err.log"
$supervisorLog = Join-Path $runtimeRoot "supervisor.log"

function Ensure-RuntimeRoot {
  New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
}

function Write-SupervisorLog([string]$Message) {
  Ensure-RuntimeRoot
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -LiteralPath $supervisorLog -Value $line -Encoding UTF8
}

function Read-PidFile([string]$Path) {
  if (!(Test-Path -LiteralPath $Path)) { return 0 }
  $value = (Get-Content -LiteralPath $Path -Raw).Trim()
  if ($value -match "^\d+$") { return [int]$value }
  return 0
}

function Get-OwnedProcess([string]$PidPath, [string]$ExpectedCommand) {
  $processId = Read-PidFile $PidPath
  if ($processId -le 0) { return $null }
  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
  if (!$process -or $process.CommandLine -notmatch [regex]::Escape($ExpectedCommand)) { return $null }
  return $process
}

function Import-LocalEnv {
  if (!(Test-Path -LiteralPath $envFile)) {
    throw "NEED_USER_ENV_FILE: Missing $envFile"
  }
  foreach ($line in Get-Content -LiteralPath $envFile) {
    if ($line -notmatch "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$") { continue }
    $name = $matches[1]
    $value = $matches[2].Trim()
    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
  if ([string]::IsNullOrWhiteSpace($env:IMAGEFLOW_BRIDGE_TOKEN)) {
    throw "NEED_USER_IMAGEFLOW_BRIDGE_TOKEN"
  }
}

function Test-PoolScheduler {
  try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:7096/api/pool/status" -TimeoutSec 10
    return $response.ok -eq $true
  } catch {
    return $false
  }
}

function Show-Status {
  $supervisor = Get-OwnedProcess $supervisorPidFile "start-imageflow-bridge.ps1"
  $bridge = Get-OwnedProcess $bridgePidFile "imageflow-bridge.mjs"
  [pscustomobject]@{
    supervisorRunning = [bool]$supervisor
    supervisorPid = if ($supervisor) { $supervisor.ProcessId } else { $null }
    bridgeRunning = [bool]$bridge
    bridgePid = if ($bridge) { $bridge.ProcessId } else { $null }
    poolSchedulerReady = Test-PoolScheduler
    runtimeRoot = $runtimeRoot
  } | ConvertTo-Json
}

function Stop-OwnedProcesses {
  Ensure-RuntimeRoot
  Set-Content -LiteralPath $stopFile -Value (Get-Date).ToString("o") -Encoding ASCII
  $bridge = Get-OwnedProcess $bridgePidFile "imageflow-bridge.mjs"
  if ($bridge) { Stop-Process -Id $bridge.ProcessId -Force }
  $supervisor = Get-OwnedProcess $supervisorPidFile "start-imageflow-bridge.ps1"
  if ($supervisor -and $supervisor.ProcessId -ne $PID) {
    Stop-Process -Id $supervisor.ProcessId -Force
  }
  Remove-Item -LiteralPath $bridgePidFile, $supervisorPidFile -Force -ErrorAction SilentlyContinue
  Show-Status
}

function Start-Supervisor {
  Ensure-RuntimeRoot
  $existing = Get-OwnedProcess $supervisorPidFile "start-imageflow-bridge.ps1"
  if ($existing) {
    Show-Status
    return
  }
  Remove-Item -LiteralPath $stopFile -Force -ErrorAction SilentlyContinue
  $powershell = (Get-Process -Id $PID).Path
  Start-Process -FilePath $powershell `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$PSCommandPath`"", "-Action", "Run") `
    -WorkingDirectory $repoPath `
    -WindowStyle Hidden
  Start-Sleep -Seconds 2
  Show-Status
}

function Run-Supervisor {
  Ensure-RuntimeRoot
  $mutex = [Threading.Mutex]::new($false, "Local\FBSHV_CRM_IMAGEFLOW_BRIDGE")
  if (!$mutex.WaitOne(0)) {
    Write-SupervisorLog "Supervisor already running; exit duplicate."
    return
  }
  try {
    Set-Content -LiteralPath $supervisorPidFile -Value $PID -Encoding ASCII
    Remove-Item -LiteralPath $stopFile -Force -ErrorAction SilentlyContinue
    Import-LocalEnv
    $env:FBSHV_CRM_BASE_URL = "https://fbshv-crm.ngchihuy.workers.dev"
    $env:IMAGEFLOW_LOCAL_BASE_URL = "http://127.0.0.1:7096"
    $env:IMAGEFLOW_WORK_DIR = "D:\codex_manager_v3.1\tools\imageflow\work\crm_bridge"
    $env:IMAGEFLOW_BRIDGE_MODE = "watch"
    Write-SupervisorLog "CRM bridge supervisor started."

    while (!(Test-Path -LiteralPath $stopFile)) {
      if (!(Test-PoolScheduler)) {
        Write-SupervisorLog "Pool Scheduler unavailable; waiting."
        Start-Sleep -Seconds 15
        continue
      }
      $bridge = Get-OwnedProcess $bridgePidFile "imageflow-bridge.mjs"
      if (!$bridge) {
        $process = Start-Process -FilePath "node" `
          -ArgumentList @($bridgeScript, "--watch") `
          -WorkingDirectory $repoPath `
          -WindowStyle Hidden `
          -RedirectStandardOutput $stdoutLog `
          -RedirectStandardError $stderrLog `
          -PassThru
        Set-Content -LiteralPath $bridgePidFile -Value $process.Id -Encoding ASCII
        Write-SupervisorLog "Bridge started with PID $($process.Id)."
      }
      Start-Sleep -Seconds 10
    }
  } catch {
    Write-SupervisorLog "Supervisor error: $($_.Exception.Message)"
    throw
  } finally {
    $bridge = Get-OwnedProcess $bridgePidFile "imageflow-bridge.mjs"
    if ($bridge) { Stop-Process -Id $bridge.ProcessId -Force }
    Remove-Item -LiteralPath $bridgePidFile, $supervisorPidFile -Force -ErrorAction SilentlyContinue
    $mutex.ReleaseMutex()
    $mutex.Dispose()
  }
}

switch ($Action) {
  "Start" { Start-Supervisor }
  "Run" { Run-Supervisor }
  "Status" { Show-Status }
  "Stop" { Stop-OwnedProcesses }
}
