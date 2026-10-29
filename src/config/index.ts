/**
 * `@autopaylab/lp-core/config`: build-time configuration for next.config.ts.
 * Nothing here imports Next or React, so it can be evaluated by the config
 * loader before the app exists.
 */
export {
  buildContentSecurityPolicy,
  createSecurityHeaders,
  DEFAULT_CONSENT_MANAGER_CDN,
  DEFAULT_CONSENT_MANAGER_HOST,
  DEFAULT_MATOMO_ORIGIN,
  readThirdPartyOrigins,
  type HttpHeader,
  type SecurityHeadersOptions,
} from "./security-headers";
export { isIndexable, isSitePublic, type EnvVars } from "./site-config";
