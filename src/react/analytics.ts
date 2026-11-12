import { GA_CONSENT_GRANTED_FLAG } from "./google-analytics-script";

type MatomoQueue = { push: (command: unknown[]) => unknown };

declare global {
  interface Window {
    _paq?: MatomoQueue;
    gtag?: (...args: unknown[]) => void;
    [GA_CONSENT_GRANTED_FLAG]?: boolean;
  }
}

export type FormSubmitResult = "success" | "validation" | "rate_limited" | "server" | "network";

/**
 * Sends a Matomo event only once Matomo is running. window._paq is created
 * by the script from buildMatomoScript, which runs only after ConsentManager
 * reports consent for the Matomo vendor. Before that this is a no-op: events
 * are not queued, so nothing that happened before consent is sent later.
 * Matomo only; the named helpers below also report to GA4.
 */
export function trackEvent(category: string, action: string, name?: string): void {
  if (typeof window === "undefined" || typeof window._paq?.push !== "function") return;
  window._paq.push(name === undefined ? ["trackEvent", category, action] : ["trackEvent", category, action, name]);
}

/**
 * Sends a GA4 event only while the visitor's GA consent is granted (the flag
 * kept by buildGoogleAnalyticsScript). window.gtag exists before consent,
 * for Consent Mode, so its presence alone is not enough: a call before
 * consent would sit in dataLayer and be sent once gtag.js loads.
 */
function trackGoogleAnalyticsEvent(name: string, params?: Record<string, string>): void {
  if (typeof window === "undefined" || window[GA_CONSENT_GRANTED_FLAG] !== true || typeof window.gtag !== "function") return;
  if (params === undefined) window.gtag("event", name);
  else window.gtag("event", name, params);
}

/** `placement` names where on the page the CTA sits, e.g. "hero" or "footer". */
export function trackCtaClick(placement: string): void {
  trackEvent("CTA", "click", placement);
  trackGoogleAnalyticsEvent("cta_click", { placement });
}

/** GA4 name is application_start: form_start is reserved by GA4 Enhanced Measurement. */
export function trackFormStart(): void {
  trackEvent("Form", "start");
  trackGoogleAnalyticsEvent("application_start");
}

/**
 * Success and each failure kind are separate so a broken LMS setup shows up
 * as a spike in "server". In GA4 success is the recommended generate_lead
 * event and failures are application_error with the same reason.
 */
export function trackFormSubmit(result: FormSubmitResult): void {
  if (result === "success") {
    trackEvent("Form", "submit_success");
    trackGoogleAnalyticsEvent("generate_lead");
  } else {
    trackEvent("Form", "submit_error", result);
    trackGoogleAnalyticsEvent("application_error", { reason: result });
  }
}
