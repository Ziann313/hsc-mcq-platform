type ImageSolverUsage = { count: number; resetAt: number };

export function createImageSolverRequestPolicy(options: { windowMs?: number; maxRequests?: number } = {}) {
  const windowMs = options.windowMs ?? 3_600_000;
  const maxRequests = options.maxRequests ?? 2;
  const usage = new Map<number, ImageSolverUsage>();

  function consume(userId: number, now = Date.now()) {
    const current = usage.get(userId);
    if (!current || now >= current.resetAt) {
      usage.set(userId, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
    }
    if (current.count >= maxRequests) return { allowed: false, remaining: 0, resetAt: current.resetAt };
    current.count += 1;
    usage.set(userId, current);
    return { allowed: true, remaining: maxRequests - current.count, resetAt: current.resetAt };
  }

  return { consume };
}

export const imageSolverRequestPolicy = createImageSolverRequestPolicy();
