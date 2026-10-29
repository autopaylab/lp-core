/**
 * `@autopaylab/lp-core/server`: everything that runs on the server of a
 * landing page. Route handlers, the proxy, robots and build-time content
 * checks. Re-exports the lead contract for convenience; client components
 * import it from `@autopaylab/lp-core/lead` instead.
 */
export { isAuthorized, readBasicAuthCredentials, type BasicAuthCredentials } from "./basic-auth";
export { createLaunchGate, type LaunchGate, type LaunchGateOptions } from "./launch-gate";
export { createLeadHandler, type LeadHandlerError, type LeadHandlerOptions } from "./lead-handler";
export * from "../lead";
export { buildLeadPayload, readLmsConfig, sendLeadToLms, type LeadPayload, type LeadPayloadOptions, type LmsConfig, type LmsResult } from "./lms";
export { assertNoPlaceholdersWhenPublic } from "./placeholders";
export { isRateLimited } from "./rate-limit";
export { createRobots, type RobotsOptions } from "./robots";
export { isIndexable, isSitePublic, type EnvVars } from "../config/site-config";
