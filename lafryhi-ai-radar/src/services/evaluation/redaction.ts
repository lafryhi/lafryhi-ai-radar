const SECRET_PATTERN = /(token|secret|password|credential|private[_-]?key)\s*[:=]\s*[^\s,}]+/gi;

export function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(SECRET_PATTERN, "$1=[REDACTED]").slice(0, 500);
}

export function redactCaseSource<T extends { source?: Record<string, unknown> }>(value: T, enabled: boolean): T {
  if (!enabled || !value.source) return value;
  const { content: _content, ...safeSource } = value.source;
  void _content;
  return { ...value, source: { ...safeSource, contentRedacted: true } } as T;
}
