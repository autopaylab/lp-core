/**
 * Matomo, consent-gated via ConsentManager's proprietary API:
 * window.cmpmngr.getVendorConsent(vendorId). Learned the hard way on the
 * autopaylab.com landing page. Read this before changing the gating
 * mechanism, because the two more "standard" approaches both looked right
 * and were both silently dead in production:
 *
 * 1. A window.tcfapi (IAB TCF v2) listener. Dead on arrival whenever the
 *    ConsentManager account has tcfcompliant: 0 in its delivered config
 *    (check the response body of its cmp.php request): window.tcfapi never
 *    becomes anything but ConsentManager's permanent stub in that case, so a
 *    listener on it never fires, whatever the visitor consents to.
 * 2. ConsentManager's declarative script-blocking markup (type="text/plain"
 *    + data-cmp-vendor="<id>" on the <script> tag). getVendorConsent can
 *    report true for that id while this never unblocks the tag: the
 *    declarative blocking is driven by a separate window.cmpblocker module
 *    that isn't loaded on every account/config.
 *
 * getVendorConsent is the one thing that reliably worked, so this polls it
 * on an interval instead of trusting an event or declarative markup.
 *
 * The vendor id (cmpVendorId) is a different thing from the banner's own
 * cmp_cdid (set on <CookieConsentScript> in the design system): cmp_cdid
 * identifies which ConsentManager banner config runs at all; the vendor id
 * lives inside that config and is what actually gates Matomo. Whether the
 * Matomo vendor is enabled inside a given cmp_cdid config is per account:
 * ask whoever administers ConsentManager, don't assume.
 */
export function buildMatomoScript(matomoSiteId: string, matomoOrigin: string, cmpVendorId: string): string {
  return `
(function () {
  var started = false;
  function startMatomo() {
    if (started) return;
    started = true;
    var _paq = window._paq = window._paq || [];
    _paq.push(["setDocumentTitle", document.domain + "/" + document.title]);
    _paq.push(["trackPageView"]);
    _paq.push(["enableLinkTracking"]);
    var u = ${JSON.stringify(matomoOrigin)};
    if (u.slice(-1) !== "/") u += "/";
    _paq.push(["setTrackerUrl", u + "matomo.php"]);
    _paq.push(["setSiteId", ${JSON.stringify(matomoSiteId)}]);
    var d = document, g = d.createElement("script"), s = d.getElementsByTagName("script")[0];
    g.async = true;
    g.src = u + "matomo.js";
    s.parentNode.insertBefore(g, s);
  }

  var poll = setInterval(function () {
    if (started) {
      clearInterval(poll);
      return;
    }
    if (window.cmpmngr && typeof window.cmpmngr.getVendorConsent === "function" && window.cmpmngr.getVendorConsent(${JSON.stringify(cmpVendorId)})) {
      clearInterval(poll);
      startMatomo();
    }
  }, 500);
})();
`;
}
