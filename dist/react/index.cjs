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
  buildMatomoScript: () => buildMatomoScript,
  openCookieSettings: () => openCookieSettings,
  trackCtaClick: () => trackCtaClick,
  trackEvent: () => trackEvent,
  trackFormStart: () => trackFormStart,
  trackFormSubmit: () => trackFormSubmit
});
module.exports = __toCommonJS(react_exports);

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
function RootDocument({ locale, skipLinkLabel, children, env = process.env, bodyClassName }) {
  const matomoSiteId = env.NEXT_PUBLIC_MATOMO_SITE_ID ?? "";
  const matomoOrigin = env.NEXT_PUBLIC_MATOMO_ORIGIN || DEFAULT_MATOMO_ORIGIN;
  const matomoCmpVendorId = env.NEXT_PUBLIC_MATOMO_CMP_VENDOR_ID ?? "";
  const cmpCdid = env.NEXT_PUBLIC_CMP_CDID || void 0;
  const bannerLocale = locale === "pl" || locale === "en" ? locale : void 0;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("html", { lang: locale, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { className: bodyClassName, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_organisms.CookieConsentScript, { cmpCdid, locale: bannerLocale }),
    matomoSiteId && matomoCmpVendorId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("script", { id: "matomo-analytics", dangerouslySetInnerHTML: { __html: buildMatomoScript(matomoSiteId, matomoOrigin, matomoCmpVendorId) } }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { dangerouslySetInnerHTML: { __html: SKIP_LINK_CSS } }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: `#${MAIN_CONTENT_ID}`, className: SKIP_LINK_CLASS, children: skipLinkLabel }),
    children
  ] }) });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MAIN_CONTENT_ID,
  RootDocument,
  buildMatomoScript,
  openCookieSettings,
  trackCtaClick,
  trackEvent,
  trackFormStart,
  trackFormSubmit
});
//# sourceMappingURL=index.cjs.map