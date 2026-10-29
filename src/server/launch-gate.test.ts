import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createLaunchGate } from "./launch-gate";

const request = (authorization?: string) => new NextRequest("http://localhost/", { headers: authorization ? { authorization } : {} });
const basic = (value: string) => `Basic ${Buffer.from(value).toString("base64")}`;
const credentials = { BASIC_AUTH_USER: "team", BASIC_AUTH_PASSWORD: "pw" };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createLaunchGate", () => {
  it("lets every request through once the site is public", () => {
    const { proxy } = createLaunchGate({ env: { SITE_IS_PUBLIC: "true" } });
    expect(proxy(request()).headers.get("x-middleware-next")).toBe("1");
  });

  it("asks for credentials when none are sent, naming the realm", () => {
    const { proxy } = createLaunchGate({ realm: "PayTalk", env: credentials });
    const response = proxy(request());
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe('Basic realm="PayTalk", charset="UTF-8"');
  });

  it("rejects wrong credentials and accepts correct ones", () => {
    const { proxy } = createLaunchGate({ env: credentials });
    expect(proxy(request(basic("team:nope"))).status).toBe(401);
    expect(proxy(request(basic("team:pw"))).headers.get("x-middleware-next")).toBe("1");
  });

  it("fails closed with 503 when the site is not public and credentials are not configured", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { proxy } = createLaunchGate({ env: {} });
    expect(proxy(request(basic("team:pw"))).status).toBe(503);
    expect(console.error).toHaveBeenCalled();
  });

  it("keeps security.txt reachable", () => {
    const { config } = createLaunchGate();
    const matcher = new RegExp(`^${config.matcher[0]!.replace("(.*)", "(.*)")}$`);
    expect(matcher.test("/.well-known/security.txt")).toBe(false);
    expect(matcher.test("/")).toBe(true);
    expect(matcher.test("/api/apply")).toBe(true);
  });
});
