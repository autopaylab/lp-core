import { describe, expect, it, vi } from "vitest";

import { isRateLimited } from "./rate-limit";

describe("isRateLimited", () => {
  it("allows requests up to the limit and blocks the next one", () => {
    const key = "allow-then-block";
    expect(isRateLimited(key, 2, 60_000)).toBe(false);
    expect(isRateLimited(key, 2, 60_000)).toBe(false);
    expect(isRateLimited(key, 2, 60_000)).toBe(true);
  });

  it("allows requests again once the window has passed", () => {
    vi.useFakeTimers();
    try {
      const key = "window-expiry";
      isRateLimited(key, 1, 1_000);
      expect(isRateLimited(key, 1, 1_000)).toBe(true);
      vi.advanceTimersByTime(1_001);
      expect(isRateLimited(key, 1, 1_000)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("counts each key separately", () => {
    expect(isRateLimited("key-a", 1, 60_000)).toBe(false);
    expect(isRateLimited("key-b", 1, 60_000)).toBe(false);
  });
});
