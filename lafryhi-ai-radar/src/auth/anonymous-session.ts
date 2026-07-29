import "server-only";
import { cookies } from "next/headers";
import { anonymousSessionCookieOptions, isValidAnonymousSessionId } from "./session-policy";

const COOKIE_NAME = "lai_anonymous_session";

export async function getAnonymousSessionId(): Promise<string | null> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  return isValidAnonymousSessionId(value) ? value : null;
}

export async function requireAnonymousSessionId(): Promise<string> {
  const existing = await getAnonymousSessionId();
  if (existing) return existing;
  const ownerId = crypto.randomUUID();
  (await cookies()).set(COOKIE_NAME, ownerId, anonymousSessionCookieOptions());
  return ownerId;
}
