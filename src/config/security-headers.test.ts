import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy, createSecurityHeaders, readThirdPartyOrigins } from "./security-headers";

const header = (headers: { key: string; value: string }[], key: string) => headers.find((h) => h.key === key)?.value;

describe("readThirdPartyOrigins", () => {
  it("uses the Autopay defaults when nothing is set", () => {
    expect(readThirdPartyOrigins({})).toEqual({
      consentManagerDelivery: "https://c.delivery.consentmanager.net",
      consentManagerCdn: "https://cdn.consentmanager.net",
      matomoOrigin: "https://piwik.blue.pl",
    });
  });

  it("fails loudly on a malformed origin instead of producing a broken CSP", () => {
    expect(() => readThirdPartyOrigins({ NEXT_PUBLIC_MATOMO_ORIGIN: "piwik.blue.pl" })).toThrow(/NEXT_PUBLIC_MATOMO_ORIGIN/);
    expect(() => readThirdPartyOrigins({ NEXT_PUBLIC_MATOMO_ORIGIN: "https://piwik.blue.pl/matomo/" })).toThrow(/NEXT_PUBLIC_MATOMO_ORIGIN/);
    expect(() => readThirdPartyOrigins({ NEXT_PUBLIC_CMP_HOST: "https://c.delivery.consentmanager.net" })).toThrow(/NEXT_PUBLIC_CMP_HOST/);
  });
});

describe("buildContentSecurityPolicy", () => {
  it("allows only self, ConsentManager and Matomo as script and connect sources", () => {
    const csp = buildContentSecurityPolicy({});
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain(
      "script-src 'self' 'unsafe-inline' https://cdn.consentmanager.net https://c.delivery.consentmanager.net https://piwik.blue.pl",
    );
    expect(csp).toContain("font-src 'self' data:");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("\n");
  });

  it("is byte-identical to the pre-GA policy when Google Analytics is not configured", () => {
    const withoutGa =
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://cdn.consentmanager.net https://c.delivery.consentmanager.net https://piwik.blue.pl; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://cdn.consentmanager.net https://c.delivery.consentmanager.net https://piwik.blue.pl; " +
      "frame-src 'self' https://cdn.consentmanager.net; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-ancestors 'self'";
    expect(buildContentSecurityPolicy({})).toBe(withoutGa);
    // Half-configured GA renders nothing, so it must not widen the policy either.
    expect(buildContentSecurityPolicy({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-KHZLVW1KH1" })).toBe(withoutGa);
    expect(buildContentSecurityPolicy({ NEXT_PUBLIC_GA_CMP_VENDOR_ID: "s26" })).toBe(withoutGa);
  });

  it("allows gtag.js and the GA4 collection hosts when Google Analytics is configured", () => {
    const csp = buildContentSecurityPolicy({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-KHZLVW1KH1", NEXT_PUBLIC_GA_CMP_VENDOR_ID: "s26" });
    const directive = (name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `));
    expect(directive("script-src")).toBe(
      "script-src 'self' 'unsafe-inline' https://cdn.consentmanager.net https://c.delivery.consentmanager.net https://piwik.blue.pl https://www.googletagmanager.com",
    );
    expect(directive("connect-src")).toBe(
      "connect-src 'self' https://cdn.consentmanager.net https://c.delivery.consentmanager.net https://piwik.blue.pl " +
        "https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
    );
    expect(directive("img-src")).toBe("img-src 'self' data: https:");
    expect(directive("frame-src")).toBe("frame-src 'self' https://cdn.consentmanager.net");
  });

  it("fails the build on a malformed GA measurement id", () => {
    expect(() => buildContentSecurityPolicy({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "KHZLVW1KH1", NEXT_PUBLIC_GA_CMP_VENDOR_ID: "s26" })).toThrow(
      /NEXT_PUBLIC_GA_MEASUREMENT_ID/,
    );
  });

  it("reflects a custom Matomo origin", () => {
    expect(buildContentSecurityPolicy({ NEXT_PUBLIC_MATOMO_ORIGIN: "https://stats.example.com" })).toContain("https://stats.example.com");
  });
});

describe("createSecurityHeaders", () => {
  it("includes every hardening header", () => {
    const headers = createSecurityHeaders({ env: {} });
    expect(header(headers, "Content-Security-Policy")).toBeDefined();
    expect(header(headers, "X-Frame-Options")).toBe("SAMEORIGIN");
    expect(header(headers, "X-Content-Type-Options")).toBe("nosniff");
    expect(header(headers, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header(headers, "Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
    expect(header(headers, "Strict-Transport-Security")).toBe("max-age=63072000; includeSubDomains; preload");
    expect(header(headers, "Cross-Origin-Opener-Policy")).toBe("same-origin");
  });

  it("marks the site noindex until it is public, and on previews forever", () => {
    expect(header(createSecurityHeaders({ env: {} }), "X-Robots-Tag")).toBe("noindex, nofollow");
    expect(header(createSecurityHeaders({ env: { SITE_IS_PUBLIC: "true", VERCEL_ENV: "preview" } }), "X-Robots-Tag")).toBe("noindex, nofollow");
    expect(header(createSecurityHeaders({ env: { SITE_IS_PUBLIC: "true", VERCEL_ENV: "production" } }), "X-Robots-Tag")).toBeUndefined();
  });

  it("sends the origin-trial token only when given", () => {
    expect(header(createSecurityHeaders({ env: {} }), "Origin-Trial")).toBeUndefined();
    expect(header(createSecurityHeaders({ env: {}, originTrialToken: "abc" }), "Origin-Trial")).toBe("abc");
  });
});
