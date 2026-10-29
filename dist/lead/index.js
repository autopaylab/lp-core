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
      // Only an explicit true counts as consent; "true", 1 and undefined do not.
      marketing_consent: body.marketing_consent === true,
      locale,
      fields
    }
  };
}
export {
  BASE_FIELD_NAMES,
  EMAIL_MAX_LENGTH,
  EMAIL_PATTERN,
  defineLeadSchema,
  validateLead
};
//# sourceMappingURL=index.js.map