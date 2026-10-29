// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { openCookieSettings } from "./cookie-settings";

afterEach(() => {
  delete window.__cmp;
  vi.restoreAllMocks();
});

describe("openCookieSettings", () => {
  it("asks ConsentManager to show its screen when loaded", () => {
    const cmp = vi.fn();
    window.__cmp = cmp;
    openCookieSettings();
    expect(cmp).toHaveBeenCalledWith("showScreen");
  });

  it("warns instead of throwing when ConsentManager has not loaded", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => openCookieSettings()).not.toThrow();
    expect(warn).toHaveBeenCalledOnce();
  });
});
