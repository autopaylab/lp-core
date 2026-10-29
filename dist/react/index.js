// src/react/analytics.ts
function trackEvent(category, action, name) {
  if (typeof window === "undefined" || typeof window._paq?.push !== "function") return;
  window._paq.push(name === void 0 ? ["trackEvent", category, action] : ["trackEvent", category, action, name]);
}
function trackCtaClick(placement) {
  trackEvent("CTA", "click", placement);
}
function trackFormStart() {
  trackEvent("Form", "start");
}
function trackFormSubmit(result) {
  if (result === "success") trackEvent("Form", "submit_success");
  else trackEvent("Form", "submit_error", result);
}

// src/react/cookie-settings.ts
function openCookieSettings() {
  if (typeof window !== "undefined" && typeof window.__cmp === "function") {
    window.__cmp("showScreen");
    return;
  }
  console.warn("[lp-core] Cookie settings unavailable: ConsentManager (window.__cmp) has not loaded.");
}

// src/react/matomo-script.ts
function buildMatomoScript(matomoSiteId, matomoOrigin, cmpVendorId) {
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

// src/react/RootDocument.tsx
import { CookieConsentScript } from "@autopaylab/landing-design-system/organisms";

// src/config/security-headers.ts
var DEFAULT_MATOMO_ORIGIN = "https://piwik.blue.pl";

// src/react/RootDocument.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var MAIN_CONTENT_ID = "main";
var SKIP_LINK_CLASS = "lp-skip-link";
var SKIP_LINK_CSS = `
.${SKIP_LINK_CLASS}{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}
.${SKIP_LINK_CLASS}:focus{position:fixed;left:1rem;top:1rem;z-index:50;width:auto;height:auto;overflow:visible;padding:.5rem 1rem;border-radius:.5rem;background:var(--background,#fff);color:var(--foreground,#000);box-shadow:0 10px 30px rgba(0,0,0,.15);outline:2px solid currentColor}
`.trim();
function RootDocument({ locale, skipLinkLabel, bannerLocale, children, env = process.env, bodyClassName }) {
  const matomoSiteId = env.NEXT_PUBLIC_MATOMO_SITE_ID ?? "";
  const matomoOrigin = env.NEXT_PUBLIC_MATOMO_ORIGIN || DEFAULT_MATOMO_ORIGIN;
  const matomoCmpVendorId = env.NEXT_PUBLIC_MATOMO_CMP_VENDOR_ID ?? "";
  const cmpCdid = env.NEXT_PUBLIC_CMP_CDID || void 0;
  return /* @__PURE__ */ jsx("html", { lang: locale, children: /* @__PURE__ */ jsxs("body", { className: bodyClassName, children: [
    /* @__PURE__ */ jsx(CookieConsentScript, { cmpCdid, locale: bannerLocale }),
    matomoSiteId && matomoCmpVendorId ? /* @__PURE__ */ jsx("script", { id: "matomo-analytics", dangerouslySetInnerHTML: { __html: buildMatomoScript(matomoSiteId, matomoOrigin, matomoCmpVendorId) } }) : null,
    /* @__PURE__ */ jsx("style", { dangerouslySetInnerHTML: { __html: SKIP_LINK_CSS } }),
    /* @__PURE__ */ jsx("a", { href: `#${MAIN_CONTENT_ID}`, className: SKIP_LINK_CLASS, children: skipLinkLabel }),
    children
  ] }) });
}
export {
  MAIN_CONTENT_ID,
  RootDocument,
  buildMatomoScript,
  openCookieSettings,
  trackCtaClick,
  trackEvent,
  trackFormStart,
  trackFormSubmit
};
//# sourceMappingURL=index.js.map