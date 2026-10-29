const PLACEHOLDER_PATTERN = /placeholder/i;

/**
 * Fails the build if any content still contains a placeholder once the site
 * is about to go public. While the site is behind the launch gate,
 * placeholders stay visible on purpose, so reviewers see exactly what is
 * still missing:
 *
 *   assertNoPlaceholdersWhenPublic(content, isSitePublic());
 */
export function assertNoPlaceholdersWhenPublic(content: unknown, isPublic: boolean): void {
  if (!isPublic) return;
  const serialized = JSON.stringify(content) ?? "";
  const match = serialized.match(new RegExp(`.{0,60}${PLACEHOLDER_PATTERN.source}.{0,60}`, "i"));
  if (match) {
    throw new Error(
      `[lp-core] SITE_IS_PUBLIC is "true" but page content still contains a placeholder near: ${match[0]}. ` +
        "Fill it in before the public launch.",
    );
  }
}
