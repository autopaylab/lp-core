/**
 * `@autopaylab/lp-core/react`: the document shell for the root layout and
 * the small browser helpers a page calls from its own client components.
 */
export { trackCtaClick, trackEvent, trackFormStart, trackFormSubmit, type FormSubmitResult } from "./analytics";
export { openCookieSettings } from "./cookie-settings";
export { buildMatomoScript } from "./matomo-script";
export { MAIN_CONTENT_ID, RootDocument, type RootDocumentProps } from "./RootDocument";
