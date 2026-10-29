import { E as EnvVars } from '../site-config-CegvYjda.cjs';
export { i as isIndexable, a as isSitePublic } from '../site-config-CegvYjda.cjs';
import { NextRequest, NextResponse } from 'next/server';
import { MetadataRoute } from 'next';

interface BasicAuthCredentials {
    user: string;
    password: string;
}
/** Reads the expected credentials from env; null when either is missing or empty. */
declare function readBasicAuthCredentials(env?: EnvVars): BasicAuthCredentials | null;
/** True when an `Authorization: Basic ...` header carries exactly the expected credentials. */
declare function isAuthorized(authorizationHeader: string | null, expected: BasicAuthCredentials): boolean;

/** Deliberately loose: one "@", no whitespace, a dot in the domain. The LMS and the follow-up email are the real check. */
declare const EMAIL_PATTERN: RegExp;
/** RFC 5321 maximum mailbox length. */
declare const EMAIL_MAX_LENGTH = 320;

interface LaunchGateOptions {
    /** Shown in the browser's password prompt. Defaults to "Autopay". */
    realm?: string;
    /** Defaults to process.env, read per request. */
    env?: EnvVars;
}
interface LaunchGate {
    proxy: (request: NextRequest) => NextResponse;
    config: {
        matcher: string[];
    };
}
/**
 * Optional pre-launch password gate for `src/proxy.ts`:
 *
 *   export const { proxy, config } = createLaunchGate({ realm: "PayTalk" });
 *
 * Until SITE_IS_PUBLIC is exactly "true", every route except security.txt
 * requires Basic Auth. Fails closed: a non-public deployment without
 * credentials configured answers 503 to everything rather than opening up.
 *
 * Security headers (CSP, HSTS, ...) are not set here: next.config.ts
 * `headers()` runs before Proxy for every route (Next 16, "Execution order"),
 * so the 401/503 responses carry the same headers as every page.
 */
declare function createLaunchGate(options?: LaunchGateOptions): LaunchGate;

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

interface LeadHandlerOptions<L extends string> {
    /** Identifies the landing page in every lead, e.g. "paytalk-landing". */
    source: string;
    schema: LeadSchema<L>;
    /** The marketing-consent wording shown to the applicant, per locale. Stored with the lead. */
    consentText: Record<L, string>;
    /** Defaults: 5 requests per 10 minutes per client address. */
    rateLimit?: {
        maxRequests?: number;
        windowMs?: number;
    };
    /** Defaults to process.env, read per request so a fixed variable takes effect without a cold start. */
    env?: EnvVars;
    /** Defaults to global fetch. Tests inject a mock. */
    fetchImpl?: typeof fetch;
}
/** Error codes returned to the form, which maps them to localized messages. */
type LeadHandlerError = "rate_limited" | "invalid_json" | "validation" | "server";
/**
 * A hardened `POST` route handler for a landing page's lead form:
 *
 *   export const POST = createLeadHandler({ source, schema, consentText });
 *
 * Order is fixed and is the point: rate limit, JSON parse, honeypot drop,
 * server-side validation of every field, then delivery to the LMS. Nothing
 * reaches the LMS that was not validated here, whatever the browser sent.
 */
declare function createLeadHandler<L extends string>(options: LeadHandlerOptions<L>): (request: Request) => Promise<Response>;

/**
 * Delivery of a validated lead to the LMS (`POST https://[domain]/lms/lead/receive`,
 * JSON body with the form alias in `_form`; see the LMS "Wysyłanie leadów" guide).
 *
 * Called from the server (createLeadHandler), never from the browser, so the
 * rate limit, honeypot and validation run first and the CSP needs no new origin.
 *
 * Success is decided only by `status === "SUCCESS"` in the JSON body: the guide
 * says the LMS's HTTP status codes (200/400/405/500) are currently unreliable.
 *
 * Field names are part of the contract: in "learn" mode the LMS records which
 * fields a form accepts, and in "restrict" mode it drops anything else.
 * Changing or adding a key means re-learning the form in the LMS panel.
 */
interface LmsConfig {
    /** Full lead endpoint, e.g. https://[domain]/lms/lead/receive */
    leadUrl: string;
    /** Form alias from the LMS panel, one per landing page. */
    formAlias: string;
}
type LmsResult = {
    ok: true;
    leadId?: number;
} | {
    ok: false;
    reason: "rejected" | "bad_response" | "network" | "timeout";
};
type LeadPayload = Record<string, string>;
declare function readLmsConfig(env?: EnvVars): LmsConfig | null;
interface LeadPayloadOptions {
    formAlias: string;
    /** Identifies the landing page in the LMS, e.g. "paytalk-landing". */
    source: string;
    /** The exact marketing-consent wording the applicant saw, in their locale. */
    consentText: string;
}
/**
 * The flat JSON body sent to the LMS. Every value is a string, so the
 * key -> value view in the LMS panel reads without a legend. Base fields
 * first, then the landing page's extra fields.
 */
declare function buildLeadPayload(lead: Lead, options: LeadPayloadOptions): LeadPayload;
declare function sendLeadToLms(payload: LeadPayload, config: LmsConfig, fetchImpl?: typeof fetch): Promise<LmsResult>;

/**
 * Fails the build if any content still contains a placeholder once the site
 * is about to go public. While the site is behind the launch gate,
 * placeholders stay visible on purpose, so reviewers see exactly what is
 * still missing:
 *
 *   assertNoPlaceholdersWhenPublic(content, isSitePublic());
 */
declare function assertNoPlaceholdersWhenPublic(content: unknown, isPublic: boolean): void;

declare function isRateLimited(key: string, limit: number, windowMs: number): boolean;

interface RobotsOptions {
    /** Absolute production URL, e.g. https://paytalk.pl, used for the sitemap link. */
    siteUrl: string;
    /** Defaults to process.env. */
    env?: EnvVars;
}
/**
 * robots.txt for `src/app/robots.ts`:
 *
 *   export default function robots() { return createRobots({ siteUrl: SITE_URL }); }
 *
 * Disallows everything until the site is public (and on every preview).
 */
declare function createRobots(options: RobotsOptions): MetadataRoute.Robots;

export { BASE_FIELD_NAMES, type BasicAuthCredentials, EMAIL_MAX_LENGTH, EMAIL_PATTERN, EnvVars, type ExtraFields, type FieldErrorCode, type FieldErrors, type FieldSpec, type FieldValue, type LaunchGate, type LaunchGateOptions, type Lead, type LeadHandlerError, type LeadHandlerOptions, type LeadPayload, type LeadPayloadOptions, type LeadSchema, type LeadSchemaOptions, type LeadValidation, type LmsConfig, type LmsResult, type RobotsOptions, assertNoPlaceholdersWhenPublic, buildLeadPayload, createLaunchGate, createLeadHandler, createRobots, defineLeadSchema, isAuthorized, isRateLimited, readBasicAuthCredentials, readLmsConfig, sendLeadToLms, validateLead };
