import { createHash } from "node:crypto";

export type TutorSource = { book: string; chapter: string; page: string };
export type TutorResponse = { verified: boolean; answer: string; sources: TutorSource[]; rateLimited?: boolean; cached?: boolean };

type CachedTutorResponse = { expiresAt: number; value: TutorResponse };
type TutorUsage = { count: number; resetAt: number };

export function tutorCacheKey(input: { question: string; academicYear: string; language: "bn" | "en" }) {
  const normalized = input.question.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
  return createHash("sha256").update(`${input.academicYear}\u0000${input.language}\u0000${normalized}`).digest("hex");
}

export function createTutorRequestPolicy(options: { cacheTtlMs?: number; windowMs?: number; maxRequests?: number } = {}) {
  const cacheTtlMs = options.cacheTtlMs ?? 86_400_000;
  const windowMs = options.windowMs ?? 3_600_000;
  const maxRequests = options.maxRequests ?? 10;
  const cache = new Map<string, CachedTutorResponse>();
  const usage = new Map<number, TutorUsage>();

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

  function get(key: string, now = Date.now()) {
    const entry = cache.get(key);
    if (!entry || entry.expiresAt <= now) {
      if (entry) cache.delete(key);
      return undefined;
    }
    return { ...entry.value, sources: entry.value.sources.map(source => ({ ...source })), cached: true };
  }

  function set(key: string, value: TutorResponse, now = Date.now()) {
    cache.set(key, { expiresAt: now + cacheTtlMs, value: { ...value, sources: value.sources.map(source => ({ ...source })) } });
  }

  return { consume, get, set };
}

export const tutorRequestPolicy = createTutorRequestPolicy();
