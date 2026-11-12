# @autopaylab/lp-core

Shared Next.js runtime for Autopay landing pages. One implementation of the things every landing page must get right, so no landing page re-implements (or re-breaks) them: security headers and CSP, the consent banner and consent-gated analytics (Matomo, GA4), lead delivery to the LMS, the optional pre-launch gate.

UI lives in [`landing-design-system`](https://github.com/autopaylab/landing-design-system). New landing pages start from [`lp-foundation`](https://github.com/autopaylab/lp-foundation), which wires both packages together; its `docs/ARCHITECTURE.md` is the ground-rules document this package enforces.

## Install

Installed straight from a release tag. Never `#main`, never a commit hash:

```bash
npm install github:autopaylab/lp-core#v0.2.0
```

The repo is public on purpose: it holds no secrets (every credential and endpoint comes from a landing page's environment variables), and a public git dependency needs no token on Vercel or in CI, so there is no token to rotate or to expire. Landing-page repos themselves stay private.

`dist/` is committed, so the install needs no build step. Peer dependencies: `next >= 16`, `react >= 19`, `@autopaylab/landing-design-system >= 0.12` (the first tag whose `CookieConsentScript` takes `locale`).

## What a landing page uses

| Import | Use |
|---|---|
| `@autopaylab/lp-core/config` | `createSecurityHeaders()` in `next.config.ts`; `isSitePublic`, `isIndexable`. No Next or React imports, safe in config files. |
| `@autopaylab/lp-core/lead` | `defineLeadSchema()`, `validateLead()`: the lead contract, with no Node or Next imports, so the form validates in the browser with the same schema the server enforces. |
| `@autopaylab/lp-core/server` | `createLeadHandler()` as the `POST` of the form endpoint; `createLaunchGate()` for `src/proxy.ts`; `createRobots()`; `assertNoPlaceholdersWhenPublic()`. Re-exports `lead`. |
| `@autopaylab/lp-core/react` | `RootDocument` for the root layout; `trackEvent`, `trackCtaClick`, `trackFormStart`, `trackFormSubmit`; `openCookieSettings`. |
| `npx lp-check` | Ground-rules check for CI: tag pins, `.env.example`, `security.txt`, no fonts outside the design system. |

### next.config.ts

```ts
import type { NextConfig } from "next";
import { createSecurityHeaders } from "@autopaylab/lp-core/config";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: createSecurityHeaders() }];
  },
};
export default nextConfig;
```

Third-party origins (ConsentManager, Matomo) come from `NEXT_PUBLIC_CMP_HOST`, `NEXT_PUBLIC_CMP_CDN`, `NEXT_PUBLIC_MATOMO_ORIGIN`, validated at build time; a malformed value fails the build. When GA4 is configured (see below), the CSP also allows `https://www.googletagmanager.com` in `script-src` and `https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com` in `connect-src`; without it the CSP is unchanged. Any other third-party origin is a change to this package, not to a landing page.

### Root layout

```tsx
import { RootDocument } from "@autopaylab/lp-core/react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootDocument locale="pl" bannerLocale="pl" skipLinkLabel="Przejdź do treści">
      {children}
    </RootDocument>
  );
}
```

Every page renders `<main id="main">` (see `MAIN_CONTENT_ID`). `bannerLocale` fixes the consent banner's language for pages with one URL per locale; leave it out on a page that switches language on the client and stores the choice under the design system's localStorage key, and the banner follows that choice. `skipLinkLabel` can be a client component for the same reason. Matomo is added only when `NEXT_PUBLIC_MATOMO_SITE_ID` and `NEXT_PUBLIC_MATOMO_CMP_VENDOR_ID` are both set, and runs only after the visitor consents to the Matomo vendor in ConsentManager.

### Google Analytics 4 (optional)

GA4 is added by `RootDocument` when both of these are set (Vercel, Production only, unless you want preview traffic in the property):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | The GA4 web stream's measurement id, `G-` plus uppercase letters and digits. A malformed value fails the build. |
| `NEXT_PUBLIC_GA_CMP_VENDOR_ID` | The ConsentManager vendor id for Google Analytics, from the ConsentManager admin for this page's `cmp_cdid` config (not the cdid itself). Ask whoever administers ConsentManager; the vendor must be enabled in that config, or consent can never be given. |

Matomo and GA4 are independent: set either pair, both, or neither.

How it runs: gtag.js directly, no Google Tag Manager container, with Google Consent Mode v2 in **Basic** mode. A `<head>` script sets the consent default (`analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization` all `denied`) before the consent banner runs. gtag.js is requested only after `window.cmpmngr.getVendorConsent(<GA vendor id>)` turns true; then `analytics_storage` is granted and GA4 is configured. If the visitor withdraws consent, `analytics_storage` goes back to `denied` and `ga-disable-<id>` stops the loaded tag. `ad_*` stay `denied` always: these pages run no ads.

Why Basic, not Advanced: in Advanced mode gtag.js loads on every visit and sends cookieless pings while consent is denied, which Google then models. Basic sends nothing to Google until consent, the same guarantee Matomo has here, so a landing page needs no separate legal review of pre-consent pings. The cost is no behavioural modelling of non-consenting visitors in GA4.

`trackCtaClick`, `trackFormStart` and `trackFormSubmit` send these GA4 events next to their Matomo events, only while consent is granted (nothing is queued before it):

| Helper | GA4 event |
|---|---|
| `trackCtaClick(placement)` | `cta_click` `{ placement }` |
| `trackFormStart()` | `application_start` (`form_start` is reserved by GA4 Enhanced Measurement) |
| `trackFormSubmit("success")` | `generate_lead` |
| `trackFormSubmit(reason)` | `application_error` `{ reason }` |

`trackEvent` stays Matomo-only. To report `placement` and `reason` in GA4, register them as event-scoped custom dimensions in the property; mark `generate_lead` as a key event.

### Lead form endpoint

```ts
// src/content/lead.ts
import { AUTOPAY_MARKETING_CONSENT, defineLeadSchema } from "@autopaylab/lp-core/lead";

export const leadSchema = defineLeadSchema({
  locales: ["pl", "en"],
  isMarketingConsentRequired: true,
  fields: {
    company: { kind: "text", maxLength: 200, required: true },
  },
});

export const consentText = AUTOPAY_MARKETING_CONSENT;

// src/app/api/apply/route.ts
import { createLeadHandler } from "@autopaylab/lp-core/server";
import { consentText, leadSchema } from "@/content/lead";

export const POST = createLeadHandler({ source: "my-landing", schema: leadSchema, consentText });
```

The form posts JSON with the same snake_case keys: base fields `email`, `message`, `marketing_consent` (boolean), `locale`, the honeypot `hp_field`, plus the schema's extra fields. The handler answers `{ ok: true }`, or `{ ok: false, error, fields? }` with `error` one of `rate_limited` (429), `invalid_json` (400), `validation` (400, with per-field codes `required` | `invalid` | `tooLong`), `server` (500 when the LMS is not configured, 502 when it rejects the lead).

**Legal texts.** Every form shows the marketing consent and the data-controller notice approved by Autopay's legal team (2026-11-12), imported from `@autopaylab/lp-core/lead`, never retyped: `AUTOPAY_MARKETING_CONSENT` (label of an unchecked checkbox; also the `consentText` stored with the lead), `AUTOPAY_DATA_CONTROLLER_NOTICE` (`lead`, a link labelled `linkLabel` to `AUTOPAY_PRIVACY_POLICY_URL`, `trail`), in `pl` and `en`. `AUTOPAY_PRIVACY_POLICY_URL` is per language (Polish PDF on autopay.pl, English PDF on autopay.eu); every privacy-policy link on a page, the footer's included, uses it and opens in a new tab. With `isMarketingConsentRequired: true` the form cannot be sent without the consent (`marketing_consent: "required"`); it defaults to `false`. A page may keep other consents as its own checkbox fields.

Delivery needs `LMS_LEAD_URL` and `LMS_FORM_ALIAS`. The lead sent to the LMS always has `_form`, `email`, `message`, `marketing_consent` (`tak`/`nie`), `marketing_consent_text` (the exact wording the applicant saw), `locale`, `source`, then the extra fields. Field names are the contract with the LMS form: after adding or renaming one, re-learn the form in the LMS panel (`learn` mode, one submission, then `restrict`).

### Pre-launch gate (optional)

```ts
// src/proxy.ts
import { createLaunchGate } from "@autopaylab/lp-core/server";
import type { NextRequest } from "next/server";

const gate = createLaunchGate({ realm: "My landing" });

// Next analyses this file statically: `proxy` must be a plain exported
// function and `config.matcher` a literal, so neither can be destructured
// from the package. The matcher mirrors gate.config (everything except
// security.txt, which must stay reachable for security reports).
export function proxy(request: NextRequest) {
  return gate.proxy(request);
}

export const config = {
  matcher: ["/((?!\\.well-known/security\\.txt$).*)"],
};
```

Until `SITE_IS_PUBLIC=true`, every route except `/.well-known/security.txt` requires `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`, and the site is noindex (`X-Robots-Tag`, `robots.txt`, metadata). A non-public deployment without credentials answers 503. Preview deployments stay noindex after launch. A page that never needs the gate simply has no `src/proxy.ts`.

### robots.txt

```ts
// src/app/robots.ts
import { createRobots } from "@autopaylab/lp-core/server";
import { SITE_URL } from "@/lib/site-meta";

export default function robots() {
  return createRobots({ siteUrl: SITE_URL });
}
```

## Development

```bash
npm install
npm run check      # lint + typecheck + test
npm run build      # dist/, must be committed
```

CI runs `check`, `build`, and fails if `dist/` differs from the committed one. Keep PRs small; every change to a shared behaviour here lands in every landing page on its next bump.

## Releasing

```bash
npm version minor   # or patch / major
```

`preversion` runs the checks, `version` rebuilds `dist/` and stages it with `CHANGELOG.md`, `postversion` pushes the commit and the tag. Write the CHANGELOG entry before running it. Then bump the pin in each landing page (`github:autopaylab/lp-core#vX.Y.Z`), one PR per page.

Semver as seen from a landing page: a **major** means a landing page must change code (renamed export, new required option, new base lead field); a **minor** adds something; a **patch** fixes behaviour without changing the API.

## Design decisions

- **Four entry points, not one.** `config` must load inside `next.config.ts` before the app exists, so it imports neither Next nor React. `lead` is isomorphic so a client component can validate with it; `server` carries Node-only code (`node:crypto`, `next/server`) that a browser bundle must never see. `react` is split from both so a route handler never pulls in the document shell.
- **No validation library.** The lead schema supports four field kinds with a length limit each. That covers every landing page form so far; a library would add a dependency to review and a second place for rules to live.
- **In-memory rate limiting is a backstop.** Vercel Functions don't share memory. The real limit is a Vercel Firewall rule on the form endpoint, set per landing page.
- **`dist/` is committed.** Same pattern as the design system: installing from a git tag needs no build step on the consumer's side, and CI verifies the committed build matches the source.
- **GA4 without Google Tag Manager, Consent Mode in Basic mode.** A GTM container would let tags be added outside code review and outside this package's CSP. Basic mode keeps "no third-party request before consent" true for every tracker.
- **Success from the LMS is decided by the response body**, not the HTTP status, because the LMS documents its status codes as unreliable.
