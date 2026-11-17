export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

type ThrottleState = { failedLoginAttempts: number; lockedUntil: Date | null };

export function isLockedOut(user: ThrottleState, now: Date): boolean {
  return Boolean(user.lockedUntil && user.lockedUntil > now);
}

// The state to store after one more failed attempt. A lock that has already
// expired starts the count over — otherwise the stored count stays at the
// threshold forever and every later failure looks like "already past it",
// which silently turned the lockout off after its first expiry.
export function nextFailureState(
  user: ThrottleState,
  now: Date
): { failedLoginAttempts: number; lockedUntil: Date | null; justLocked: boolean } {
  const lockExpired = Boolean(user.lockedUntil && user.lockedUntil <= now);
  const base = lockExpired ? 0 : user.failedLoginAttempts;
  const attempts = base + 1;
  const locked = attempts >= MAX_FAILED_ATTEMPTS;
  return {
    failedLoginAttempts: attempts,
    lockedUntil: locked ? new Date(now.getTime() + LOCKOUT_MINUTES * 60_000) : null,
    justLocked: attempts === MAX_FAILED_ATTEMPTS,
  };
}

// Only same-site paths are valid post-login destinations. "//evil.com" and
// "/\evil.com" both start with "/" but browsers treat them as another host.
export function safeRedirectPath(from: string | null | undefined): string {
  if (!from || !from.startsWith("/") || from.startsWith("//") || from.startsWith("/\\")) {
    return "/";
  }
  return from;
}
