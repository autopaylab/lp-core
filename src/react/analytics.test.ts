// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { trackCtaClick, trackEvent, trackFormStart, trackFormSubmit } from "./analytics";

afterEach(() => {
  delete window._paq;
});

describe("trackEvent", () => {
  it("sends nothing and queues nothing before Matomo has started (no consent)", () => {
    expect(() => trackEvent("CTA", "click", "hero")).not.toThrow();
    expect(window._paq).toBeUndefined();
  });

  it("pushes a Matomo event once Matomo is running", () => {
    const push = vi.fn();
    window._paq = { push };
    trackEvent("CTA", "click", "hero");
    trackEvent("Form", "start");
    expect(push.mock.calls).toEqual([[["trackEvent", "CTA", "click", "hero"]], [["trackEvent", "Form", "start"]]]);
  });
});

describe("named events", () => {
  it("map to the agreed categories, actions and names", () => {
    const push = vi.fn();
    window._paq = { push };
    trackCtaClick("programme");
    trackFormStart();
    trackFormSubmit("success");
    trackFormSubmit("rate_limited");
    expect(push.mock.calls.map(([command]) => command)).toEqual([
      ["trackEvent", "CTA", "click", "programme"],
      ["trackEvent", "Form", "start"],
      ["trackEvent", "Form", "submit_success"],
      ["trackEvent", "Form", "submit_error", "rate_limited"],
    ]);
  });
});
