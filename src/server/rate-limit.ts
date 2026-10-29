/**
 * Best-effort, in-memory sliding-window rate limiter. Deliberately simple,
 * and deliberately not a real defense on its own: each Vercel Function
 * instance has its own memory, so this only throttles a single warm
 * instance, not an attacker spread across many cold starts or IPs. It's a
 * backstop against a single script hammering the endpoint, not a
 * replacement for a platform-level control. Pair it with a Vercel Firewall
 * rate-limit rule on the form endpoint for real protection (configured in
 * the Vercel dashboard; see the go-live checklist in lp-foundation).
 */
const hits = new Map<string, number[]>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  hits.set(key, timestamps);

  // Bound total memory: forget keys once they're well outside the window.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }

  return timestamps.length > limit;
}
