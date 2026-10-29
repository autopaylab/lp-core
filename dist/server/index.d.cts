import { E as EnvVars } from '../site-config-CegvYjda.cjs';
export { i as isIndexable, a as isSitePublic } from '../site-config-CegvYjda.cjs';
import { NextRequest, NextResponse } from 'next/server.js';
import { LeadSchema, Lead } from '../lead/index.cjs';
export { BASE_FIELD_NAMES, EMAIL_MAX_LENGTH, EMAIL_PATTERN, ExtraFields, FieldErrorCode, FieldErrors, FieldSpec, FieldValue, LeadSchemaOptions, LeadValidation, defineLeadSchema, validateLead } from '../lead/index.cjs';
import { MetadataRoute } from 'next';

interface BasicAuthCredentials {
    user: string;
    password: string;
}
/** Reads the expected credentials from env; null when either is missing or empty. */
declare function readBasicAuthCredentials(env?: EnvVars): BasicAuthCredentials | null;
/** True when an `Authorization: Basic ...` header carries exactly the expected credentials. */
declare function isAuthorized(authorizationHeader: string | null, expected: BasicAuthCredentials): boolean;

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

export { type BasicAuthCredentials, EnvVars, type LaunchGate, type LaunchGateOptions, Lead, type LeadHandlerError, type LeadHandlerOptions, type LeadPayload, type LeadPayloadOptions, LeadSchema, type LmsConfig, type LmsResult, type RobotsOptions, assertNoPlaceholdersWhenPublic, buildLeadPayload, createLaunchGate, createLeadHandler, createRobots, isAuthorized, isRateLimited, readBasicAuthCredentials, readLmsConfig, sendLeadToLms };
