// src/config/site-config.ts
function isSitePublic(env = process.env) {
  return env.SITE_IS_PUBLIC === "true";
}
function isIndexable(env = process.env) {
  const isProductionDeployment = env.VERCEL_ENV === void 0 || env.VERCEL_ENV === "production";
  return isSitePublic(env) && isProductionDeployment;
}

// src/config/security-headers.ts
var DEFAULT_CONSENT_MANAGER_HOST = "c.delivery.consentmanager.net";
var DEFAULT_CONSENT_MANAGER_CDN = "cdn.consentmanager.net";
var DEFAULT_MATOMO_ORIGIN = "https://piwik.blue.pl";
function assertHttpsOrigin(name, value) {
  if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(value)) {
    throw new Error(`[lp-core] ${name} must be an https origin without a path, got ${JSON.stringify(value)}.`);
  }
  return value;
}
function assertHostname(name, value) {
  if (!/^[a-z0-9.-]+$/i.test(value)) {
    throw new Error(`[lp-core] ${name} must be a bare hostname, got ${JSON.stringify(value)}.`);
  }
  return value;
}
function readThirdPartyOrigins(env = process.env) {
  const cmpHost = assertHostname("NEXT_PUBLIC_CMP_HOST", env.NEXT_PUBLIC_CMP_HOST || DEFAULT_CONSENT_MANAGER_HOST);
  const cmpCdn = assertHostname("NEXT_PUBLIC_CMP_CDN", env.NEXT_PUBLIC_CMP_CDN || DEFAULT_CONSENT_MANAGER_CDN);
  const matomoOrigin = assertHttpsOrigin("NEXT_PUBLIC_MATOMO_ORIGIN", env.NEXT_PUBLIC_MATOMO_ORIGIN || DEFAULT_MATOMO_ORIGIN);
  return {
    consentManagerDelivery: `https://${cmpHost}`,
    consentManagerCdn: `https://${cmpCdn}`,
    matomoOrigin
  };
}
function buildContentSecurityPolicy(env = process.env) {
  const origins = readThirdPartyOrigins(env);
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${origins.consentManagerCdn} ${origins.consentManagerDelivery} ${origins.matomoOrigin}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${origins.consentManagerCdn} ${origins.consentManagerDelivery} ${origins.matomoOrigin}`,
    `frame-src 'self' ${origins.consentManagerCdn}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'"
  ].join("; ");
}
function createSecurityHeaders(options = {}) {
  const env = options.env ?? process.env;
  const headers = [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(env) },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    // includeSubDomains + preload are safe defaults IF every subdomain under
    // the domain serves valid HTTPS. Don't submit a domain to hstspreload.org
    // before checking that, and never the apex domain until you've confirmed
    // it isn't a platform-level redirect that bypasses this app's headers
    // entirely (autopaylab.com hit exactly that).
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    // same-origin (not same-origin-allow-popups): fine as long as the page
    // doesn't open or rely on cross-origin popups (no OAuth-style
    // window.opener flows). Loosen it in this package if one is ever needed.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" }
  ];
  if (!isIndexable(env)) {
    headers.push({ key: "X-Robots-Tag", value: "noindex, nofollow" });
  }
  if (options.originTrialToken) {
    headers.push({ key: "Origin-Trial", value: options.originTrialToken });
  }
  return headers;
}
export {
  DEFAULT_CONSENT_MANAGER_CDN,
  DEFAULT_CONSENT_MANAGER_HOST,
  DEFAULT_MATOMO_ORIGIN,
  buildContentSecurityPolicy,
  createSecurityHeaders,
  isIndexable,
  isSitePublic,
  readThirdPartyOrigins
};
//# sourceMappingURL=index.js.map