export type SlidingWindowLimiterOptions = {
  windowMs: number;
  maxEvents: number;
};

function normalizeOptions(options: SlidingWindowLimiterOptions): SlidingWindowLimiterOptions {
  const windowMs = Number.isFinite(options.windowMs) && options.windowMs > 0 ? Math.floor(options.windowMs) : 10000;
  const maxEvents =
    Number.isFinite(options.maxEvents) && options.maxEvents > 0 ? Math.floor(options.maxEvents) : 10;
  return { windowMs, maxEvents };
}

export function createSlidingWindowRateLimiter(rawOptions: SlidingWindowLimiterOptions) {
  const options = normalizeOptions(rawOptions);
  const eventsByKey = new Map<string, number[]>();

  function allow(key: string, now = Date.now()): boolean {
    const bucket = eventsByKey.get(key) ?? [];
    const cutoff = now - options.windowMs;
    const activeEvents = bucket.filter((timestamp) => timestamp > cutoff);

    if (activeEvents.length >= options.maxEvents) {
      eventsByKey.set(key, activeEvents);
      return false;
    }

    activeEvents.push(now);
    eventsByKey.set(key, activeEvents);
    return true;
  }

  function reset(key: string): void {
    eventsByKey.delete(key);
  }

  function pruneIdle(now = Date.now()): void {
    const cutoff = now - options.windowMs;
    for (const [key, bucket] of eventsByKey) {
      const activeEvents = bucket.filter((timestamp) => timestamp > cutoff);
      if (activeEvents.length === 0) {
        eventsByKey.delete(key);
        continue;
      }
      eventsByKey.set(key, activeEvents);
    }
  }

  function size(): number {
    return eventsByKey.size;
  }

  return {
    allow,
    reset,
    pruneIdle,
    size
  };
}

