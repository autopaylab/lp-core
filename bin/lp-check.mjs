#!/usr/bin/env node
/**
 * lp-check: verifies a landing page repository against the Autopay landing
 * page ground rules. Run from the landing page's root, in CI and locally:
 *
 *   npx lp-check
 *
 * Exits 1 with every violation listed. Pure Node, no dependencies, so it
 * works wherever the landing page's own tooling works.
 *
 * Rules (see lp-foundation/docs/ARCHITECTURE.md):
 *   1. The design system and lp-core are pinned to release tags, never to a
 *      branch or a commit hash, so every deploy is reproducible.
 *   2. .env.example exists and holds no values for non-public variables, so a
 *      secret can't be committed by mistake under the guise of an example.
 *   3. public/.well-known/security.txt exists.
 *   4. src/ declares no fonts of its own: no font-family, no @font-face, no
 *      font CDN, no next/font. Fonts come from the design system only.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const problems = [];

const PINNED_PACKAGES = ["@autopaylab/landing-design-system", "@autopaylab/lp-core"];
const TAG_PIN = /^github:autopaylab\/[a-z0-9-]+#v\d+\.\d+\.\d+$/;

function checkPins() {
  const path = join(root, "package.json");
  if (!existsSync(path)) {
    problems.push("package.json not found; run lp-check from the landing page's root.");
    return;
  }
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const name of PINNED_PACKAGES) {
    const spec = deps[name];
    if (!spec) {
      problems.push(`package.json: ${name} is not a dependency.`);
    } else if (!TAG_PIN.test(spec)) {
      problems.push(`package.json: ${name} must be pinned to a release tag (github:autopaylab/<repo>#vX.Y.Z), got ${JSON.stringify(spec)}.`);
    }
  }
}

function checkEnvExample() {
  const path = join(root, ".env.example");
  if (!existsSync(path)) {
    problems.push(".env.example is missing. Every variable the page reads must be listed there.");
    return;
  }
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) {
      problems.push(`.env.example:${index + 1}: expected KEY=value, got ${JSON.stringify(trimmed)}.`);
      return;
    }
    const [, key, value] = match;
    if (value !== "" && !key.startsWith("NEXT_PUBLIC_")) {
      problems.push(`.env.example:${index + 1}: ${key} has a value. Only NEXT_PUBLIC_* variables may carry a default here; everything else must be empty.`);
    }
  });
}

function checkSecurityTxt() {
  if (!existsSync(join(root, "public", ".well-known", "security.txt"))) {
    problems.push("public/.well-known/security.txt is missing.");
  }
}

const SOURCE_EXTENSIONS = new Set([".css", ".scss", ".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const FONT_RULES = [
  { pattern: /font-family\s*:/, why: "declares a font-family; fonts come from the design system only" },
  { pattern: /@font-face/, why: "declares an @font-face; fonts come from the design system only" },
  { pattern: /fonts\.googleapis\.com|fonts\.gstatic\.com/, why: "loads a font from a CDN, which the CSP blocks and the rules forbid" },
  { pattern: /@fontsource\//, why: "imports a font package directly; the design system owns font loading" },
  { pattern: /["']next\/font/, why: "uses next/font; the design system owns font loading" },
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== "node_modules") yield* walk(path);
    } else if (SOURCE_EXTENSIONS.has(path.slice(path.lastIndexOf(".")))) {
      yield path;
    }
  }
}

function checkFonts() {
  const src = join(root, "src");
  if (!existsSync(src)) {
    problems.push("src/ is missing.");
    return;
  }
  for (const file of walk(src)) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const rule of FONT_RULES) {
        if (rule.pattern.test(line)) {
          problems.push(`${relative(root, file)}:${index + 1}: ${rule.why}.`);
        }
      }
    });
  }
}

checkPins();
checkEnvExample();
checkSecurityTxt();
checkFonts();

if (problems.length > 0) {
  console.error(`lp-check: ${problems.length} problem(s)\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error("");
  process.exit(1);
}
console.log("lp-check: all ground rules pass.");
