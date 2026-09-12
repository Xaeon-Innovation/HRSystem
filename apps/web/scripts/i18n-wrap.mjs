/**
 * One-shot helper: extract UI strings and wrap them with t().
 * Run from repo: node apps/web/scripts/i18n-wrap.mjs
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../src");
const MODE = process.argv.includes("--wrap") ? "wrap" : "extract";

const SKIP = [
  "/i18n/",
  "locale.ts",
  "language-toggle.tsx",
  ".test.ts",
  ".test.tsx",
  "/animate-ui/",
  "mock.ts",
  "/store.ts",
  "types.ts",
  "parse-resume.ts",
];

const ATTRS = new Set(["placeholder", "title", "aria-label", "alt"]);
const PROPS = new Set([
  "label",
  "title",
  "description",
  "placeholder",
  "confirmLabel",
  "cancelLabel",
  "emptyTitle",
  "emptyHint",
  "hint",
  "blurb",
]);

function walkFiles(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = full.replace(/\\/g, "/");
    if (SKIP.some((s) => rel.includes(s))) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walkFiles(full, out);
    else if (name.endsWith(".tsx") || name.endsWith(".ts")) out.push(full);
  }
  return out;
}

function looksLikeUi(s) {
  const text = s.replace(/\s+/g, " ").trim();
  if (!text) return false;
  if (text.length > 220) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  if (/^(https?:|\/v1\/|mailto:)/.test(text)) return false;
  if (/^(bg-|text-|flex|grid|inline-|hidden|sr-only|h-|w-|min-|max-|sm:|md:|lg:|xl:|dark:|p-|px-|py-|pt-|pb-|pl-|pr-|m-|mx-|my-|gap-|rounded-|border-|shadow-|ring-|overflow-|items-|justify-|col-|row-|font-|leading-|tracking-|whitespace-|line-|truncate|absolute|relative|sticky|fixed|contents|pointer-|select-|z-|opacity-|backdrop-|from-|to-|via-)/.test(text))
    return false;
  if (/^(hsl|rgb|var\(|#[0-9a-fA-F]{3,8})/.test(text)) return false;
  if (text.includes("className") || text.includes("clsx")) return false;
  if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(text)) return false; // snake_case ids
  if (/^[A-Z][A-Z0-9_]+$/.test(text) && text.length > 3) return false; // CONSTANTS
  if (/^[a-z]+[A-Z][A-Za-z0-9]*$/.test(text)) return false; // camelCase identifiers
  if (/^[a-z]{1,2}$/.test(text)) return false;
  const tokens = text.split(/\s+/);
  const tw = tokens.filter(
    (tok) =>
      /[-:]/.test(tok) &&
      /^[a-z0-9:%./[\-_]+$/.test(tok) &&
      !/^[A-Z]/.test(tok),
  );
  if (tokens.length >= 2 && tw.length >= 2) return false;
  if (/^[^a-zA-Z]*$/.test(text)) return false;
  if (text.startsWith("@/") || text.startsWith("next/") || text.startsWith("react"))
    return false;
  if (text.includes("{") && text.includes("}")) return false;
  if (/^\.?\.?\/[A-Za-z0-9_\-./]+$/.test(text)) return false;
  if (text.startsWith("http")) return false;
  if (/^[a-z0-9.-]+@[a-z0-9.-]+$/.test(text)) return false;
  if (/^[\w-]+\.(ts|tsx|js|mjs|css|json)$/.test(text)) return false;
  if (text.startsWith("data-") || text.startsWith("aria-")) return false;
  return true;
}

function tCall(text) {
  return `t(${JSON.stringify(text)})`;
}

function addImport(source) {
  if (/from ["']@\/i18n["']/.test(source)) return source;
  const lines = source.split("\n");
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s/.test(lines[i]) || /^import["']/.test(lines[i])) lastImport = i;
    if (lastImport >= 0 && lines[i] === "" && i > lastImport) break;
  }
  const stmt = `import { t } from "@/i18n";`;
  if (lastImport >= 0) {
    lines.splice(lastImport + 1, 0, stmt);
    return lines.join("\n");
  }
  if (lines[0]?.startsWith('"use client"') || lines[0]?.startsWith("'use client'")) {
    lines.splice(1, 0, "", stmt);
    return lines.join("\n");
  }
  return `${stmt}\n${source}`;
}

const keys = new Set();
const files = walkFiles(SRC);
let changed = 0;

for (const file of files) {
  const original = fs.readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, original, ts.ScriptTarget.Latest, true, kind);
  const replacements = [];

  function skipAttrContext(node) {
    let cur = node.parent;
    while (cur) {
      if (ts.isJsxAttribute(cur)) {
        const name = cur.name.getText(sf);
        if (!ATTRS.has(name) && name !== "label") return true;
        return false;
      }
      if (ts.isJsxOpeningElement(cur) || ts.isJsxSelfClosingElement(cur)) break;
      cur = cur.parent;
    }
    return false;
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      const raw = node.getText(sf);
      const text = raw.replace(/\s+/g, " ").trim();
      if (looksLikeUi(text)) {
        keys.add(text);
        replacements.push({
          start: node.getStart(sf),
          end: node.getEnd(),
          next: `{${tCall(text)}}`,
        });
      }
    }

    if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const name = node.name.getText(sf);
      if (ATTRS.has(name) && looksLikeUi(node.initializer.text)) {
        keys.add(node.initializer.text);
        replacements.push({
          start: node.initializer.getStart(sf),
          end: node.initializer.getEnd(),
          next: `{${tCall(node.initializer.text)}}`,
        });
      }
    }

    if (
      ts.isPropertyAssignment(node) &&
      ts.isIdentifier(node.name) &&
      PROPS.has(node.name.text) &&
      (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))
    ) {
      const text = node.initializer.text;
      if (looksLikeUi(text)) {
        keys.add(text);
        replacements.push({
          start: node.initializer.getStart(sf),
          end: node.initializer.getEnd(),
          next: tCall(text),
        });
      }
    }

    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      looksLikeUi(node.text) &&
      /[A-Z ]/.test(node.text)
    ) {
      const parent = node.parent;
      const inReturn =
        parent && ts.isReturnStatement(parent) && /format\.ts$/.test(file);
      const inDisplayMap =
        parent &&
        ts.isPropertyAssignment(parent) &&
        file.endsWith(".tsx") &&
        ts.isIdentifier(parent.name) &&
        !PROPS.has(parent.name.text) &&
        node.text.includes(" ");
      if (inReturn || inDisplayMap) {
        keys.add(node.text);
        replacements.push({
          start: node.getStart(sf),
          end: node.getEnd(),
          next: tCall(node.text),
        });
      }
    }

    // ternary / && string children in JSX expressions (not className)
    if (ts.isJsxExpression(node) && node.expression && !skipAttrContext(node)) {
      const parent = node.parent;
      const isChild =
        parent &&
        (ts.isJsxElement(parent) || ts.isJsxFragment(parent));
      if (isChild) {
        const collect = (n) => {
          if (!n) return;
          if (ts.isStringLiteral(n) && looksLikeUi(n.text) && /[ A-Z…!?.]/.test(n.text)) {
            keys.add(n.text);
            replacements.push({
              start: n.getStart(sf),
              end: n.getEnd(),
              next: tCall(n.text),
            });
          }
          ts.forEachChild(n, collect);
        };
        collect(node.expression);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);

  replacements.sort((a, b) => b.start - a.start);
  // de-dupe overlapping
  const used = [];
  const unique = [];
  for (const r of replacements) {
    if (used.some((u) => !(r.end <= u.start || r.start >= u.end))) continue;
    used.push(r);
    unique.push(r);
  }

  if (MODE === "wrap" && unique.length) {
    let next = original;
    for (const r of unique) {
      next = next.slice(0, r.start) + r.next + next.slice(r.end);
    }
    next = addImport(next);
    if (next !== original) {
      fs.writeFileSync(file, next);
      changed++;
    }
  }
}

const list = [...keys].sort((a, b) => a.localeCompare(b));
const outFile = path.resolve(__dirname, "../src/i18n/extracted-keys.json");
fs.writeFileSync(outFile, JSON.stringify(list, null, 2));
console.log(`${MODE} keys=${list.length} filesChanged=${changed} wrote=${outFile}`);
