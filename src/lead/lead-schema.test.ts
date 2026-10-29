import { describe, expect, it } from "vitest";

import { defineLeadSchema, validateLead } from "./lead-schema";

const schema = defineLeadSchema({ locales: ["pl", "en"] });

describe("defineLeadSchema", () => {
  it("defaults to the first locale and a 1000-character message", () => {
    expect(schema).toMatchObject({ defaultLocale: "pl", messageMaxLength: 1000, fields: {} });
  });

  it("rejects a base field name, a reserved LMS name, or a non-snake_case name at definition time", () => {
    expect(() => defineLeadSchema({ locales: ["pl"], fields: { email: { kind: "text", maxLength: 10 } } })).toThrow(/base field/);
    expect(() => defineLeadSchema({ locales: ["pl"], fields: { _form: { kind: "text", maxLength: 10 } } })).toThrow(/_form/);
    expect(() => defineLeadSchema({ locales: ["pl"], fields: { companyName: { kind: "text", maxLength: 10 } } })).toThrow(/snake_case/);
    expect(() => defineLeadSchema({ locales: ["pl"], fields: { company: { kind: "text", maxLength: 0 } } })).toThrow(/maxLength/);
  });

  it("rejects an empty locale list or a default outside it", () => {
    expect(() => defineLeadSchema({ locales: [] })).toThrow(/locale/);
    expect(() => defineLeadSchema({ locales: ["pl"], defaultLocale: "en" as "pl" })).toThrow(/defaultLocale/);
  });
});

describe("validateLead: base fields", () => {
  it("accepts a work email and trims it", () => {
    expect(validateLead(schema, { email: "  anna@firma.pl  ", locale: "en" })).toEqual({
      ok: true,
      lead: { email: "anna@firma.pl", message: "", marketing_consent: false, locale: "en", fields: {} },
    });
  });

  it("accepts an optional message, trimmed, keeping line breaks", () => {
    const result = validateLead(schema, { email: "anna@firma.pl", message: "  Linia 1\nLinia 2  " });
    expect(result.ok && result.lead.message).toBe("Linia 1\nLinia 2");
  });

  it("rejects an over-long message or one with control characters", () => {
    expect(validateLead(schema, { email: "anna@firma.pl", message: "m".repeat(1001) })).toEqual({ ok: false, errors: { message: "tooLong" } });
    expect(validateLead(schema, { email: "anna@firma.pl", message: "a\u0007b" })).toEqual({ ok: false, errors: { message: "invalid" } });
  });

  it("reports email and message errors together", () => {
    expect(validateLead(schema, { message: "m".repeat(1001) })).toEqual({ ok: false, errors: { email: "required", message: "tooLong" } });
  });

  it("requires the email", () => {
    expect(validateLead(schema, {})).toEqual({ ok: false, errors: { email: "required" } });
    expect(validateLead(schema, { email: "   " })).toEqual({ ok: false, errors: { email: "required" } });
    expect(validateLead(schema, null)).toEqual({ ok: false, errors: { email: "required" } });
  });

  it("rejects an invalid or over-long email", () => {
    expect(validateLead(schema, { email: "anna@" })).toEqual({ ok: false, errors: { email: "invalid" } });
    expect(validateLead(schema, { email: `${"a".repeat(320)}@firma.pl` })).toEqual({ ok: false, errors: { email: "tooLong" } });
  });

  it("rejects line breaks, which could break an email header or a log line", () => {
    expect(validateLead(schema, { email: "anna@firma.pl\r\nBcc: x@y.z" })).toEqual({ ok: false, errors: { email: "invalid" } });
  });

  it("rejects non-string values instead of coercing them", () => {
    expect(validateLead(schema, { email: ["anna@firma.pl"] })).toEqual({ ok: false, errors: { email: "required" } });
  });

  it("counts only an explicit true as marketing consent", () => {
    const consent = (value: unknown) => {
      const result = validateLead(schema, { email: "anna@firma.pl", marketing_consent: value });
      return result.ok && result.lead.marketing_consent;
    };
    expect(consent(true)).toBe(true);
    expect(consent("true")).toBe(false);
    expect(consent(1)).toBe(false);
    expect(consent(undefined)).toBe(false);
  });

  it("falls back to the default locale for an unknown one", () => {
    const result = validateLead(schema, { email: "anna@firma.pl", locale: "de" });
    expect(result.ok && result.lead.locale).toBe("pl");
  });
});

describe("validateLead: extra fields", () => {
  const withExtras = defineLeadSchema({
    locales: ["pl"],
    fields: {
      company: { kind: "text", maxLength: 100, required: true },
      phone: { kind: "text", maxLength: 20, pattern: /^\+?[0-9 ]+$/ },
      needs: { kind: "textarea", maxLength: 50 },
      terms_accepted: { kind: "checkbox", required: true },
    },
  });
  const valid = { email: "anna@firma.pl", company: " Firma ", phone: "+48 600 000 000", needs: "a\nb", terms_accepted: true };

  it("validates, trims and returns every extra field", () => {
    expect(validateLead(withExtras, valid)).toEqual({
      ok: true,
      lead: {
        email: "anna@firma.pl",
        message: "",
        marketing_consent: false,
        locale: "pl",
        fields: { company: "Firma", phone: "+48 600 000 000", needs: "a\nb", terms_accepted: true },
      },
    });
  });

  it("applies required, maxLength, pattern and control-character rules per field", () => {
    expect(validateLead(withExtras, { ...valid, company: "" })).toEqual({ ok: false, errors: { company: "required" } });
    expect(validateLead(withExtras, { ...valid, company: "x".repeat(101) })).toEqual({ ok: false, errors: { company: "tooLong" } });
    expect(validateLead(withExtras, { ...valid, phone: "call me" })).toEqual({ ok: false, errors: { phone: "invalid" } });
    expect(validateLead(withExtras, { ...valid, company: "a\nb" })).toEqual({ ok: false, errors: { company: "invalid" } });
    expect(validateLead(withExtras, { ...valid, terms_accepted: "yes" })).toEqual({ ok: false, errors: { terms_accepted: "required" } });
  });

  it("ignores unknown keys in the body", () => {
    const result = validateLead(withExtras, { ...valid, admin: true });
    expect(result.ok && Object.keys(result.lead.fields)).toEqual(["company", "phone", "needs", "terms_accepted"]);
  });
});
