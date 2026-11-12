import { describe, expect, it } from "vitest";

import { AUTOPAY_CMP_CDID, AUTOPAY_MATOMO_CMP_VENDOR_ID, readConsentManagerConfig } from "./consent-manager";

describe("readConsentManagerConfig", () => {
  it("gives every page autopaylab.com's banner and its Matomo vendor with no setup", () => {
    expect(readConsentManagerConfig({})).toEqual({ cdid: "136af463a10ba", matomoVendorId: "s2589" });
    expect(AUTOPAY_CMP_CDID).toBe("136af463a10ba");
    expect(AUTOPAY_MATOMO_CMP_VENDOR_ID).toBe("s2589");
  });

  it("keeps an explicit vendor id", () => {
    expect(readConsentManagerConfig({ NEXT_PUBLIC_MATOMO_CMP_VENDOR_ID: "s99" })).toEqual({ cdid: AUTOPAY_CMP_CDID, matomoVendorId: "s99" });
  });

  it("never pairs a page's own banner with the standard banner's Matomo vendor", () => {
    expect(readConsentManagerConfig({ NEXT_PUBLIC_CMP_CDID: "abc123" })).toEqual({ cdid: "abc123", matomoVendorId: "" });
    expect(readConsentManagerConfig({ NEXT_PUBLIC_CMP_CDID: "abc123", NEXT_PUBLIC_MATOMO_CMP_VENDOR_ID: "s7" })).toEqual({ cdid: "abc123", matomoVendorId: "s7" });
  });
});
