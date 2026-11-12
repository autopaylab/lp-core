// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildGoogleAnalyticsScript, GA_CONSENT_GRANTED_FLAG } from "./google-analytics-script";

type TestWindow = Window & Record<string, unknown> & { dataLayer?: IArguments[]; cmpmngr?: { getVendorConsent: (id: string) => boolean } };
const win = window as unknown as TestWindow;

const MEASUREMENT_ID = "G-KHZLVW1KH1";
const VENDOR_ID = "s26";
let hasVendorConsent = false;

const run = () => new Function(buildGoogleAnalyticsScript(MEASUREMENT_ID, VENDOR_ID))();
const commands = () => (win.dataLayer ?? []).map((args) => Array.from(args));
const gtagScripts = () => Array.from(document.querySelectorAll("script")).filter((s) => s.src.includes("googletagmanager.com"));

beforeEach(() => {
  vi.useFakeTimers();
  hasVendorConsent = false;
  win.cmpmngr = { getVendorConsent: (id) => id === VENDOR_ID && hasVendorConsent };
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  for (const key of ["dataLayer", "gtag", "cmpmngr", GA_CONSENT_GRANTED_FLAG, `ga-disable-${MEASUREMENT_ID}`]) delete win[key];
  document.head.innerHTML = "";
});

describe("buildGoogleAnalyticsScript", () => {
  it("sets the Consent Mode default, all denied, before anything else", () => {
    run();
    expect(commands()).toEqual([
      ["consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", wait_for_update: 500 }],
    ]);
    expect(win[GA_CONSENT_GRANTED_FLAG]).toBe(false);
  });

  it("requests nothing from Google before consent (Basic mode)", () => {
    run();
    vi.advanceTimersByTime(5000);
    expect(gtagScripts()).toHaveLength(0);
    expect(commands()).toHaveLength(1);
  });

  it("does not start when ConsentManager has not loaded", () => {
    delete win.cmpmngr;
    run();
    vi.advanceTimersByTime(5000);
    expect(gtagScripts()).toHaveLength(0);
  });

  it("grants analytics_storage only, then loads gtag.js once, after vendor consent", () => {
    run();
    hasVendorConsent = true;
    vi.advanceTimersByTime(500);
    const cmds = commands();
    expect(cmds[1]).toEqual([
      "consent",
      "update",
      { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" },
    ]);
    expect(cmds[2]?.[0]).toBe("js");
    expect(cmds[3]).toEqual(["config", MEASUREMENT_ID]);
    expect(gtagScripts().map((s) => s.src)).toEqual([`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`]);
    expect(win[GA_CONSENT_GRANTED_FLAG]).toBe(true);
    vi.advanceTimersByTime(5000);
    expect(gtagScripts()).toHaveLength(1);
    expect(commands()).toHaveLength(4);
  });

  it("denies analytics_storage and disables GA when consent is withdrawn, re-enables without reloading gtag.js", () => {
    run();
    hasVendorConsent = true;
    vi.advanceTimersByTime(500);
    hasVendorConsent = false;
    vi.advanceTimersByTime(500);
    expect(commands().at(-1)).toEqual(["consent", "update", { analytics_storage: "denied" }]);
    expect(win[`ga-disable-${MEASUREMENT_ID}`]).toBe(true);
    expect(win[GA_CONSENT_GRANTED_FLAG]).toBe(false);

    hasVendorConsent = true;
    vi.advanceTimersByTime(500);
    expect(commands().at(-1)?.[2]).toMatchObject({ analytics_storage: "granted", ad_storage: "denied" });
    expect(win[`ga-disable-${MEASUREMENT_ID}`]).toBe(false);
    expect(win[GA_CONSENT_GRANTED_FLAG]).toBe(true);
    expect(gtagScripts()).toHaveLength(1);
    expect(commands().filter(([name]) => name === "config")).toHaveLength(1);
  });
});
