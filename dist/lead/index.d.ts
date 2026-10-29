/** Deliberately loose: one "@", no whitespace, a dot in the domain. The LMS and the follow-up email are the real check. */
declare const EMAIL_PATTERN: RegExp;
/** RFC 5321 maximum mailbox length. */
declare const EMAIL_MAX_LENGTH = 320;

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
declare const BASE_FIELD_NAMES: readonly ["email", "message", "marketing_consent", "marketing_consent_text", "locale", "source", "hp_field"];
type FieldSpec = {
    kind: "text";
    maxLength: number;
    required?: boolean;
    /** Must match the whole (trimmed) value. */
    pattern?: RegExp;
} | {
    kind: "textarea";
    maxLength: number;
    required?: boolean;
} | {
    kind: "checkbox";
    /** When true, only an explicit `true` passes (a consent the user must give). */
    required?: boolean;
};
type ExtraFields = Record<string, FieldSpec>;
interface LeadSchema<L extends string = string, F extends ExtraFields = ExtraFields> {
    locales: readonly L[];
    defaultLocale: L;
    messageMaxLength: number;
    fields: F;
}
interface LeadSchemaOptions<L extends string, F extends ExtraFields> {
    /** Locales the page renders; an unknown locale in the body falls back to `defaultLocale`. */
    locales: readonly L[];
    /** Defaults to the first locale. */
    defaultLocale?: L;
    /** Defaults to 1000 characters. */
    messageMaxLength?: number;
    /** Landing-page-specific fields, keyed by their snake_case name. */
    fields?: F;
}
type FieldErrorCode = "required" | "invalid" | "tooLong";
type FieldErrors = Record<string, FieldErrorCode>;
type FieldValue = string | boolean;
interface Lead<L extends string = string> {
    email: string;
    /** Empty string when the optional message was left blank. */
    message: string;
    marketing_consent: boolean;
    locale: L;
    /** Values of the landing page's extra fields, validated. */
    fields: Record<string, FieldValue>;
}
type LeadValidation<L extends string> = {
    ok: true;
    lead: Lead<L>;
} | {
    ok: false;
    errors: FieldErrors;
};
/**
 * Defines a landing page's lead schema. Throws at definition time (so at
 * module load, so at build) on a field name that is not snake_case or that
 * collides with a base field, because a silent collision would overwrite a
 * base value in the LMS payload.
 */
declare function defineLeadSchema<L extends string, F extends ExtraFields = Record<never, never>>(options: LeadSchemaOptions<L, F>): LeadSchema<L, F>;
/**
 * Validates an untrusted request body against the schema. Every value is
 * checked by type first (an array where a string is expected is "required",
 * not coerced), then trimmed, then by length, then by content.
 */
declare function validateLead<L extends string>(schema: LeadSchema<L>, input: unknown): LeadValidation<L>;

export { BASE_FIELD_NAMES, EMAIL_MAX_LENGTH, EMAIL_PATTERN, type ExtraFields, type FieldErrorCode, type FieldErrors, type FieldSpec, type FieldValue, type Lead, type LeadSchema, type LeadSchemaOptions, type LeadValidation, defineLeadSchema, validateLead };
