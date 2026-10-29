# Changelog

All notable changes to `@autopaylab/lp-core`. Versions are git tags (`vX.Y.Z`); landing pages pin them.

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
