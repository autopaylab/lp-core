type MatomoQueue = { push: (command: unknown[]) => unknown };

declare global {
  interface Window {
    _paq?: MatomoQueue;
  }
}

export type FormSubmitResult = "success" | "validation" | "rate_limited" | "server" | "network";

/**
 * Sends a Matomo event only once Matomo is running. window._paq is created
 * by the script from buildMatomoScript, which runs only after ConsentManager
 * reports consent for the Matomo vendor. Before that this is a no-op: events
 * are not queued, so nothing that happened before consent is sent later.
 */
export function trackEvent(category: string, action: string, name?: string): void {
  if (typeof window === "undefined" || typeof window._paq?.push !== "function") return;
  window._paq.push(name === undefined ? ["trackEvent", category, action] : ["trackEvent", category, action, name]);
}

/** `placement` names where on the page the CTA sits, e.g. "hero" or "footer". */
export function trackCtaClick(placement: string): void {
  trackEvent("CTA", "click", placement);
}

export function trackFormStart(): void {
  trackEvent("Form", "start");
}

/** Success and each failure kind are separate so a broken LMS setup shows up as a spike in "server". */
export function trackFormSubmit(result: FormSubmitResult): void {
  if (result === "success") trackEvent("Form", "submit_success");
  else trackEvent("Form", "submit_error", result);
}
