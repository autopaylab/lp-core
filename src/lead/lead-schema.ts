import { EMAIL_MAX_LENGTH, EMAIL_PATTERN } from "./email-pattern";

/**
 * The lead contract shared by every Autopay landing page.
 *
 * Base fields are always present and cannot be removed or renamed by a
 * landing page; they are what the LMS expects on every form. A landing page
 * may add its own fields (company, phone, ...) through `fields`. Every extra
 * field carries its own validation and length limit, enforced by the types.
 *
 * Field names are snake_case on purpose: the same key is used in the form's
 * JSON body, in this validator and in the payload sent to the LMS, so there
 * is exactly one name per field end to end.
 */

export const BASE_FIELD_NAMES = ["email", "message", "marketing_consent", "marketing_consent_text", "locale", "source", "hp_field"] as const;

/** Reserved by the LMS protocol itself. */
const LMS_RESERVED_NAMES = ["_form"] as const;

export type FieldSpec =
  | {
      kind: "text";
      maxLength: number;
      required?: boolean;
      /** Must match the whole (trimmed) value. */
      pattern?: RegExp;
    }
  | {
      kind: "textarea";
      maxLength: number;
      required?: boolean;
    }
  | {
      kind: "checkbox";
      /** When true, only an explicit `true` passes (a consent the user must give). */
      required?: boolean;
    };

export type ExtraFields = Record<string, FieldSpec>;

export interface LeadSchema<L extends string = string, F extends ExtraFields = ExtraFields> {
  locales: readonly L[];
  defaultLocale: L;
  messageMaxLength: number;
  fields: F;
}

export interface LeadSchemaOptions<L extends string, F extends ExtraFields> {
  /** Locales the page renders; an unknown locale in the body falls back to `defaultLocale`. */
  locales: readonly L[];
  /** Defaults to the first locale. */
  defaultLocale?: L;
  /** Defaults to 1000 characters. */
  messageMaxLength?: number;
  /** Landing-page-specific fields, keyed by their snake_case name. */
  fields?: F;
}

export type FieldErrorCode = "required" | "invalid" | "tooLong";
export type FieldErrors = Record<string, FieldErrorCode>;

export type FieldValue = string | boolean;

export interface Lead<L extends string = string> {
  email: string;
  /** Empty string when the optional message was left blank. */
  message: string;
  marketing_consent: boolean;
  locale: L;
  /** Values of the landing page's extra fields, validated. */
  fields: Record<string, FieldValue>;
}

export type LeadValidation<L extends string> = { ok: true; lead: Lead<L> } | { ok: false; errors: FieldErrors };

const FIELD_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * Defines a landing page's lead schema. Throws at definition time (so at
 * module load, so at build) on a field name that is not snake_case or that
 * collides with a base field, because a silent collision would overwrite a
 * base value in the LMS payload.
 */
export function defineLeadSchema<L extends string, F extends ExtraFields = Record<never, never>>(
  options: LeadSchemaOptions<L, F>,
): LeadSchema<L, F> {
  if (options.locales.length === 0) {
    throw new Error("[lp-core] defineLeadSchema: at least one locale is required.");
  }
  const defaultLocale = options.defaultLocale ?? options.locales[0]!;
  if (!options.locales.includes(defaultLocale)) {
    throw new Error(`[lp-core] defineLeadSchema: defaultLocale ${JSON.stringify(defaultLocale)} is not in locales.`);
  }
  const fields = (options.fields ?? {}) as F;
  const reserved = new Set<string>([...BASE_FIELD_NAMES, ...LMS_RESERVED_NAMES]);
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
    messageMaxLength: options.messageMaxLength ?? 1000,
    fields,
  };
}

// Control characters (incl. CR/LF) would let a value break out of an email
// header or a log line. Matching them is the point, hence the lint exception.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
// A multi-line value may keep line breaks and tabs, nothing else.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS_EXCEPT_NEWLINES = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

const asTrimmedString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

function validateText(value: unknown, spec: Extract<FieldSpec, { kind: "text" | "textarea" }>): [string, FieldErrorCode | null] {
  const text = asTrimmedString(value);
  if (!text) return [text, spec.required ? "required" : null];
  if (text.length > spec.maxLength) return [text, "tooLong"];
  const forbidden = spec.kind === "textarea" ? CONTROL_CHARACTERS_EXCEPT_NEWLINES : CONTROL_CHARACTERS;
  if (forbidden.test(text)) return [text, "invalid"];
  if (spec.kind === "text" && spec.pattern && !spec.pattern.test(text)) return [text, "invalid"];
  return [text, null];
}

/**
 * Validates an untrusted request body against the schema. Every value is
 * checked by type first (an array where a string is expected is "required",
 * not coerced), then trimmed, then by length, then by content.
 */
export function validateLead<L extends string>(schema: LeadSchema<L>, input: unknown): LeadValidation<L> {
  const body = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const errors: FieldErrors = {};

  const [email, emailError] = validateText(body.email, { kind: "text", maxLength: EMAIL_MAX_LENGTH, required: true, pattern: EMAIL_PATTERN });
  if (emailError) errors.email = emailError;

  const [message, messageError] = validateText(body.message, { kind: "textarea", maxLength: schema.messageMaxLength });
  if (messageError) errors.message = messageError;

  const fields: Record<string, FieldValue> = {};
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

  const locale = schema.locales.includes(body.locale as L) ? (body.locale as L) : schema.defaultLocale;
  return {
    ok: true,
    lead: {
      email,
      message,
      // Only an explicit true counts as consent; "true", 1 and undefined do not.
      marketing_consent: body.marketing_consent === true,
      locale,
      fields,
    },
  };
}
