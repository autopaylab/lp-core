// Markers the templates and the skill write for content nobody has supplied yet: "[PLACEHOLDER: ...]" text and
// files under /placeholders/. Only these count, and only in values: a field *named* messagePlaceholder is not a gap.
const PLACEHOLDER_MARKERS = [/PLACEHOLDER:/i, /\/placeholders\//];

interface Found {
  path: string;
  value: string;
}

function findPlaceholder(value: unknown, path: string, seen: WeakSet<object>): Found | null {
  if (typeof value === "string") {
    return PLACEHOLDER_MARKERS.some((marker) => marker.test(value)) ? { path, value } : null;
  }
  if (value === null || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);
  const entries = Array.isArray(value) ? value.map((item, index) => [String(index), item] as const) : Object.entries(value);
  for (const [key, child] of entries) {
    const found = findPlaceholder(child, path ? `${path}.${key}` : key, seen);
    if (found) return found;
  }
  return null;
}

/**
 * Fails the build if any content still contains a placeholder once the site
 * is about to go public. While the site is behind the launch gate,
 * placeholders stay visible on purpose, so reviewers see exactly what is
 * still missing:
 *
 *   assertNoPlaceholdersWhenPublic(content, isSitePublic());
 *
 * A placeholder is a string value containing "PLACEHOLDER:" or a "/placeholders/" path. Keys are never checked,
 * so content fields may be named after what they hold (e.g. `messagePlaceholder` for an input's hint text).
 */
export function assertNoPlaceholdersWhenPublic(content: unknown, isPublic: boolean): void {
  if (!isPublic) return;
  const found = findPlaceholder(content, "", new WeakSet());
  if (found) {
    throw new Error(
      `[lp-core] SITE_IS_PUBLIC is "true" but page content still contains a placeholder at ${found.path || "(root)"}: ` +
        `${JSON.stringify(found.value.slice(0, 120))}. Fill it in before the public launch.`,
    );
  }
}
