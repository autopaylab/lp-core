import type { EnvVars } from "./site-config";

/**
 * The cookie banner every Autopay landing page uses: the ConsentManager config running in production on
 * autopaylab.com (process owner's decision, 2026-11-12). A new page gets it with no setup and no question to
 * the process owner. Set NEXT_PUBLIC_CMP_CDID only when the process owner decides a page needs a banner of
 * its own.
 */
export const AUTOPAY_CMP_CDID = "136af463a10ba";

/** The Matomo (piwik.blue.pl) vendor inside the standard banner's config; gates Matomo on consent. */
export const AUTOPAY_MATOMO_CMP_VENDOR_ID = "s2589";

export interface ConsentManagerConfig {
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
export function readConsentManagerConfig(env: EnvVars): ConsentManagerConfig {
  const cdid = env.NEXT_PUBLIC_CMP_CDID || AUTOPAY_CMP_CDID;
  const isStandardBanner = cdid === AUTOPAY_CMP_CDID;
  const matomoVendorId = env.NEXT_PUBLIC_MATOMO_CMP_VENDOR_ID || (isStandardBanner ? AUTOPAY_MATOMO_CMP_VENDOR_ID : "");
  return { cdid, matomoVendorId };
}
