import type { EnvVars } from "../config/site-config";
import type { Lead } from "../lead/lead-schema";

/**
 * Delivery of a validated lead to the LMS (`POST https://[domain]/lms/lead/receive`,
 * JSON body with the form alias in `_form`; see the LMS "Wysyłanie leadów" guide).
 *
 * Called from the server (createLeadHandler), never from the browser, so the
 * rate limit, honeypot and validation run first and the CSP needs no new origin.
 *
 * Success is decided only by `status === "SUCCESS"` in the JSON body: the guide
 * says the LMS's HTTP status codes (200/400/405/500) are currently unreliable.
 *
 * Field names are part of the contract: in "learn" mode the LMS records which
 * fields a form accepts, and in "restrict" mode it drops anything else.
 * Changing or adding a key means re-learning the form in the LMS panel.
 */
export interface LmsConfig {
  /** Full lead endpoint, e.g. https://[domain]/lms/lead/receive */
  leadUrl: string;
  /** Form alias from the LMS panel, one per landing page. */
  formAlias: string;
}

export type LmsResult = { ok: true; leadId?: number } | { ok: false; reason: "rejected" | "bad_response" | "network" | "timeout" };

export type LeadPayload = Record<string, string>;

const TIMEOUT_MS = 10_000;

export function readLmsConfig(env: EnvVars = process.env): LmsConfig | null {
  const leadUrl = env.LMS_LEAD_URL;
  const formAlias = env.LMS_FORM_ALIAS;
  if (!leadUrl || !formAlias) return null;
  return { leadUrl, formAlias };
}

export interface LeadPayloadOptions {
  formAlias: string;
  /** Identifies the landing page in the LMS, e.g. "paytalk-landing". */
  source: string;
  /** The exact marketing-consent wording the applicant saw, in their locale. */
  consentText: string;
}

const yesNo = (value: boolean) => (value ? "tak" : "nie");

/**
 * The flat JSON body sent to the LMS. Every value is a string, so the
 * key -> value view in the LMS panel reads without a legend. Base fields
 * first, then the landing page's extra fields.
 */
export function buildLeadPayload(lead: Lead, options: LeadPayloadOptions): LeadPayload {
  const payload: LeadPayload = {
    _form: options.formAlias,
    email: lead.email,
    message: lead.message,
    marketing_consent: yesNo(lead.marketing_consent),
    marketing_consent_text: lead.marketing_consent ? options.consentText : "",
    locale: lead.locale,
    source: options.source,
  };
  for (const [name, value] of Object.entries(lead.fields)) {
    payload[name] = typeof value === "boolean" ? yesNo(value) : value;
  }
  return payload;
}

export async function sendLeadToLms(payload: LeadPayload, config: LmsConfig, fetchImpl: typeof fetch = fetch): Promise<LmsResult> {
  let response: Response;
  try {
    response = await fetchImpl(config.leadUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
    console.error("[lp-core] LMS request failed:", error);
    return { ok: false, reason: isTimeout ? "timeout" : "network" };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    console.error(`[lp-core] LMS returned a non-JSON response (HTTP ${response.status}).`);
    return { ok: false, reason: "bad_response" };
  }

  const status = (body as { status?: unknown } | null)?.status;
  if (status === "SUCCESS") {
    const leadId = (body as { leadId?: unknown }).leadId;
    return { ok: true, leadId: typeof leadId === "number" ? leadId : undefined };
  }
  console.error(`[lp-core] LMS rejected the lead (HTTP ${response.status}, status ${JSON.stringify(status)}).`);
  return { ok: false, reason: "rejected" };
}
