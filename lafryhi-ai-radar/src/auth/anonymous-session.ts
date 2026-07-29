import "server-only";
import { cookies } from "next/headers";

const COOKIE_NAME = "lai_anonymous_session";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function getAnonymousSessionId(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

export async function requireAnonymousSessionId(): Promise<string> {
  const existing = await getAnonymousSessionId();
  if (existing) return existing;
  const ownerId = crypto.randomUUID();
  (await cookies()).set(COOKIE_NAME, ownerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  return ownerId;
}
