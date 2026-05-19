#!/usr/bin/env node
/**
 * Anti-voseo lint para sri-cli.
 * Falla si encuentra formas voseo en archivos español neutro.
 *
 * Aplica a: .md, .ts strings literales en español, .json strings.
 * Excluye: LICENSE, THIRD_PARTY_NOTICES.md (textos en inglés), node_modules, dist.
 */

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const VOSEO_PATTERNS = [
  /\bvos\b/gi,
  /\bsos\b/gi,
  /\btenés\b/gi,
  /\bquerés\b/gi,
  /\bpodés\b/gi,
  /\bhacés\b/gi,
  /\bsabés\b/gi,
  /\bjugás\b/gi,
  /\bsentís\b/gi,
  /\bseguís\b/gi,
  /\bperdés\b/gi,
  /\bmirá\b/gi,
  /\bhablá\b/gi,
  /\bandá\b/gi,
  /\bborrá\b/gi,
  /\bsuscribite\b/gi,
];

const EXCLUDED_FILES = new Set([
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "scripts/check-voseo.mjs",
]);

const EXCLUDED_DIRS = ["node_modules", "dist", ".git", "coverage", ".turbo"];

function listTrackedFiles() {
  const output = execSync("git ls-files", { encoding: "utf8" });
  return output
    .split("\n")
    .filter((f) => f.trim() && f.match(/\.(md|ts|tsx|mts|cts|json|js|mjs)$/))
    .filter((f) => !EXCLUDED_FILES.has(f))
    .filter((f) => !EXCLUDED_DIRS.some((d) => f.startsWith(`${d}/`)));
}

function scanFile(path) {
  const content = readFileSync(path, "utf8");
  const findings = [];
  for (const pattern of VOSEO_PATTERNS) {
    const matches = content.matchAll(pattern);
    for (const m of matches) {
      const lineNum = content.slice(0, m.index).split("\n").length;
      findings.push({ pattern: pattern.source, match: m[0], line: lineNum });
    }
  }
  return findings;
}

const files = listTrackedFiles();
let totalFindings = 0;

for (const file of files) {
  const findings = scanFile(file);
  if (findings.length > 0) {
    console.error(`\n❌ ${file}`);
    for (const f of findings) {
      console.error(`   línea ${f.line}: "${f.match}" (patrón ${f.pattern})`);
    }
    totalFindings += findings.length;
  }
}

if (totalFindings > 0) {
  console.error(
    `\n❌ ${totalFindings} ocurrencia(s) de voseo encontradas. Usa tuteo neutro.`,
  );
  console.error(
    "   Equivalencias: vos→tú, podés→puedes, tenés→tienes, querés→quieres, etc.",
  );
  process.exit(1);
}

console.log("✓ Sin voseo detectado en archivos del repo.");
