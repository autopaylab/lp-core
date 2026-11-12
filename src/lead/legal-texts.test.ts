import { describe, expect, it } from "vitest";

import { AUTOPAY_DATA_CONTROLLER_NOTICE, AUTOPAY_MARKETING_CONSENT, AUTOPAY_PRIVACY_POLICY_URL } from "./legal-texts";

// The wording is legal's, not ours: a change here needs legal's approval first (2026-11-12).
describe("legal texts", () => {
  it("keeps the marketing consent exactly as approved by legal", () => {
    expect(AUTOPAY_MARKETING_CONSENT.pl).toBe(
      "Wyrażam zgodę na przetwarzanie moich danych osobowych w zakresie adresu e-mail w celu marketingu bezpośredniego przez Autopay S.A. jako Administratora danych w celu przekazywania mi informacji handlowej, w tym marketingu bezpośredniego o produktach i usługach oferowanych przez Autopay.",
    );
  });

  it("keeps the data-controller notice exactly as approved by legal, with the privacy-policy PDF", () => {
    const { lead, linkLabel, trail } = AUTOPAY_DATA_CONTROLLER_NOTICE.pl;
    expect(`${lead} ${linkLabel}${trail}`).toBe(
      "Administratorem Twoich danych osobowych jest Autopay S.A. Szczegółowe informacje dotyczące przetwarzania danych osobowych znajdują się w Polityce prywatności Autopay S.A.",
    );
    expect(AUTOPAY_PRIVACY_POLICY_URL.pl).toBe("https://autopay.pl/storage/app/media/Autopay_pl/Dokumenty/polityka-prywatnosci.pdf");
    expect(AUTOPAY_PRIVACY_POLICY_URL.en).toBe("https://autopay.eu/storage/app/media/Autopay_pl/Dokumenty/privacy_policy.pdf");
  });

  it("has an English version of each text, with no placeholder left", () => {
    for (const text of [AUTOPAY_MARKETING_CONSENT.en, AUTOPAY_DATA_CONTROLLER_NOTICE.en.lead, AUTOPAY_DATA_CONTROLLER_NOTICE.en.linkLabel]) {
      expect(text).toMatch(/Autopay/);
      expect(text).not.toMatch(/PLACEHOLDER/i);
    }
  });
});
