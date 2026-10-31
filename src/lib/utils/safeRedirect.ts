/**
 * Only allow redirects to paths on this site. Blocks "//evil.com",
 * "https://evil.com" and "/\evil.com", which browsers treat as other sites.
 */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.startsWith("/login") || next.startsWith("/forgot-password") || next.startsWith("/reset-password")) return fallback;
  return next;
}

/** Plain-language versions of Supabase sign-in errors. */
export function explainAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Check them, or reset your password.";
  if (m.includes("email not confirmed")) return "Confirm your email first. Tap the link we sent when you signed up.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Wait a minute, then try again.";
  if (m.includes("same password") || m.includes("should be different")) return "Choose a password you haven't used before.";
  if (m.includes("fetch") || m.includes("network")) return "Can't reach Skilled9ja. Check your data connection and try again.";
  return message;
}
