import { describe, expect, it } from "vitest";

import { isIndexable, isSitePublic } from "./site-config";

describe("isSitePublic", () => {
  it("is false unless SITE_IS_PUBLIC is exactly 'true'", () => {
    expect(isSitePublic({})).toBe(false);
    expect(isSitePublic({ SITE_IS_PUBLIC: "1" })).toBe(false);
    expect(isSitePublic({ SITE_IS_PUBLIC: "TRUE" })).toBe(false);
    expect(isSitePublic({ SITE_IS_PUBLIC: "true" })).toBe(true);
  });
});

describe("isIndexable", () => {
  it("is false while the site is not public", () => {
    expect(isIndexable({ VERCEL_ENV: "production" })).toBe(false);
  });

  it("is true for a public production deployment or a local start", () => {
    expect(isIndexable({ SITE_IS_PUBLIC: "true", VERCEL_ENV: "production" })).toBe(true);
    expect(isIndexable({ SITE_IS_PUBLIC: "true" })).toBe(true);
  });

  it("stays false on preview deployments even after launch", () => {
    expect(isIndexable({ SITE_IS_PUBLIC: "true", VERCEL_ENV: "preview" })).toBe(false);
  });
});
