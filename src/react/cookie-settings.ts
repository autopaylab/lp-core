type ConsentManagerApi = (command: string, ...args: unknown[]) => unknown;

declare global {
  interface Window {
    __cmp?: ConsentManagerApi;
  }
}

/**
 * Reopens the ConsentManager panel so visitors can change their choice
 * (the "Cookie settings" link in a footer). `__cmp("showScreen")` is
 * ConsentManager's documented call for this; it only exists once the CMP
 * script (CookieConsentScript) has loaded, so a click before that, or with
 * the CMP blocked, is logged instead of failing silently.
 */
export function openCookieSettings(): void {
  if (typeof window !== "undefined" && typeof window.__cmp === "function") {
    window.__cmp("showScreen");
    return;
  }
  console.warn("[lp-core] Cookie settings unavailable: ConsentManager (window.__cmp) has not loaded.");
}
