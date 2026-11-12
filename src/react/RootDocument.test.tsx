import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MAIN_CONTENT_ID, RootDocument } from "./RootDocument";

const render = (env: Record<string, string | undefined>, locale = "pl", bannerLocale?: "pl" | "en") =>
  renderToStaticMarkup(
    <RootDocument locale={locale} bannerLocale={bannerLocale} skipLinkLabel="Przejdź do treści" env={env}>
      <main id={MAIN_CONTENT_ID}>content</main>
    </RootDocument>,
  );

describe("RootDocument", () => {
  it("renders the consent banner script as the first child of body", () => {
    const html = render({});
    const bodyStart = html.indexOf("<body");
    const firstScript = html.indexOf("<script", bodyStart);
    const firstChild = html.indexOf(">", bodyStart) + 1;
    expect(firstScript).toBe(firstChild);
    expect(html).toContain('<html lang="pl">');
  });

  it("adds consent-gated Matomo only when both site id and vendor id are set", () => {
    expect(render({})).not.toContain("matomo-analytics");
    expect(render({ NEXT_PUBLIC_MATOMO_SITE_ID: "12" })).not.toContain("matomo-analytics");
    const html = render({ NEXT_PUBLIC_MATOMO_SITE_ID: "12", NEXT_PUBLIC_MATOMO_CMP_VENDOR_ID: "s2589" });
    expect(html).toContain("matomo-analytics");
    expect(html).toContain("getVendorConsent(\"s2589\")");
    expect(html).toContain("https://piwik.blue.pl");
  });

  it("adds GA4 only when both measurement id and vendor id are set", () => {
    expect(render({})).not.toContain("google-analytics");
    expect(render({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-KHZLVW1KH1" })).not.toContain("google-analytics");
    expect(render({ NEXT_PUBLIC_GA_CMP_VENDOR_ID: "s26" })).not.toContain("google-analytics");
    const html = render({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-KHZLVW1KH1", NEXT_PUBLIC_GA_CMP_VENDOR_ID: "s26" });
    expect(html).toContain('id="google-analytics"');
    expect(html).toContain('"G-KHZLVW1KH1"');
    expect(html).toContain("getVendorConsent(vendorId)");
  });

  it("sets the GA consent default in <head>, before the banner, which stays the first child of body", () => {
    const html = render({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-KHZLVW1KH1", NEXT_PUBLIC_GA_CMP_VENDOR_ID: "s26" });
    const consentDefault = html.indexOf('"consent", "default"');
    const bodyStart = html.indexOf("<body");
    expect(html.indexOf("<head>")).toBeLessThan(consentDefault);
    expect(consentDefault).toBeLessThan(bodyStart);
    expect(html.indexOf("<script", bodyStart)).toBe(html.indexOf(">", bodyStart) + 1);
    expect(html.indexOf("cmp_cdid", bodyStart)).toBeGreaterThan(bodyStart);
  });

  it("fails to render on a malformed GA measurement id", () => {
    expect(() => render({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "UA-1-1", NEXT_PUBLIC_GA_CMP_VENDOR_ID: "s26" })).toThrow(/NEXT_PUBLIC_GA_MEASUREMENT_ID/);
  });

  it("keeps Matomo unchanged alongside GA4", () => {
    const matomoOnly = render({ NEXT_PUBLIC_MATOMO_SITE_ID: "12", NEXT_PUBLIC_MATOMO_CMP_VENDOR_ID: "s2589" });
    const both = render({
      NEXT_PUBLIC_MATOMO_SITE_ID: "12",
      NEXT_PUBLIC_MATOMO_CMP_VENDOR_ID: "s2589",
      NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-KHZLVW1KH1",
      NEXT_PUBLIC_GA_CMP_VENDOR_ID: "s26",
    });
    const matomoScript = (html: string) => html.slice(html.indexOf('id="matomo-analytics"'), html.indexOf("</script>", html.indexOf('id="matomo-analytics"')));
    expect(matomoScript(both)).toBe(matomoScript(matomoOnly));
    expect(matomoOnly).not.toContain("google-analytics");
  });

  it("renders a skip link to the main content and the page's children", () => {
    const html = render({});
    expect(html).toContain(`href="#${MAIN_CONTENT_ID}"`);
    expect(html).toContain("Przejdź do treści");
    expect(html).toContain('<main id="main">content</main>');
  });

  it("sets the banner language only when asked, otherwise lets the banner read the client's stored choice", () => {
    expect(render({}, "pl", "pl")).toContain('window.cmp_setlang = "PL"');
    expect(render({}, "en", "en")).toContain('window.cmp_setlang = "EN"');
    const html = render({}, "en");
    expect(html).not.toContain('cmp_setlang = "EN"');
    expect(html).toContain('localStorage.getItem("autopaylab-locale")');
    expect(html).toContain('<html lang="en">');
  });

  it("accepts a client component as the skip link label", () => {
    const Label = () => <span>Skip</span>;
    const html = renderToStaticMarkup(
      <RootDocument locale="en" skipLinkLabel={<Label />} env={{}}>
        <main id={MAIN_CONTENT_ID}>content</main>
      </RootDocument>,
    );
    expect(html).toContain("<span>Skip</span>");
  });
});
