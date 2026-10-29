import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLeadHandler } from "./lead-handler";
import { defineLeadSchema } from "./lead-schema";

const schema = defineLeadSchema({ locales: ["pl", "en"], fields: { company: { kind: "text", maxLength: 100 } } });
const consentText = { pl: "Zgadzam się na kontakt marketingowy.", en: "I agree to marketing contact." };
const env = { LMS_LEAD_URL: "https://lms.example/lms/lead/receive", LMS_FORM_ALIAS: "paytalk-landing" };

const lmsResponse = (body: unknown) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
let lmsFetch: ReturnType<typeof vi.fn>;
let ipCounter = 0;

const handler = (overrides: Partial<Parameters<typeof createLeadHandler<"pl" | "en">>[0]> = {}) =>
  createLeadHandler({ source: "paytalk-landing", schema, consentText, env, fetchImpl: lmsFetch as unknown as typeof fetch, ...overrides });

const post = (body: unknown, ip = `10.0.0.${++ipCounter}`, handle = handler()) =>
  handle(
    new Request("http://localhost/api/apply", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

const valid = { email: "anna@firma.pl", message: "", marketing_consent: true, locale: "en", company: "Firma", hp_field: "" };

beforeEach(() => {
  // A fresh Response per call: a body can only be read once.
  lmsFetch = vi.fn().mockImplementation(async () => lmsResponse({ status: "SUCCESS", leadId: 1 }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createLeadHandler", () => {
  it("sends a valid lead to the LMS with the consent wording of the lead's locale", async () => {
    const response = await post(valid);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(lmsFetch).toHaveBeenCalledOnce();
    const [url, init] = lmsFetch.mock.calls[0]!;
    expect(url).toBe(env.LMS_LEAD_URL);
    expect(JSON.parse(init.body)).toEqual({
      _form: "paytalk-landing",
      email: "anna@firma.pl",
      message: "",
      marketing_consent: "tak",
      marketing_consent_text: consentText.en,
      locale: "en",
      source: "paytalk-landing",
      company: "Firma",
    });
  });

  it("drops honeypot submissions silently without calling the LMS", async () => {
    const response = await post({ ...valid, hp_field: "bot" });
    expect(await response.json()).toEqual({ ok: true });
    expect(lmsFetch).not.toHaveBeenCalled();
  });

  it("returns field errors for an invalid lead without calling the LMS", async () => {
    const response = await post({ ...valid, email: "nope", company: "x".repeat(101) });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "validation", fields: { email: "invalid", company: "tooLong" } });
    expect(lmsFetch).not.toHaveBeenCalled();
  });

  it("rejects a body that isn't a JSON object", async () => {
    expect((await post("{not json")).status).toBe(400);
    expect((await post("null")).status).toBe(400);
    expect((await post("[1]")).status).toBe(400);
  });

  it("rate limits after five requests from one address by default", async () => {
    const handle = handler();
    for (let i = 0; i < 5; i++) expect((await post(valid, "10.9.9.9", handle)).status).toBe(200);
    const response = await post(valid, "10.9.9.9", handle);
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ ok: false, error: "rate_limited" });
  });

  it("honours a custom rate limit", async () => {
    const handle = handler({ rateLimit: { maxRequests: 1, windowMs: 60_000 } });
    expect((await post(valid, "10.8.8.8", handle)).status).toBe(200);
    expect((await post(valid, "10.8.8.8", handle)).status).toBe(429);
  });

  it("reports a server error when the LMS isn't configured", async () => {
    const response = await post(valid, undefined, handler({ env: { LMS_LEAD_URL: env.LMS_LEAD_URL } }));
    expect(response.status).toBe(500);
    expect(lmsFetch).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("reports a server error when the LMS rejects the lead", async () => {
    lmsFetch.mockImplementation(async () => lmsResponse({ status: "FAILURE" }));
    const response = await post(valid);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, error: "server" });
  });
});
