# Changelog

All notable changes to `@autopaylab/lp-core`. Versions are git tags (`vX.Y.Z`); landing pages pin them.

## 0.6.0 - 2026-11-12

### Added

- Legal texts for every form, approved by Autopay's legal team on 2026-11-12, exported from `@autopaylab/lp-core/lead`: `AUTOPAY_MARKETING_CONSENT` (checkbox label and stored `consentText`), `AUTOPAY_DATA_CONTROLLER_NOTICE` (short data-controller notice with a link to the privacy policy) and `AUTOPAY_PRIVACY_POLICY_URL` (the privacy-policy PDF), in Polish and English. Tests pin the Polish wording.
- `defineLeadSchema({ isMarketingConsentRequired: true })`: the form cannot be sent without the marketing consent; `validateLead` returns `marketing_consent: "required"`. Defaults to `false`, so existing pages keep their behaviour.

## 0.5.0 - 2026-11-12

### Added

- Google Analytics 4, optional, next to Matomo. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` (validated as `G-` plus uppercase letters and digits; a malformed value fails the build) and `NEXT_PUBLIC_GA_CMP_VENDOR_ID` (the ConsentManager vendor id for GA). With both set, `RootDocument` loads gtag.js directly (no Google Tag Manager) with Google Consent Mode v2 in Basic mode: consent default all denied in `<head>`, gtag.js requested only after `cmpmngr.getVendorConsent` reports consent, `analytics_storage` denied again on withdrawal, `ad_*` always denied. `buildGoogleAnalyticsScript`, `readGoogleAnalyticsConfig`, `GOOGLE_TAG_SCRIPT_ORIGIN`, `GOOGLE_ANALYTICS_CONNECT_ORIGINS` are exported.
- `trackCtaClick`, `trackFormStart`, `trackFormSubmit` also send GA4 events (`cta_click` `{placement}`, `application_start`, `generate_lead`, `application_error` `{reason}`) while GA consent is granted. Signatures and Matomo events are unchanged.
- CSP: with GA configured, `script-src` adds `https://www.googletagmanager.com` and `connect-src` adds `https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com`. Without GA the CSP is byte-identical to 0.4.0.

## 0.4.0 - 2026-11-02

### Added

- `createLeadHandler`: a "server" error now carries a `reason` (`lms_not_configured`, `lms_rejected`, `lms_bad_response`, `lms_network`, `lms_timeout`; type `LeadServerErrorReason`), so a missing configuration can be told apart from an LMS failure without server logs. `error` stays `"server"`, and forms need no change.

### Changed

- `createLeadHandler` checks the LMS configuration before validating the lead. A deployment without `LMS_LEAD_URL`/`LMS_FORM_ALIAS` now answers every submission with 500 `lms_not_configured`, an invalid one included, so a monitoring request with a deliberately invalid e-mail detects the misconfiguration without sending a real lead (ai.autopay.pl, 2026-11-02: leads failed unnoticed with the variables missing in Production).

### Fixed

- `assertNoPlaceholdersWhenPublic` checks string values only, for the markers the templates write (`PLACEHOLDER:` and `/placeholders/` paths), and reports the path of the first hit (e.g. `site.hero.title`). It used to match the bare word "placeholder" anywhere in the serialized content, keys included, so a field named `messagePlaceholder` blocked a public build of a finished page (ai.autopay.pl, 2026-11-02).

## 0.3.0 - 2026-10-29

### Changed

- `RootDocument`: the consent banner's language is no longer derived from `locale`. Pass `bannerLocale` ("pl" | "en") on pages that render each locale at its own URL; leave it out on pages that switch language on the client, so the banner reads the stored choice itself (autopaylab.com's pattern). `skipLinkLabel` accepts a ReactNode, so a client component can localise it.

## 0.2.1 - 2026-10-29

### Fixed

- `server` imports `next/server.js` (with the extension) so the built package resolves under plain Node ESM, which is how vitest loads it from a landing page's node_modules. Bundled Next apps were unaffected.

## 0.2.0 - 2026-10-29

### Added

- `@autopaylab/lp-core/lead`: the lead contract (`defineLeadSchema`, `validateLead`, field types, `EMAIL_PATTERN`) as an isomorphic entry with no Node or Next imports, so a client-side form can validate with the same schema the route handler enforces. `server` still re-exports it.

### Changed

- The repository is public (no secrets inside); installing needs no token on Vercel or in CI.

## 0.1.0 - 2026-10-29

First release. Extracted from `autopaylab/paytalkpl` (the most complete landing page at the time) and generalised.

### Added

- `config`: `createSecurityHeaders`, `buildContentSecurityPolicy`, `readThirdPartyOrigins`, `isSitePublic`, `isIndexable`. Third-party origins are validated at build time.
- `server`: `createLeadHandler`, `defineLeadSchema`, `validateLead` (base lead contract plus per-page extra fields), `sendLeadToLms`, `buildLeadPayload`, `readLmsConfig`, `isRateLimited`, `createLaunchGate`, `createRobots`, `assertNoPlaceholdersWhenPublic`.
- `react`: `RootDocument`, `MAIN_CONTENT_ID`, `buildMatomoScript`, `trackEvent`, `trackCtaClick`, `trackFormStart`, `trackFormSubmit`, `openCookieSettings`.
- `lp-check` CLI for landing-page CI: tag pins, `.env.example` hygiene, `security.txt`, no fonts outside the design system.

### Changed from paytalkpl

- Form field names are snake_case end to end (`marketing_consent`, `hp_field`), matching the LMS payload. paytalkpl's form sent `marketingConsent` / `hpField`.
- `sendLeadToLms` takes the built payload, not the lead; `buildLeadPayload` takes `source` and `consentText` explicitly instead of reading page content.
- Locales are not hard-coded; the schema lists them.
- Log prefix is `[lp-core]`.
