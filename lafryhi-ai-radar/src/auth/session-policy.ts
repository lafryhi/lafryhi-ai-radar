const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function isValidAnonymousSessionId(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export function anonymousSessionCookieOptions(nodeEnv = process.env.NODE_ENV) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: nodeEnv === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  };
}
