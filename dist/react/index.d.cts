import * as react from 'react';
import { ReactNode } from 'react';
import { E as EnvVars } from '../site-config-CegvYjda.cjs';

type MatomoQueue = {
    push: (command: unknown[]) => unknown;
};
declare global {
    interface Window {
        _paq?: MatomoQueue;
    }
}
type FormSubmitResult = "success" | "validation" | "rate_limited" | "server" | "network";
/**
 * Sends a Matomo event only once Matomo is running. window._paq is created
 * by the script from buildMatomoScript, which runs only after ConsentManager
 * reports consent for the Matomo vendor. Before that this is a no-op: events
 * are not queued, so nothing that happened before consent is sent later.
 */
declare function trackEvent(category: string, action: string, name?: string): void;
/** `placement` names where on the page the CTA sits, e.g. "hero" or "footer". */
declare function trackCtaClick(placement: string): void;
declare function trackFormStart(): void;
/** Success and each failure kind are separate so a broken LMS setup shows up as a spike in "server". */
declare function trackFormSubmit(result: FormSubmitResult): void;

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
declare function openCookieSettings(): void;

/**
 * Matomo, consent-gated via ConsentManager's proprietary API:
 * window.cmpmngr.getVendorConsent(vendorId). Learned the hard way on the
 * autopaylab.com landing page. Read this before changing the gating
 * mechanism, because the two more "standard" approaches both looked right
 * and were both silently dead in production:
 *
 * 1. A window.tcfapi (IAB TCF v2) listener. Dead on arrival whenever the
 *    ConsentManager account has tcfcompliant: 0 in its delivered config
 *    (check the response body of its cmp.php request): window.tcfapi never
 *    becomes anything but ConsentManager's permanent stub in that case, so a
 *    listener on it never fires, whatever the visitor consents to.
 * 2. ConsentManager's declarative script-blocking markup (type="text/plain"
 *    + data-cmp-vendor="<id>" on the <script> tag). getVendorConsent can
 *    report true for that id while this never unblocks the tag: the
 *    declarative blocking is driven by a separate window.cmpblocker module
 *    that isn't loaded on every account/config.
 *
 * getVendorConsent is the one thing that reliably worked, so this polls it
 * on an interval instead of trusting an event or declarative markup.
 *
 * The vendor id (cmpVendorId) is a different thing from the banner's own
 * cmp_cdid (set on <CookieConsentScript> in the design system): cmp_cdid
 * identifies which ConsentManager banner config runs at all; the vendor id
 * lives inside that config and is what actually gates Matomo. Whether the
 * Matomo vendor is enabled inside a given cmp_cdid config is per account:
 * ask whoever administers ConsentManager, don't assume.
 */
declare function buildMatomoScript(matomoSiteId: string, matomoOrigin: string, cmpVendorId: string): string;

/** Id of the <main> element every page must render, target of the skip link. */
declare const MAIN_CONTENT_ID = "main";
interface RootDocumentProps {
    /** The page's language, written to <html lang>. */
    locale: string;
    /** Label of the skip link, in the page's language, e.g. "Przejdź do treści". */
    skipLinkLabel: string;
    children: ReactNode;
    /** Defaults to process.env. */
    env?: EnvVars;
    /** Extra classes for <body>, if the page needs them. */
    bodyClassName?: string;
}
/**
 * The <html>/<body> shell every landing page renders from its root layout:
 *
 *   export default function RootLayout({ children }) {
 *     return <RootDocument locale="pl" skipLinkLabel="Przejdź do treści">{children}</RootDocument>;
 *   }
 *
 * Keeps three things in one place so no landing page can get them wrong:
 * the consent banner as the very first child of <body> (before anything can
 * set a cookie or run a tracker), consent-gated Matomo, and the skip link.
 *
 * Matomo renders only when both NEXT_PUBLIC_MATOMO_SITE_ID and
 * NEXT_PUBLIC_MATOMO_CMP_VENDOR_ID are set, so a page that hasn't wired up
 * analytics yet doesn't ship a script that immediately no-ops.
 */
declare function RootDocument({ locale, skipLinkLabel, children, env, bodyClassName }: RootDocumentProps): react.JSX.Element;

export { type FormSubmitResult, MAIN_CONTENT_ID, RootDocument, type RootDocumentProps, buildMatomoScript, openCookieSettings, trackCtaClick, trackEvent, trackFormStart, trackFormSubmit };
