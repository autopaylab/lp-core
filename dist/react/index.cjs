"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/react/index.ts
var react_exports = {};
__export(react_exports, {
  MAIN_CONTENT_ID: () => MAIN_CONTENT_ID,
  RootDocument: () => RootDocument,
  buildGoogleAnalyticsScript: () => buildGoogleAnalyticsScript,
  buildMatomoScript: () => buildMatomoScript,
  openCookieSettings: () => openCookieSettings,
  trackCtaClick: () => trackCtaClick,
  trackEvent: () => trackEvent,
  trackFormStart: () => trackFormStart,
  trackFormSubmit: () => trackFormSubmit
});
module.exports = __toCommonJS(react_exports);

// src/config/google-analytics.ts
var GOOGLE_TAG_SCRIPT_ORIGIN = "https://www.googletagmanager.com";
var MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;
function readGoogleAnalyticsConfig(env = process.env) {
  const measurementId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
  const cmpVendorId = env.NEXT_PUBLIC_GA_CMP_VENDOR_ID ?? "";
  if (measurementId && !MEASUREMENT_ID_PATTERN.test(measurementId)) {
    throw new Error(
      `[lp-core] NEXT_PUBLIC_GA_MEASUREMENT_ID must look like "G-" followed by uppercase letters and digits, got ${JSON.stringify(measurementId)}.`
    );
  }
  if (!measurementId || !cmpVendorId) return null;
  return { measurementId, cmpVendorId };
}

// src/react/google-analytics-script.ts
var GA_CONSENT_GRANTED_FLAG = "__lpCoreIsGaConsentGranted";
function buildGoogleAnalyticsScript(measurementId, cmpVendorId) {
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

// src/react/analytics.ts
function trackEvent(category, action, name) {
  if (typeof window === "undefined" || typeof window._paq?.push !== "function") return;
  window._paq.push(name === void 0 ? ["trackEvent", category, action] : ["trackEvent", category, action, name]);
}
function trackGoogleAnalyticsEvent(name, params) {
  if (typeof window === "undefined" || window[GA_CONSENT_GRANTED_FLAG] !== true || typeof window.gtag !== "function") return;
  if (params === void 0) window.gtag("event", name);
  else window.gtag("event", name, params);
}
function trackCtaClick(placement) {
  trackEvent("CTA", "click", placement);
  trackGoogleAnalyticsEvent("cta_click", { placement });
}
function trackFormStart() {
  trackEvent("Form", "start");
  trackGoogleAnalyticsEvent("application_start");
}
function trackFormSubmit(result) {
  if (result === "success") {
    trackEvent("Form", "submit_success");
    trackGoogleAnalyticsEvent("generate_lead");
  } else {
    trackEvent("Form", "submit_error", result);
    trackGoogleAnalyticsEvent("application_error", { reason: result });
  }
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
var import_organisms = require("@autopaylab/landing-design-system/organisms");

// src/config/security-headers.ts
var DEFAULT_MATOMO_ORIGIN = "https://piwik.blue.pl";

// src/react/RootDocument.tsx
var import_jsx_runtime = require("react/jsx-runtime");
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
  const googleAnalytics = readGoogleAnalyticsConfig(env);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", { lang: locale, children: [
    googleAnalytics ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "script",
      {
        id: "google-analytics",
        dangerouslySetInnerHTML: { __html: buildGoogleAnalyticsScript(googleAnalytics.measurementId, googleAnalytics.cmpVendorId) }
      }
    ) }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { className: bodyClassName, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_organisms.CookieConsentScript, { cmpCdid, locale: bannerLocale }),
      matomoSiteId && matomoCmpVendorId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("script", { id: "matomo-analytics", dangerouslySetInnerHTML: { __html: buildMatomoScript(matomoSiteId, matomoOrigin, matomoCmpVendorId) } }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { dangerouslySetInnerHTML: { __html: SKIP_LINK_CSS } }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: `#${MAIN_CONTENT_ID}`, className: SKIP_LINK_CLASS, children: skipLinkLabel }),
      children
    ] })
  ] });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MAIN_CONTENT_ID,
  RootDocument,
  buildGoogleAnalyticsScript,
  buildMatomoScript,
  openCookieSettings,
  trackCtaClick,
  trackEvent,
  trackFormStart,
  trackFormSubmit
});
//# sourceMappingURL=index.cjs.map