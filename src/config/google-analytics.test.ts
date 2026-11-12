import { describe, expect, it } from "vitest";

import { readGoogleAnalyticsConfig } from "./google-analytics";

describe("readGoogleAnalyticsConfig", () => {
  it("is off unless both the measurement id and the ConsentManager vendor id are set", () => {
    expect(readGoogleAnalyticsConfig({})).toBeNull();
    expect(readGoogleAnalyticsConfig({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-KHZLVW1KH1" })).toBeNull();
    expect(readGoogleAnalyticsConfig({ NEXT_PUBLIC_GA_CMP_VENDOR_ID: "s26" })).toBeNull();
    expect(readGoogleAnalyticsConfig({ NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-KHZLVW1KH1", NEXT_PUBLIC_GA_CMP_VENDOR_ID: "s26" })).toEqual({
      measurementId: "G-KHZLVW1KH1",
      cmpVendorId: "s26",
    });
  });

  it("fails loudly on a malformed measurement id, even without a vendor id", () => {
    for (const bad of ["KHZLVW1KH1", "UA-12345-1", "G-", "g-khzlvw1kh1", "G-KHZ LVW", 'G-1");alert(1);("']) {
      expect(() => readGoogleAnalyticsConfig({ NEXT_PUBLIC_GA_MEASUREMENT_ID: bad })).toThrow(/NEXT_PUBLIC_GA_MEASUREMENT_ID/);
      expect(() => readGoogleAnalyticsConfig({ NEXT_PUBLIC_GA_MEASUREMENT_ID: bad, NEXT_PUBLIC_GA_CMP_VENDOR_ID: "s26" })).toThrow(
        /NEXT_PUBLIC_GA_MEASUREMENT_ID/,
      );
    }
  });
});
