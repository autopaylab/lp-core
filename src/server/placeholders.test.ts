import { describe, expect, it } from "vitest";

import { assertNoPlaceholdersWhenPublic } from "./placeholders";

describe("assertNoPlaceholdersWhenPublic", () => {
  const content = { hero: { title: "Real title" }, faq: [{ answer: "PLACEHOLDER: legal to confirm" }] };

  it("does nothing while the site is not public", () => {
    expect(() => assertNoPlaceholdersWhenPublic(content, false)).not.toThrow();
  });

  it("throws, naming the spot, when the site is public and content has a placeholder", () => {
    expect(() => assertNoPlaceholdersWhenPublic(content, true)).toThrow(/PLACEHOLDER: legal to confirm/);
  });

  it("passes clean content", () => {
    expect(() => assertNoPlaceholdersWhenPublic({ hero: { title: "Real title" } }, true)).not.toThrow();
  });
});
