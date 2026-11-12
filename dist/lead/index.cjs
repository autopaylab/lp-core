"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lead/index.ts
var lead_exports = {};
__export(lead_exports, {
  AUTOPAY_DATA_CONTROLLER_NOTICE: () => AUTOPAY_DATA_CONTROLLER_NOTICE,
  AUTOPAY_MARKETING_CONSENT: () => AUTOPAY_MARKETING_CONSENT,
  AUTOPAY_PRIVACY_POLICY_URL: () => AUTOPAY_PRIVACY_POLICY_URL,
  BASE_FIELD_NAMES: () => BASE_FIELD_NAMES,
  EMAIL_MAX_LENGTH: () => EMAIL_MAX_LENGTH,
  EMAIL_PATTERN: () => EMAIL_PATTERN,
  defineLeadSchema: () => defineLeadSchema,
  validateLead: () => validateLead
});
module.exports = __toCommonJS(lead_exports);

// src/lead/email-pattern.ts
var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var EMAIL_MAX_LENGTH = 320;

// src/lead/lead-schema.ts
var BASE_FIELD_NAMES = ["email", "message", "marketing_consent", "marketing_consent_text", "locale", "source", "hp_field"];
var LMS_RESERVED_NAMES = ["_form"];
var FIELD_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
function defineLeadSchema(options) {
  if (options.locales.length === 0) {
    throw new Error("[lp-core] defineLeadSchema: at least one locale is required.");
  }
  const defaultLocale = options.defaultLocale ?? options.locales[0];
  if (!options.locales.includes(defaultLocale)) {
    throw new Error(`[lp-core] defineLeadSchema: defaultLocale ${JSON.stringify(defaultLocale)} is not in locales.`);
  }
  const fields = options.fields ?? {};
  const reserved = /* @__PURE__ */ new Set([...BASE_FIELD_NAMES, ...LMS_RESERVED_NAMES]);
  for (const [name, spec] of Object.entries(fields)) {
    if (!FIELD_NAME_PATTERN.test(name)) {
      throw new Error(`[lp-core] defineLeadSchema: field name ${JSON.stringify(name)} must be snake_case (a-z, 0-9, _).`);
    }
    if (reserved.has(name)) {
      throw new Error(`[lp-core] defineLeadSchema: ${JSON.stringify(name)} is a base field and cannot be redefined.`);
    }
    if (spec.kind !== "checkbox" && (!Number.isInteger(spec.maxLength) || spec.maxLength <= 0)) {
      throw new Error(`[lp-core] defineLeadSchema: field ${JSON.stringify(name)} needs a positive integer maxLength.`);
    }
  }
  return {
    locales: options.locales,
    defaultLocale,
    messageMaxLength: options.messageMaxLength ?? 1e3,
    isMarketingConsentRequired: options.isMarketingConsentRequired ?? false,
    fields
  };
}
var CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
var CONTROL_CHARACTERS_EXCEPT_NEWLINES = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
var asTrimmedString = (value) => typeof value === "string" ? value.trim() : "";
function validateText(value, spec) {
  const text = asTrimmedString(value);
  if (!text) return [text, spec.required ? "required" : null];
  if (text.length > spec.maxLength) return [text, "tooLong"];
  const forbidden = spec.kind === "textarea" ? CONTROL_CHARACTERS_EXCEPT_NEWLINES : CONTROL_CHARACTERS;
  if (forbidden.test(text)) return [text, "invalid"];
  if (spec.kind === "text" && spec.pattern && !spec.pattern.test(text)) return [text, "invalid"];
  return [text, null];
}
function validateLead(schema, input) {
  const body = input && typeof input === "object" ? input : {};
  const errors = {};
  const [email, emailError] = validateText(body.email, { kind: "text", maxLength: EMAIL_MAX_LENGTH, required: true, pattern: EMAIL_PATTERN });
  if (emailError) errors.email = emailError;
  const [message, messageError] = validateText(body.message, { kind: "textarea", maxLength: schema.messageMaxLength });
  if (messageError) errors.message = messageError;
  const marketingConsent = body.marketing_consent === true;
  if (schema.isMarketingConsentRequired && !marketingConsent) errors.marketing_consent = "required";
  const fields = {};
  for (const [name, spec] of Object.entries(schema.fields)) {
    if (spec.kind === "checkbox") {
      const checked = body[name] === true;
      if (spec.required && !checked) errors[name] = "required";
      fields[name] = checked;
      continue;
    }
    const [value, error] = validateText(body[name], spec);
    if (error) errors[name] = error;
    fields[name] = value;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const locale = schema.locales.includes(body.locale) ? body.locale : schema.defaultLocale;
  return {
    ok: true,
    lead: {
      email,
      message,
      marketing_consent: marketingConsent,
      locale,
      fields
    }
  };
}

// src/lead/legal-texts.ts
var AUTOPAY_PRIVACY_POLICY_URL = {
  pl: "https://autopay.pl/storage/app/media/Autopay_pl/Dokumenty/polityka-prywatnosci.pdf",
  en: "https://autopay.eu/storage/app/media/Autopay_pl/Dokumenty/privacy_policy.pdf"
};
var AUTOPAY_MARKETING_CONSENT = {
  pl: "Wyra\u017Cam zgod\u0119 na przetwarzanie moich danych osobowych w zakresie adresu e-mail w celu marketingu bezpo\u015Bredniego przez Autopay S.A. jako Administratora danych w celu przekazywania mi informacji handlowej, w tym marketingu bezpo\u015Bredniego o produktach i us\u0142ugach oferowanych przez Autopay.",
  en: "I consent to the processing of my personal data, limited to my email address, by Autopay S.A. as the data controller for direct marketing purposes, in order to send me commercial information, including direct marketing about products and services offered by Autopay."
};
var AUTOPAY_DATA_CONTROLLER_NOTICE = {
  pl: {
    lead: "Administratorem Twoich danych osobowych jest Autopay S.A. Szczeg\xF3\u0142owe informacje dotycz\u0105ce przetwarzania danych osobowych znajduj\u0105 si\u0119 w",
    linkLabel: "Polityce prywatno\u015Bci Autopay S.A.",
    trail: ""
  },
  en: {
    lead: "The controller of your personal data is Autopay S.A. Detailed information on the processing of personal data is available in the",
    linkLabel: "Autopay S.A. Privacy Policy",
    trail: "."
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AUTOPAY_DATA_CONTROLLER_NOTICE,
  AUTOPAY_MARKETING_CONSENT,
  AUTOPAY_PRIVACY_POLICY_URL,
  BASE_FIELD_NAMES,
  EMAIL_MAX_LENGTH,
  EMAIL_PATTERN,
  defineLeadSchema,
  validateLead
});
//# sourceMappingURL=index.cjs.map