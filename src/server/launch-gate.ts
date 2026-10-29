import { type NextRequest, NextResponse } from "next/server";

import { type EnvVars, isSitePublic } from "../config/site-config";
import { isAuthorized, readBasicAuthCredentials } from "./basic-auth";

export interface LaunchGateOptions {
  /** Shown in the browser's password prompt. Defaults to "Autopay". */
  realm?: string;
  /** Defaults to process.env, read per request. */
  env?: EnvVars;
}

export interface LaunchGate {
  proxy: (request: NextRequest) => NextResponse;
  config: { matcher: string[] };
}

/**
 * Optional pre-launch password gate for `src/proxy.ts`:
 *
 *   export const { proxy, config } = createLaunchGate({ realm: "PayTalk" });
 *
 * Until SITE_IS_PUBLIC is exactly "true", every route except security.txt
 * requires Basic Auth. Fails closed: a non-public deployment without
 * credentials configured answers 503 to everything rather than opening up.
 *
 * Security headers (CSP, HSTS, ...) are not set here: next.config.ts
 * `headers()` runs before Proxy for every route (Next 16, "Execution order"),
 * so the 401/503 responses carry the same headers as every page.
 */
export function createLaunchGate(options: LaunchGateOptions = {}): LaunchGate {
  const realm = options.realm ?? "Autopay";

  function proxy(request: NextRequest): NextResponse {
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
      headers: { "WWW-Authenticate": `Basic realm="${realm.replace(/"/g, "")}", charset="UTF-8"` },
    });
  }

  return {
    proxy,
    // Everything except security.txt, which must stay reachable for security reports.
    config: { matcher: ["/((?!\\.well-known/security\\.txt$).*)"] },
  };
}
