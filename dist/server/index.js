// src/server/basic-auth.ts
import { createHash, timingSafeEqual } from "crypto";
function readBasicAuthCredentials(env = process.env) {
  const user = env.BASIC_AUTH_USER;
  const password = env.BASIC_AUTH_PASSWORD;
  if (!user || !password) return null;
  return { user, password };
}
function safeEqual(actual, expected) {
  const actualDigest = createHash("sha256").update(actual).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualDigest, expectedDigest);
}
function isAuthorized(authorizationHeader, expected) {
  if (!authorizationHeader?.startsWith("Basic ")) return false;
  let decoded;
  try {
    decoded = Buffer.from(authorizationHeader.slice("Basic ".length), "base64").toString("utf8");
  } catch {
    return false;
  }
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;
  const user = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  const isUserCorrect = safeEqual(user, expected.user);
  const isPasswordCorrect = safeEqual(password, expected.password);
  return isUserCorrect && isPasswordCorrect;
}

// src/server/email-pattern.ts
var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var EMAIL_MAX_LENGTH = 320;

// src/server/launch-gate.ts
import { NextResponse } from "next/server";

// src/config/site-config.ts
function isSitePublic(env = process.env) {
  return env.SITE_IS_PUBLIC === "true";
}
function isIndexable(env = process.env) {
  const isProductionDeployment = env.VERCEL_ENV === void 0 || env.VERCEL_ENV === "production";
  return isSitePublic(env) && isProductionDeployment;
}

// src/server/launch-gate.ts
function createLaunchGate(options = {}) {
  const realm = options.realm ?? "Autopay";
  function proxy(request) {
    const env = options.env ?? process.env;
    if (isSitePublic(env)) return NextResponse.next();
    const credentials = readBasicAuthCredentials(env);
    if (!credentials) {
      console.error("[lp-core] SITE_IS_PUBLIC is not 'true' but BASIC_AUTH_USER/BASIC_AUTH_PASSWORD are not set; refusing all requests.");
      return new NextResponse("Site not configured.", { status: 503 });
    }
    if (isAuthorized(request.headers.get("authorization"), credentials)) return NextResponse.next();
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": `Basic realm="${realm.replace(/"/g, "")}", charset="UTF-8"` }
    });
  }
  return {
    proxy,
    // Everything except security.txt, which must stay reachable for security reports.
    config: { matcher: ["/((?!\\.well-known/security\\.txt$).*)"] }
  };
}

// src/server/lead-schema.ts
var BASE_FIELD_NAMES = ["email", "message", "marketing_consent", "marketing_consent_text", "locale", "source", "hp_field"];
var LMS_RESERVED_NAMES = ["_form"];
var FIELD_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
function defineLeadSchema(options) {
  if (options.locales.length === 0) {
    throw new Error("[lp-core] defineLeadSchema: at least one locale is required.");
  }
  const defaultLocale = options.defaultLocale ?? options.locales[0];
  if (!options.locales.includes(defaultLocale)) {
    throw new Error(`[lp-core] defineLeadSchema: defaultLocale ${JSON.stringify(defaultLocale)} is not in locales.`);
  }
  const fields = options.fields ?? {};
  const reserved = /* @__PURE__ */ new Set([...BASE_FIELD_NAMES, ...LMS_RESERVED_NAMES]);
  for (const [name, spec] of Object.entries(fields)) {
    if (!FIELD_NAME_PATTERN.test(name)) {
      throw new Error(`[lp-core] defineLeadSchema: field name ${JSON.stringify(name)} must be snake_case (a-z, 0-9, _).`);
    }
    if (reserved.has(name)) {
      throw new Error(`[lp-core] defineLeadSchema: ${JSON.stringify(name)} is a base field and cannot be redefined.`);
    }
    if (spec.kind !== "checkbox" && (!Number.isInteger(spec.maxLength) || spec.maxLength <= 0)) {
      throw new Error(`[lp-core] defineLeadSchema: field ${JSON.stringify(name)} needs a positive integer maxLength.`);
    }
  }
  return {
    locales: options.locales,
    defaultLocale,
    messageMaxLength: options.messageMaxLength ?? 1e3,
    fields
  };
}
var CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
var CONTROL_CHARACTERS_EXCEPT_NEWLINES = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
var asTrimmedString = (value) => typeof value === "string" ? value.trim() : "";
function validateText(value, spec) {
  const text = asTrimmedString(value);
  if (!text) return [text, spec.required ? "required" : null];
  if (text.length > spec.maxLength) return [text, "tooLong"];
  const forbidden = spec.kind === "textarea" ? CONTROL_CHARACTERS_EXCEPT_NEWLINES : CONTROL_CHARACTERS;
  if (forbidden.test(text)) return [text, "invalid"];
  if (spec.kind === "text" && spec.pattern && !spec.pattern.test(text)) return [text, "invalid"];
  return [text, null];
}
function validateLead(schema, input) {
  const body = input && typeof input === "object" ? input : {};
  const errors = {};
  const [email, emailError] = validateText(body.email, { kind: "text", maxLength: EMAIL_MAX_LENGTH, required: true, pattern: EMAIL_PATTERN });
  if (emailError) errors.email = emailError;
  const [message, messageError] = validateText(body.message, { kind: "textarea", maxLength: schema.messageMaxLength });
  if (messageError) errors.message = messageError;
  const fields = {};
  for (const [name, spec] of Object.entries(schema.fields)) {
    if (spec.kind === "checkbox") {
      const checked = body[name] === true;
      if (spec.required && !checked) errors[name] = "required";
      fields[name] = checked;
      continue;
    }
    const [value, error] = validateText(body[name], spec);
    if (error) errors[name] = error;
    fields[name] = value;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const locale = schema.locales.includes(body.locale) ? body.locale : schema.defaultLocale;
  return {
    ok: true,
    lead: {
      email,
      message,
      // Only an explicit true counts as consent; "true", 1 and undefined do not.
      marketing_consent: body.marketing_consent === true,
      locale,
      fields
    }
  };
}

// src/server/lms.ts
var TIMEOUT_MS = 1e4;
function readLmsConfig(env = process.env) {
  const leadUrl = env.LMS_LEAD_URL;
  const formAlias = env.LMS_FORM_ALIAS;
  if (!leadUrl || !formAlias) return null;
  return { leadUrl, formAlias };
}
var yesNo = (value) => value ? "tak" : "nie";
function buildLeadPayload(lead, options) {
  const payload = {
    _form: options.formAlias,
    email: lead.email,
    message: lead.message,
    marketing_consent: yesNo(lead.marketing_consent),
    marketing_consent_text: lead.marketing_consent ? options.consentText : "",
    locale: lead.locale,
    source: options.source
  };
  for (const [name, value] of Object.entries(lead.fields)) {
    payload[name] = typeof value === "boolean" ? yesNo(value) : value;
  }
  return payload;
}
async function sendLeadToLms(payload, config, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(config.leadUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
    console.error("[lp-core] LMS request failed:", error);
    return { ok: false, reason: isTimeout ? "timeout" : "network" };
  }
  let body;
  try {
    body = await response.json();
  } catch {
    console.error(`[lp-core] LMS returned a non-JSON response (HTTP ${response.status}).`);
    return { ok: false, reason: "bad_response" };
  }
  const status = body?.status;
  if (status === "SUCCESS") {
    const leadId = body.leadId;
    return { ok: true, leadId: typeof leadId === "number" ? leadId : void 0 };
  }
  console.error(`[lp-core] LMS rejected the lead (HTTP ${response.status}, status ${JSON.stringify(status)}).`);
  return { ok: false, reason: "rejected" };
}

// src/server/rate-limit.ts
var hits = /* @__PURE__ */ new Map();
function isRateLimited(key, limit, windowMs) {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  hits.set(key, timestamps);
  if (hits.size > 5e3) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= windowMs)) hits.delete(k);
    }
  }
  return timestamps.length > limit;
}

// src/server/lead-handler.ts
var DEFAULT_RATE_LIMIT_MAX_REQUESTS = 5;
var DEFAULT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1e3;
var reply = (status, body) => Response.json(body, { status });
function createLeadHandler(options) {
  const maxRequests = options.rateLimit?.maxRequests ?? DEFAULT_RATE_LIMIT_MAX_REQUESTS;
  const windowMs = options.rateLimit?.windowMs ?? DEFAULT_RATE_LIMIT_WINDOW_MS;
  return async function handleLead(request) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(`${options.source}:${ip}`, maxRequests, windowMs)) {
      return reply(429, { ok: false, error: "rate_limited" });
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return reply(400, { ok: false, error: "invalid_json" });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return reply(400, { ok: false, error: "invalid_json" });
    }
    if (body.hp_field) {
      return reply(200, { ok: true });
    }
    const result = validateLead(options.schema, body);
    if (!result.ok) {
      return reply(400, { ok: false, error: "validation", fields: result.errors });
    }
    const env = options.env ?? process.env;
    const lms = readLmsConfig(env);
    if (!lms) {
      console.error(`[lp-core] ${options.source}: LMS_LEAD_URL or LMS_FORM_ALIAS is not set; cannot deliver the lead.`);
      return reply(500, { ok: false, error: "server" });
    }
    const payload = buildLeadPayload(result.lead, {
      formAlias: lms.formAlias,
      source: options.source,
      consentText: options.consentText[result.lead.locale]
    });
    const delivery = await sendLeadToLms(payload, lms, options.fetchImpl ?? fetch);
    if (!delivery.ok) {
      return reply(502, { ok: false, error: "server" });
    }
    return reply(200, { ok: true });
  };
}

// src/server/placeholders.ts
var PLACEHOLDER_PATTERN = /placeholder/i;
function assertNoPlaceholdersWhenPublic(content, isPublic) {
  if (!isPublic) return;
  const serialized = JSON.stringify(content) ?? "";
  const match = serialized.match(new RegExp(`.{0,60}${PLACEHOLDER_PATTERN.source}.{0,60}`, "i"));
  if (match) {
    throw new Error(
      `[lp-core] SITE_IS_PUBLIC is "true" but page content still contains a placeholder near: ${match[0]}. Fill it in before the public launch.`
    );
  }
}

// src/server/robots.ts
function createRobots(options) {
  if (!isIndexable(options.env ?? process.env)) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${options.siteUrl.replace(/\/$/, "")}/sitemap.xml`
  };
}
export {
  BASE_FIELD_NAMES,
  EMAIL_MAX_LENGTH,
  EMAIL_PATTERN,
  assertNoPlaceholdersWhenPublic,
  buildLeadPayload,
  createLaunchGate,
  createLeadHandler,
  createRobots,
  defineLeadSchema,
  isAuthorized,
  isIndexable,
  isRateLimited,
  isSitePublic,
  readBasicAuthCredentials,
  readLmsConfig,
  sendLeadToLms,
  validateLead
};
//# sourceMappingURL=index.js.map