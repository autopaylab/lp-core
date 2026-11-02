import { describe, expect, it } from "vitest";

import { assertNoPlaceholdersWhenPublic } from "./placeholders";

describe("assertNoPlaceholdersWhenPublic", () => {
  const content = { hero: { title: "Real title" }, faq: [{ answer: "PLACEHOLDER: legal to confirm" }] };

  it("does nothing while the site is not public", () => {
    expect(() => assertNoPlaceholdersWhenPublic(content, false)).not.toThrow();
  });

  it("throws, naming the spot, when the site is public and content has a placeholder", () => {
    expect(() => assertNoPlaceholdersWhenPublic(content, true)).toThrow(/faq\.0\.answer.*PLACEHOLDER: legal to confirm/);
  });

  it("catches the template's bracketed marker and placeholder image paths", () => {
    expect(() => assertNoPlaceholdersWhenPublic({ hero: { title: "[PLACEHOLDER: headline]" } }, true)).toThrow(/hero\.title/);
    expect(() => assertNoPlaceholdersWhenPublic({ hero: { image: { src: "/placeholders/hero.svg" } } }, true)).toThrow(
      /hero\.image\.src/,
    );
  });

  it("passes clean content", () => {
    expect(() => assertNoPlaceholdersWhenPublic({ hero: { title: "Real title" } }, true)).not.toThrow();
  });

  it("ignores the word in keys and in ordinary text", () => {
    // ai.autopay.pl, 2026-11-02: a field named messagePlaceholder blocked a launch-ready page.
    const clean = {
      form: { messagePlaceholder: "Platforma sklepu, rozwiązania", emailPlaceholder: "np. jan@sklep.pl" },
      faq: [{ answer: "The placeholder text in the field shows an example." }],
    };
    expect(() => assertNoPlaceholdersWhenPublic(clean, true)).not.toThrow();
  });

  it("handles shared and circular references without looping", () => {
    const shared = { label: "OK" };
    const looped: Record<string, unknown> = { a: shared, b: shared };
    looped.self = looped;
    expect(() => assertNoPlaceholdersWhenPublic(looped, true)).not.toThrow();
  });
});
