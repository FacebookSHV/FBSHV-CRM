import type { ApiResult } from "@/lib/ecommerce/types";

export type ExternalCoreClientOptions = {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
  retry?: number;
  retryDelayMs?: number;
  circuitBreakerWindowMs?: number;
  failureThreshold?: number;
  cooldownMs?: number;
  fetchImpl?: typeof fetch;
};

type CircuitState = {
  failures: number[];
  openedAt?: number;
  halfOpen: boolean;
};

const circuits = new Map<string, CircuitState>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function coreUnavailable(message = "Web TMĐT Core đang không phản hồi. Vui lòng thử lại sau hoặc xử lý thủ công.") {
  return {
    success: false as const,
    error: message,
    code: "CORE_UNAVAILABLE"
  };
}

function shouldRetry(status: number) {
  return status >= 500 || status === 408 || status === 429;
}

function circuitFor(key: string) {
  const existing = circuits.get(key);
  if (existing) return existing;
  const next: CircuitState = { failures: [], halfOpen: false };
  circuits.set(key, next);
  return next;
}

export function resetExternalCoreCircuit(baseUrl?: string) {
  if (baseUrl) circuits.delete(baseUrl);
  else circuits.clear();
}

export class ExternalCoreClient {
  private readonly timeoutMs: number;
  private readonly retry: number;
  private readonly retryDelayMs: number;
  private readonly circuitBreakerWindowMs: number;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ExternalCoreClientOptions) {
    this.timeoutMs = options.timeoutMs ?? 10000;
    this.retry = options.retry ?? 2;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.circuitBreakerWindowMs = options.circuitBreakerWindowMs ?? 60000;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.cooldownMs = options.cooldownMs ?? 120000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
    const baseUrl = this.options.baseUrl.replace(/\/$/, "");
    const state = circuitFor(baseUrl);
    const now = Date.now();
    if (state.openedAt && now - state.openedAt < this.cooldownMs && !state.halfOpen) {
      return coreUnavailable();
    }
    if (state.openedAt && now - state.openedAt >= this.cooldownMs) state.halfOpen = true;

    let lastError = "";
    for (let attempt = 0; attempt <= this.retry; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(new URL(path, `${baseUrl}/`), {
          ...init,
          signal: controller.signal,
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${this.options.apiKey}`,
            ...(init.headers ?? {})
          }
        });
        const payload = (await response.json().catch(() => null)) as ApiResult<T> | null;
        clearTimeout(timeout);
        if (response.ok) {
          state.failures = [];
          state.openedAt = undefined;
          state.halfOpen = false;
          return payload ?? { success: false, error: "Core trả dữ liệu không hợp lệ", code: "CORE_INVALID_RESPONSE" };
        }
        lastError = payload?.success === false ? payload.error : `Core trả HTTP ${response.status}`;
        if (!shouldRetry(response.status) || attempt >= this.retry) {
          this.recordFailure(baseUrl, state);
          return { success: false, error: lastError, code: response.status >= 500 ? "CORE_UNAVAILABLE" : "CORE_REQUEST_FAILED" };
        }
      } catch (error) {
        clearTimeout(timeout);
        lastError = error instanceof Error && error.name === "AbortError" ? "CORE_TIMEOUT" : error instanceof Error ? error.message : String(error);
        if (attempt >= this.retry) {
          this.recordFailure(baseUrl, state);
          return coreUnavailable(lastError === "CORE_TIMEOUT" ? "Web TMĐT Core phản hồi quá thời gian cho phép." : undefined);
        }
      }
      await sleep(this.retryDelayMs);
    }
    this.recordFailure(baseUrl, state);
    return coreUnavailable(lastError || undefined);
  }

  private recordFailure(baseUrl: string, state: CircuitState) {
    const now = Date.now();
    state.failures = [...state.failures, now].filter((time) => now - time <= this.circuitBreakerWindowMs);
    state.halfOpen = false;
    if (state.failures.length >= this.failureThreshold) state.openedAt = now;
    circuits.set(baseUrl, state);
  }
}
