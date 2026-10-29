/**
 * `@autopaylab/lp-core/server`: everything that runs on the server of a
 * landing page. Route handlers, the proxy, robots and build-time content
 * checks.
 */
export { isAuthorized, readBasicAuthCredentials, type BasicAuthCredentials } from "./basic-auth";
export { EMAIL_MAX_LENGTH, EMAIL_PATTERN } from "./email-pattern";
export { createLaunchGate, type LaunchGate, type LaunchGateOptions } from "./launch-gate";
export { createLeadHandler, type LeadHandlerError, type LeadHandlerOptions } from "./lead-handler";
export {
  BASE_FIELD_NAMES,
  defineLeadSchema,
  validateLead,
  type ExtraFields,
  type FieldErrorCode,
  type FieldErrors,
  type FieldSpec,
  type FieldValue,
  type Lead,
  type LeadSchema,
  type LeadSchemaOptions,
  type LeadValidation,
} from "./lead-schema";
export { buildLeadPayload, readLmsConfig, sendLeadToLms, type LeadPayload, type LeadPayloadOptions, type LmsConfig, type LmsResult } from "./lms";
export { assertNoPlaceholdersWhenPublic } from "./placeholders";
export { isRateLimited } from "./rate-limit";
export { createRobots, type RobotsOptions } from "./robots";
export { isIndexable, isSitePublic, type EnvVars } from "../config/site-config";
