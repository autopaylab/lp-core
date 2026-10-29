import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MAIN_CONTENT_ID, RootDocument } from "./RootDocument";

const render = (env: Record<string, string | undefined>, locale = "pl") =>
  renderToStaticMarkup(
    <RootDocument locale={locale} skipLinkLabel="Przejdź do treści" env={env}>
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

  it("renders a skip link to the main content and the page's children", () => {
    const html = render({});
    expect(html).toContain(`href="#${MAIN_CONTENT_ID}"`);
    expect(html).toContain("Przejdź do treści");
    expect(html).toContain('<main id="main">content</main>');
  });

  it("passes an unknown locale to <html lang> but not to the banner", () => {
    expect(() => render({}, "de")).not.toThrow();
    expect(render({}, "de")).toContain('<html lang="de">');
  });
});
