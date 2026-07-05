import crypto from "crypto";

export const SESSION_COOKIE = "mobi_session";

// The cookie's value is derived from the shared password rather than being
// the password itself, so it's never sitting in plain text in the browser.
// Changing APP_PASSWORD automatically invalidates every existing session.
export function sessionToken(): string {
  const secret = process.env.APP_PASSWORD ?? "";
  return crypto.createHmac("sha256", secret).update("authenticated").digest("hex");
}

export function checkPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD ?? "";
  return Boolean(expected) && input === expected;
}
