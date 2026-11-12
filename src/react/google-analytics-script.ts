import { GOOGLE_TAG_SCRIPT_ORIGIN } from "../config/google-analytics";

/**
 * Window property the script below keeps in sync with the visitor's GA
 * consent. The track helpers read it: window.gtag exists from the first
 * line of the script (Consent Mode needs it before consent), so "gtag is
 * defined" says nothing about consent, and anything pushed to dataLayer
 * before consent would be sent once gtag.js loads.
 */
export const GA_CONSENT_GRANTED_FLAG = "__lpCoreIsGaConsentGranted";

/**
 * GA4 via gtag.js (no Google Tag Manager container) with Google Consent
 * Mode v2 in Basic mode:
 *
 * 1. Right away: dataLayer/gtag and `consent default` with everything
 *    denied. Nothing is requested from Google at this point.
 * 2. Once ConsentManager reports consent for the GA vendor:
 *    `consent update` analytics_storage granted, then `js` + `config`, then
 *    gtag.js is loaded. Before that moment no Google request happens at all,
 *    the same guarantee buildMatomoScript gives for Matomo.
 * 3. If consent is later withdrawn: `consent update` analytics_storage
 *    denied, and Google's documented ga-disable-<id> switch, so the already
 *    loaded gtag.js stops sending. Granting again re-enables it without
 *    loading gtag.js twice.
 *
 * ad_storage, ad_user_data and ad_personalization are denied in every
 * update: these pages run no ads.
 *
 * Consent is read the same way as for Matomo, by polling
 * window.cmpmngr.getVendorConsent(vendorId); see matomo-script.ts for why
 * the TCF listener and ConsentManager's declarative blocking are not used.
 * Matomo stops polling once consent is given; this keeps polling (one
 * boolean call every 500 ms) because no ConsentManager event for withdrawal
 * has been verified on Autopay's accounts.
 */
export function buildGoogleAnalyticsScript(measurementId: string, cmpVendorId: string): string {
  return `
(function () {
  var measurementId = ${JSON.stringify(measurementId)};
  var vendorId = ${JSON.stringify(cmpVendorId)};
  var disableKey = "ga-disable-" + measurementId;
  var consentFlag = ${JSON.stringify(GA_CONSENT_GRANTED_FLAG)};
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500
  });
  window[consentFlag] = false;

  var granted = false;
  var loaded = false;
  function hasConsent() {
    return !!(window.cmpmngr && typeof window.cmpmngr.getVendorConsent === "function" && window.cmpmngr.getVendorConsent(vendorId));
  }
  function grant() {
    granted = true;
    window[disableKey] = false;
    gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    window[consentFlag] = true;
    if (loaded) return;
    loaded = true;
    gtag("js", new Date());
    gtag("config", measurementId);
    var g = document.createElement("script");
    g.async = true;
    g.src = ${JSON.stringify(`${GOOGLE_TAG_SCRIPT_ORIGIN}/gtag/js?id=`)} + encodeURIComponent(measurementId);
    document.head.appendChild(g);
  }
  function withdraw() {
    granted = false;
    window[consentFlag] = false;
    gtag("consent", "update", { analytics_storage: "denied" });
    window[disableKey] = true;
  }

  setInterval(function () {
    var consent = hasConsent();
    if (consent && !granted) grant();
    else if (!consent && granted) withdraw();
  }, 500);
})();
`;
}
