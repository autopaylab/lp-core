import { E as EnvVars } from '../site-config-CegvYjda.cjs';
export { i as isIndexable, a as isSitePublic } from '../site-config-CegvYjda.cjs';

/** Defaults for the two third-party origins every Autopay landing page talks to. */
declare const DEFAULT_CONSENT_MANAGER_HOST = "c.delivery.consentmanager.net";
declare const DEFAULT_CONSENT_MANAGER_CDN = "cdn.consentmanager.net";
declare const DEFAULT_MATOMO_ORIGIN = "https://piwik.blue.pl";
interface SecurityHeadersOptions {
    /** Defaults to process.env. Tests pass their own map. */
    env?: EnvVars;
    /**
     * Chrome origin-trial token for WebMCP (a public per-origin value, not a
     * secret). Only sent when set. Leave out unless the page registers WebMCP
     * tools and the API is still behind Chrome's origin trial.
     */
    originTrialToken?: string;
}
interface HttpHeader {
    key: string;
    value: string;
}
interface ThirdPartyOrigins {
    consentManagerDelivery: string;
    consentManagerCdn: string;
    matomoOrigin: string;
}
/**
 * Third-party origins come from env vars because every landing page has its
 * own ConsentManager config and its own Matomo site. They are validated
 * here, at the boundary, so a typo fails the build instead of silently
 * producing a CSP that blocks the consent banner in production.
 */
declare function readThirdPartyOrigins(env?: EnvVars): ThirdPartyOrigins;
/**
 * Content Security Policy shared by every landing page. Only ConsentManager,
 * Matomo and, when configured (see readGoogleAnalyticsConfig), Google
 * Analytics are allowed as third parties. Without GA the policy is exactly
 * what it was before GA support existed; adding another origin is a change
 * to this package, not to a landing page, so the list stays reviewable in
 * one place.
 *
 * 'unsafe-inline' for scripts, not hash/nonce-based: Next.js App Router's
 * RSC hydration payload ships as inline self.__next_f.push(...) scripts with
 * per-build/per-route content that can't be hashed statically, and the
 * instant any hash-source is present in this directive, browsers stop
 * honoring 'unsafe-inline' for the whole thing, breaking hydration. A nonce
 * would cover __next_f too, but requires dynamic (per-request) rendering
 * everywhere, trading away static generation and edge caching for the whole
 * site. Not worth it by default; revisit only if a page genuinely needs it.
 */
declare function buildContentSecurityPolicy(env?: EnvVars): string;
/**
 * The full set of hardening headers for `next.config.ts`:
 *
 *   async headers() {
 *     return [{ source: "/:path*", headers: createSecurityHeaders() }];
 *   }
 *
 * Evaluated at build time: changing SITE_IS_PUBLIC or any NEXT_PUBLIC_* value
 * needs a redeploy (Vercel applies env changes only to new deployments).
 */
declare function createSecurityHeaders(options?: SecurityHeadersOptions): HttpHeader[];

interface GoogleAnalyticsConfig {
    /** GA4 measurement id, e.g. "G-ABC123". */
    measurementId: string;
    /** ConsentManager vendor id whose consent gates GA4. */
    cmpVendorId: string;
}
/** Where gtag.js is loaded from. */
declare const GOOGLE_TAG_SCRIPT_ORIGIN = "https://www.googletagmanager.com";
/**
 * Hosts gtag.js sends GA4 measurements to. Narrower than the full list in
 * Google's CSP guide (which adds *.google.com and the Ads endpoints): these
 * pages never enable Ads features, and ad_* consent is always denied.
 */
declare const GOOGLE_ANALYTICS_CONNECT_ORIGINS: readonly ["https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googletagmanager.com"];
/**
 * GA4 runs only when both NEXT_PUBLIC_GA_MEASUREMENT_ID and
 * NEXT_PUBLIC_GA_CMP_VENDOR_ID are set, mirroring Matomo. A malformed
 * measurement id throws even when the vendor id is missing, so a typo fails
 * the build (this is read from next.config.ts via createSecurityHeaders, and
 * again when RootDocument renders) instead of shipping a tag that never
 * reports.
 */
declare function readGoogleAnalyticsConfig(env?: EnvVars): GoogleAnalyticsConfig | null;

/**
 * The cookie banner every Autopay landing page uses: the ConsentManager config running in production on
 * autopaylab.com (process owner's decision, 2026-11-12). A new page gets it with no setup and no question to
 * the process owner. Set NEXT_PUBLIC_CMP_CDID only when the process owner decides a page needs a banner of
 * its own.
 */
declare const AUTOPAY_CMP_CDID = "136af463a10ba";
/** The Matomo (piwik.blue.pl) vendor inside the standard banner's config; gates Matomo on consent. */
declare const AUTOPAY_MATOMO_CMP_VENDOR_ID = "s2589";
interface ConsentManagerConfig {
    /** ConsentManager cmp_cdid: which banner config loads. */
    cdid: string;
    /** Matomo's vendor id inside that config; empty when a page's own banner has not named it. */
    matomoVendorId: string;
}
/**
 * The banner config a page runs with. With no NEXT_PUBLIC_CMP_CDID it is the standard Autopay banner and its
 * Matomo vendor. A page with its own cdid must also set NEXT_PUBLIC_MATOMO_CMP_VENDOR_ID: a vendor id belongs
 * to one banner config, and the standard one would never be granted inside another.
 */
declare function readConsentManagerConfig(env: EnvVars): ConsentManagerConfig;

export { AUTOPAY_CMP_CDID, AUTOPAY_MATOMO_CMP_VENDOR_ID, type ConsentManagerConfig, DEFAULT_CONSENT_MANAGER_CDN, DEFAULT_CONSENT_MANAGER_HOST, DEFAULT_MATOMO_ORIGIN, EnvVars, GOOGLE_ANALYTICS_CONNECT_ORIGINS, GOOGLE_TAG_SCRIPT_ORIGIN, type GoogleAnalyticsConfig, type HttpHeader, type SecurityHeadersOptions, buildContentSecurityPolicy, createSecurityHeaders, readConsentManagerConfig, readGoogleAnalyticsConfig, readThirdPartyOrigins };
