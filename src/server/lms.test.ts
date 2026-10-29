import { afterEach, describe, expect, it, vi } from "vitest";

import type { Lead } from "../lead/lead-schema";
import { buildLeadPayload, readLmsConfig, sendLeadToLms } from "./lms";

const lead: Lead = { email: "anna@firma.pl", message: "Bilety\nna wystawy", marketing_consent: true, locale: "en", fields: {} };
const options = { formAlias: "paytalk-landing", source: "paytalk-landing", consentText: "I agree to marketing contact." };
const config = { leadUrl: "https://lms.example/lms/lead/receive", formAlias: "paytalk-landing" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readLmsConfig", () => {
  it("needs both the lead URL and the form alias", () => {
    expect(readLmsConfig({})).toBeNull();
    expect(readLmsConfig({ LMS_LEAD_URL: config.leadUrl })).toBeNull();
    expect(readLmsConfig({ LMS_LEAD_URL: config.leadUrl, LMS_FORM_ALIAS: "a" })).toEqual({ leadUrl: config.leadUrl, formAlias: "a" });
  });
});

describe("buildLeadPayload", () => {
  it("sends the form alias and stable, flat base fields with the consent wording the applicant saw", () => {
    expect(buildLeadPayload(lead, options)).toEqual({
      _form: "paytalk-landing",
      email: "anna@firma.pl",
      message: "Bilety\nna wystawy",
      marketing_consent: "tak",
      marketing_consent_text: "I agree to marketing contact.",
      locale: "en",
      source: "paytalk-landing",
    });
  });

  it("records a missing consent without consent text", () => {
    expect(buildLeadPayload({ ...lead, marketing_consent: false }, options)).toMatchObject({
      marketing_consent: "nie",
      marketing_consent_text: "",
    });
  });

  it("appends extra fields after the base ones, booleans as tak/nie", () => {
    const payload = buildLeadPayload({ ...lead, fields: { company: "Firma", terms_accepted: true } }, options);
    expect(payload).toMatchObject({ company: "Firma", terms_accepted: "tak" });
    expect(Object.keys(payload).slice(0, 7)).toEqual(["_form", "email", "message", "marketing_consent", "marketing_consent_text", "locale", "source"]);
  });
});

describe("sendLeadToLms", () => {
  const payload = buildLeadPayload(lead, options);

  it("POSTs JSON to the lead URL and succeeds on status SUCCESS", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ status: "SUCCESS", errors: [], warnings: [], formId: 1, leadId: 42 }));
    await expect(sendLeadToLms(payload, config, fetchMock)).resolves.toEqual({ ok: true, leadId: 42 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(config.leadUrl);
    expect(init).toMatchObject({ method: "POST", headers: { "Content-Type": "application/json" } });
    expect(JSON.parse(init.body)._form).toBe("paytalk-landing");
  });

  it("trusts the body, not the HTTP status: FAILURE with HTTP 200 is a failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(json({ status: "FAILURE", errors: [] }, 200));
    await expect(sendLeadToLms(payload, config, fetchMock)).resolves.toEqual({ ok: false, reason: "rejected" });
  });

  it("trusts the body, not the HTTP status: SUCCESS with HTTP 400 is a success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ status: "SUCCESS", leadId: 7 }, 400));
    await expect(sendLeadToLms(payload, config, fetchMock)).resolves.toEqual({ ok: true, leadId: 7 });
  });

  it("fails on a non-JSON response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(new Response("<html>redirect</html>", { status: 302 }));
    await expect(sendLeadToLms(payload, config, fetchMock)).resolves.toEqual({ ok: false, reason: "bad_response" });
  });

  it("fails on a network error and on a timeout", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendLeadToLms(payload, config, vi.fn().mockRejectedValue(new TypeError("fetch failed")))).resolves.toEqual({
      ok: false,
      reason: "network",
    });
    await expect(sendLeadToLms(payload, config, vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")))).resolves.toEqual({
      ok: false,
      reason: "timeout",
    });
  });
});
