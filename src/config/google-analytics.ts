import type { EnvVars } from "./site-config";

export interface GoogleAnalyticsConfig {
  /** GA4 measurement id, e.g. "G-ABC123". */
  measurementId: string;
  /** ConsentManager vendor id whose consent gates GA4. */
  cmpVendorId: string;
}

/** Where gtag.js is loaded from. */
export const GOOGLE_TAG_SCRIPT_ORIGIN = "https://www.googletagmanager.com";

/**
 * Hosts gtag.js sends GA4 measurements to. Narrower than the full list in
 * Google's CSP guide (which adds *.google.com and the Ads endpoints): these
 * pages never enable Ads features, and ad_* consent is always denied.
 */
export const GOOGLE_ANALYTICS_CONNECT_ORIGINS = [
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://*.googletagmanager.com",
] as const;

const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;

/**
 * GA4 runs only when both NEXT_PUBLIC_GA_MEASUREMENT_ID and
 * NEXT_PUBLIC_GA_CMP_VENDOR_ID are set, mirroring Matomo. A malformed
 * measurement id throws even when the vendor id is missing, so a typo fails
 * the build (this is read from next.config.ts via createSecurityHeaders, and
 * again when RootDocument renders) instead of shipping a tag that never
 * reports.
 */
export function readGoogleAnalyticsConfig(env: EnvVars = process.env): GoogleAnalyticsConfig | null {
  const measurementId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
  const cmpVendorId = env.NEXT_PUBLIC_GA_CMP_VENDOR_ID ?? "";
  if (measurementId && !MEASUREMENT_ID_PATTERN.test(measurementId)) {
    throw new Error(
      `[lp-core] NEXT_PUBLIC_GA_MEASUREMENT_ID must look like "G-" followed by uppercase letters and digits, got ${JSON.stringify(measurementId)}.`,
    );
  }
  if (!measurementId || !cmpVendorId) return null;
  return { measurementId, cmpVendorId };
}
