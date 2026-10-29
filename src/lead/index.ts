/**
 * `@autopaylab/lp-core/lead`: the lead contract. Isomorphic on purpose: no
 * Node or Next imports, so a form can validate in the browser with the same
 * schema the route handler enforces on the server.
 */
export { EMAIL_MAX_LENGTH, EMAIL_PATTERN } from "./email-pattern";
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
