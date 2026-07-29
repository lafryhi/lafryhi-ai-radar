import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "lafryhi_operator";
function digest(value: string) { return createHash("sha256").update(value).digest(); }

export function validOperatorToken(candidate: string) {
  const expected = process.env.OPERATOR_ACCESS_TOKEN;
  if (!expected || expected.length < 20) return false;
  return timingSafeEqual(digest(candidate), digest(expected));
}

export async function requireOperator() {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value || !validOperatorToken(value)) redirect("/operator/login");
}

export async function setOperatorCookie(value: string) {
  (await cookies()).set(COOKIE, value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/operator", maxAge: 60 * 60 * 8 });
}

export async function clearOperatorCookie() { (await cookies()).delete(COOKIE); }
