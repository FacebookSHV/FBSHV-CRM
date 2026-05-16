export function blockedMetaPermission(permission: string, cause?: unknown) {
  const message = cause instanceof Error ? cause.message : "";
  const detail = message ? `: ${permission}: ${message}` : `: ${permission}`;
  return new Error(`BLOCKED_META_PERMISSION_MISSING${detail}`);
}

export async function withMetaPermission<T>(
  permission: string,
  action: () => Promise<T>
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw blockedMetaPermission(permission, error);
  }
}
