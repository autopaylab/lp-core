/**
 * Legal wording every Autopay landing-page form uses, as approved by Autopay's legal team (2026-11-12).
 * Pages import these instead of writing their own, so a change from legal is one lp-core release and one
 * pin bump per page. Do not edit the wording here without legal's approval; the tests pin it.
 *
 * The English versions are translations of the Polish originals, confirmed with legal by the process owner.
 */

/** Autopay S.A. privacy policy (PDF), linked from the data-controller notice. */
export const AUTOPAY_PRIVACY_POLICY_URL = "https://autopay.pl/storage/app/media/Autopay_pl/Dokumenty/polityka-prywatnosci.pdf";

/**
 * Marketing consent next to the form's checkbox. The checkbox starts unchecked: a pre-ticked box is not valid
 * consent under the GDPR. Pass it as `consentText` to `createLeadHandler`, so the lead stores what the person saw.
 */
export const AUTOPAY_MARKETING_CONSENT = {
  pl: "Wyrażam zgodę na przetwarzanie moich danych osobowych w zakresie adresu e-mail w celu marketingu bezpośredniego przez Autopay S.A. jako Administratora danych w celu przekazywania mi informacji handlowej, w tym marketingu bezpośredniego o produktach i usługach oferowanych przez Autopay.",
  en: "I consent to the processing of my personal data, limited to my email address, by Autopay S.A. as the data controller for direct marketing purposes, in order to send me commercial information, including direct marketing about products and services offered by Autopay.",
} as const;

export interface DataControllerNotice {
  /** Text before the privacy-policy link. */
  lead: string;
  /** The link text; the link goes to `AUTOPAY_PRIVACY_POLICY_URL`. */
  linkLabel: string;
  /** Text after the link. */
  trail: string;
}

/** Short data-controller (ADO) notice under the form: `lead` + link to the privacy policy + `trail`. */
export const AUTOPAY_DATA_CONTROLLER_NOTICE = {
  pl: {
    lead: "Administratorem Twoich danych osobowych jest Autopay S.A. Szczegółowe informacje dotyczące przetwarzania danych osobowych znajdują się w",
    linkLabel: "Polityce prywatności Autopay S.A.",
    trail: "",
  },
  en: {
    lead: "The controller of your personal data is Autopay S.A. Detailed information on the processing of personal data is available in the",
    linkLabel: "Autopay S.A. Privacy Policy",
    trail: ".",
  },
} as const satisfies Record<"pl" | "en", DataControllerNotice>;
