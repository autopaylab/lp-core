import { describe, expect, it } from "vitest";

import { isAuthorized, readBasicAuthCredentials } from "./basic-auth";

const expected = { user: "team", password: "s3cret:with-colon" };
const header = (value: string) => `Basic ${Buffer.from(value, "utf8").toString("base64")}`;

describe("isAuthorized", () => {
  it("accepts the exact credentials, including a password containing a colon", () => {
    expect(isAuthorized(header("team:s3cret:with-colon"), expected)).toBe(true);
  });

  it("rejects a wrong user or a wrong password", () => {
    expect(isAuthorized(header("other:s3cret:with-colon"), expected)).toBe(false);
    expect(isAuthorized(header("team:wrong"), expected)).toBe(false);
  });

  it("rejects a missing, non-Basic or malformed header", () => {
    expect(isAuthorized(null, expected)).toBe(false);
    expect(isAuthorized("Bearer abc", expected)).toBe(false);
    expect(isAuthorized(header("no-separator"), expected)).toBe(false);
  });
});

describe("readBasicAuthCredentials", () => {
  it("returns null when either value is missing or empty", () => {
    expect(readBasicAuthCredentials({})).toBeNull();
    expect(readBasicAuthCredentials({ BASIC_AUTH_USER: "team" })).toBeNull();
    expect(readBasicAuthCredentials({ BASIC_AUTH_USER: "team", BASIC_AUTH_PASSWORD: "" })).toBeNull();
  });

  it("returns both values when set", () => {
    expect(readBasicAuthCredentials({ BASIC_AUTH_USER: "team", BASIC_AUTH_PASSWORD: "pw" })).toEqual({ user: "team", password: "pw" });
  });
});
