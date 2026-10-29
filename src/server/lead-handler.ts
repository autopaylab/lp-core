import type { EnvVars } from "../config/site-config";
import { type LeadSchema, validateLead } from "../lead/lead-schema";
import { buildLeadPayload, readLmsConfig, sendLeadToLms } from "./lms";
import { isRateLimited } from "./rate-limit";

export interface LeadHandlerOptions<L extends string> {
  /** Identifies the landing page in every lead, e.g. "paytalk-landing". */
  source: string;
  schema: LeadSchema<L>;
  /** The marketing-consent wording shown to the applicant, per locale. Stored with the lead. */
  consentText: Record<L, string>;
  /** Defaults: 5 requests per 10 minutes per client address. */
  rateLimit?: { maxRequests?: number; windowMs?: number };
  /** Defaults to process.env, read per request so a fixed variable takes effect without a cold start. */
  env?: EnvVars;
  /** Defaults to global fetch. Tests inject a mock. */
  fetchImpl?: typeof fetch;
}

/** Error codes returned to the form, which maps them to localized messages. */
export type LeadHandlerError = "rate_limited" | "invalid_json" | "validation" | "server";

const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 5;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

const reply = (status: number, body: unknown) => Response.json(body, { status });

/**
 * A hardened `POST` route handler for a landing page's lead form:
 *
 *   export const POST = createLeadHandler({ source, schema, consentText });
 *
 * Order is fixed and is the point: rate limit, JSON parse, honeypot drop,
 * server-side validation of every field, then delivery to the LMS. Nothing
 * reaches the LMS that was not validated here, whatever the browser sent.
 */
export function createLeadHandler<L extends string>(options: LeadHandlerOptions<L>): (request: Request) => Promise<Response> {
  const maxRequests = options.rateLimit?.maxRequests ?? DEFAULT_RATE_LIMIT_MAX_REQUESTS;
  const windowMs = options.rateLimit?.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS;

  return async function handleLead(request: Request): Promise<Response> {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(`${options.source}:${ip}`, maxRequests, windowMs)) {
      return reply(429, { ok: false, error: "rate_limited" satisfies LeadHandlerError });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return reply(400, { ok: false, error: "invalid_json" satisfies LeadHandlerError });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return reply(400, { ok: false, error: "invalid_json" satisfies LeadHandlerError });
    }

    // Honeypot: a real user never sees or fills this field. Pretend success so
    // a bot filling every input blindly gets no signal that it was caught, and
    // don't touch the LMS at all.
    if ((body as Record<string, unknown>).hp_field) {
      return reply(200, { ok: true });
    }

    const result = validateLead(options.schema, body);
    if (!result.ok) {
      return reply(400, { ok: false, error: "validation" satisfies LeadHandlerError, fields: result.errors });
    }

    const env = options.env ?? process.env;
    const lms = readLmsConfig(env);
    if (!lms) {
      console.error(`[lp-core] ${options.source}: LMS_LEAD_URL or LMS_FORM_ALIAS is not set; cannot deliver the lead.`);
      return reply(500, { ok: false, error: "server" satisfies LeadHandlerError });
    }

    const payload = buildLeadPayload(result.lead, {
      formAlias: lms.formAlias,
      source: options.source,
      consentText: options.consentText[result.lead.locale],
    });
    const delivery = await sendLeadToLms(payload, lms, options.fetchImpl ?? fetch);
    if (!delivery.ok) {
      return reply(502, { ok: false, error: "server" satisfies LeadHandlerError });
    }
    return reply(200, { ok: true });
  };
}
