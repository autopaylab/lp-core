import { CookieConsentScript } from "@autopaylab/landing-design-system/organisms";
import type { ReactNode } from "react";

import { DEFAULT_MATOMO_ORIGIN } from "../config/security-headers";
import type { EnvVars } from "../config/site-config";
import { buildMatomoScript } from "./matomo-script";

/** Id of the <main> element every page must render, target of the skip link. */
export const MAIN_CONTENT_ID = "main";

const SKIP_LINK_CLASS = "lp-skip-link";

// Plain CSS rather than Tailwind utilities: a landing page's Tailwind build
// does not scan this package, so utility classes used here would never be
// generated. Inline <style> is allowed by the CSP (style-src 'unsafe-inline').
const SKIP_LINK_CSS = `
.${SKIP_LINK_CLASS}{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}
.${SKIP_LINK_CLASS}:focus{position:fixed;left:1rem;top:1rem;z-index:50;width:auto;height:auto;overflow:visible;padding:.5rem 1rem;border-radius:.5rem;background:var(--background,#fff);color:var(--foreground,#000);box-shadow:0 10px 30px rgba(0,0,0,.15);outline:2px solid currentColor}
`.trim();

export interface RootDocumentProps {
  /** The page's language, written to <html lang>. */
  locale: string;
  /**
   * Label of the skip link, in the page's language, e.g. "Przejdź do treści".
   * A client component is fine here for pages that switch language on the
   * client (the shell itself is a server component).
   */
  skipLinkLabel: ReactNode;
  /**
   * Language of the consent banner. Set it on pages that render each locale
   * at its own URL. Leave it out on pages that switch language on the client
   * and store the choice in localStorage under the design system's key
   * ("autopaylab-locale"); the banner then reads that key itself.
   */
  bannerLocale?: "pl" | "en";
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
export function RootDocument({ locale, skipLinkLabel, bannerLocale, children, env = process.env, bodyClassName }: RootDocumentProps) {
  const matomoSiteId = env.NEXT_PUBLIC_MATOMO_SITE_ID ?? "";
  const matomoOrigin = env.NEXT_PUBLIC_MATOMO_ORIGIN || DEFAULT_MATOMO_ORIGIN;
  const matomoCmpVendorId = env.NEXT_PUBLIC_MATOMO_CMP_VENDOR_ID ?? "";
  // Leave unset to use CookieConsentScript's own default (autopaylab.com's
  // cdid). Only set it once the right ConsentManager cdid for this page's
  // actual domain has been confirmed. See the go-live checklist.
  const cmpCdid = env.NEXT_PUBLIC_CMP_CDID || undefined;

  return (
    <html lang={locale}>
      <body className={bodyClassName}>
        <CookieConsentScript cmpCdid={cmpCdid} locale={bannerLocale} />
        {matomoSiteId && matomoCmpVendorId ? (
          <script id="matomo-analytics" dangerouslySetInnerHTML={{ __html: buildMatomoScript(matomoSiteId, matomoOrigin, matomoCmpVendorId) }} />
        ) : null}
        <style dangerouslySetInnerHTML={{ __html: SKIP_LINK_CSS }} />
        <a href={`#${MAIN_CONTENT_ID}`} className={SKIP_LINK_CLASS}>
          {skipLinkLabel}
        </a>
        {children}
      </body>
    </html>
  );
}
