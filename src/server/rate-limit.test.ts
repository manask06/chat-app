import test from "node:test";
import assert from "node:assert/strict";
import { createSlidingWindowRateLimiter } from "./rate-limit";

test("rate limiter allows up to max events in window", () => {
  const limiter = createSlidingWindowRateLimiter({ windowMs: 1000, maxEvents: 2 });

  assert.equal(limiter.allow("u1", 100), true);
  assert.equal(limiter.allow("u1", 500), true);
  assert.equal(limiter.allow("u1", 700), false);
});

test("rate limiter allows events after window expires", () => {
  const limiter = createSlidingWindowRateLimiter({ windowMs: 1000, maxEvents: 2 });

  assert.equal(limiter.allow("u1", 100), true);
  assert.equal(limiter.allow("u1", 200), true);
  assert.equal(limiter.allow("u1", 1301), true);
});

test("rate limiter reset clears key bucket", () => {
  const limiter = createSlidingWindowRateLimiter({ windowMs: 1000, maxEvents: 1 });

  assert.equal(limiter.allow("u1", 100), true);
  assert.equal(limiter.allow("u1", 200), false);
  limiter.reset("u1");
  assert.equal(limiter.allow("u1", 300), true);
});

test("rate limiter pruneIdle removes expired buckets", () => {
  const limiter = createSlidingWindowRateLimiter({ windowMs: 1000, maxEvents: 2 });

  limiter.allow("u1", 100);
  limiter.allow("u2", 500);
  assert.equal(limiter.size(), 2);

  limiter.pruneIdle(2001);
  assert.equal(limiter.size(), 0);
});

