import { describe, expect, it } from "vitest";

import { createRobots } from "./robots";

describe("createRobots", () => {
  it("disallows everything while the site is not public or on a preview", () => {
    expect(createRobots({ siteUrl: "https://paytalk.pl", env: {} })).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    expect(createRobots({ siteUrl: "https://paytalk.pl", env: { SITE_IS_PUBLIC: "true", VERCEL_ENV: "preview" } })).toEqual({
      rules: { userAgent: "*", disallow: "/" },
    });
  });

  it("allows crawling except the API once public, linking the sitemap", () => {
    expect(createRobots({ siteUrl: "https://paytalk.pl/", env: { SITE_IS_PUBLIC: "true", VERCEL_ENV: "production" } })).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: "/api/" },
      sitemap: "https://paytalk.pl/sitemap.xml",
    });
  });
});
