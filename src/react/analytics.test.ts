// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { trackCtaClick, trackEvent, trackFormStart, trackFormSubmit } from "./analytics";
import { GA_CONSENT_GRANTED_FLAG } from "./google-analytics-script";

afterEach(() => {
  delete window._paq;
  delete window.gtag;
  delete window[GA_CONSENT_GRANTED_FLAG];
});

const fireAllNamedEvents = () => {
  trackCtaClick("programme");
  trackFormStart();
  trackFormSubmit("success");
  trackFormSubmit("rate_limited");
};

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

describe("GA4 events", () => {
  it("map to cta_click, application_start, generate_lead and application_error once consent is granted", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    window[GA_CONSENT_GRANTED_FLAG] = true;
    fireAllNamedEvents();
    expect(gtag.mock.calls).toEqual([
      ["event", "cta_click", { placement: "programme" }],
      ["event", "application_start"],
      ["event", "generate_lead"],
      ["event", "application_error", { reason: "rate_limited" }],
    ]);
  });

  it("sends nothing and queues nothing before consent, even though gtag already exists for Consent Mode", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    window[GA_CONSENT_GRANTED_FLAG] = false;
    fireAllNamedEvents();
    delete window[GA_CONSENT_GRANTED_FLAG];
    fireAllNamedEvents();
    expect(gtag).not.toHaveBeenCalled();
  });

  it("does not throw without gtag, and keeps sending Matomo events alongside GA4", () => {
    window[GA_CONSENT_GRANTED_FLAG] = true;
    expect(() => fireAllNamedEvents()).not.toThrow();
    const push = vi.fn();
    const gtag = vi.fn();
    window._paq = { push };
    window.gtag = gtag;
    trackCtaClick("hero");
    expect(push.mock.calls).toEqual([[["trackEvent", "CTA", "click", "hero"]]]);
    expect(gtag.mock.calls).toEqual([["event", "cta_click", { placement: "hero" }]]);
  });

  it("leaves the generic trackEvent Matomo-only", () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    window[GA_CONSENT_GRANTED_FLAG] = true;
    trackEvent("CTA", "click", "hero");
    expect(gtag).not.toHaveBeenCalled();
  });
});
