import { createHash, timingSafeEqual } from "node:crypto";

import type { EnvVars } from "../config/site-config";

export interface BasicAuthCredentials {
  user: string;
  password: string;
}

/** Reads the expected credentials from env; null when either is missing or empty. */
export function readBasicAuthCredentials(env: EnvVars = process.env): BasicAuthCredentials | null {
  const user = env.BASIC_AUTH_USER;
  const password = env.BASIC_AUTH_PASSWORD;
  if (!user || !password) return null;
  return { user, password };
}

// Hashing both sides first gives timingSafeEqual equal-length inputs, so the
// comparison time doesn't reveal the expected value's length either.
function safeEqual(actual: string, expected: string): boolean {
  const actualDigest = createHash("sha256").update(actual).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}

/** True when an `Authorization: Basic ...` header carries exactly the expected credentials. */
export function isAuthorized(authorizationHeader: string | null, expected: BasicAuthCredentials): boolean {
  if (!authorizationHeader?.startsWith("Basic ")) return false;

  let decoded: string;
  try {
    decoded = Buffer.from(authorizationHeader.slice("Basic ".length), "base64").toString("utf8");
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;

  const user = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  // Evaluate both comparisons so a wrong user and a wrong password take the same time.
  const isUserCorrect = safeEqual(user, expected.user);
  const isPasswordCorrect = safeEqual(password, expected.password);
  return isUserCorrect && isPasswordCorrect;
}
