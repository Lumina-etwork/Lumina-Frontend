#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const repoRoot = process.cwd();
const coverageInput = process.argv[2] || process.env.NODE_V8_COVERAGE || 'coverage/tmp';
const threshold = Number(process.env.COVERAGE_LINES_THRESHOLD ?? process.env.COVERAGE_THRESHOLD ?? 50);
const outputPath = process.env.COVERAGE_GATE_OUTPUT || 'coverage/coverage-gate.json';

function fail(message) {
  console.error(`Coverage gate failed: ${message}`);
  process.exitCode = 1;
}

function pct(covered, total) {
  return total === 0 ? 100 : (covered / total) * 100;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) walk(path, files);
    else if (entry.endsWith('.json')) files.push(path);
  }
  return files;
}

function normalizeFileUrl(url) {
  if (!url.startsWith('file://')) return null;
  const decoded = decodeURIComponent(new URL(url).pathname);
  return decoded.startsWith(repoRoot) ? decoded : null;
}

function isSourceFile(path) {
  const rel = relative(repoRoot, path).replaceAll('\\', '/');
  return (
    rel.startsWith('src/') &&
    /\.(ts|tsx|js|jsx)$/.test(rel) &&
    !rel.includes('/__tests__/') &&
    !rel.endsWith('.test.ts') &&
    !rel.endsWith('.test.tsx') &&
    !rel.endsWith('.d.ts')
  );
}

function mergeRanges(ranges) {
  const sorted = ranges.filter((r) => r.count > 0).sort((a, b) => a.startOffset - b.startOffset);
  const merged = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (!last || range.startOffset > last.endOffset) merged.push({ ...range });
    else last.endOffset = Math.max(last.endOffset, range.endOffset);
  }
  return merged;
}

function summarizeV8Coverage(dir) {
  const files = new Map();
  for (const jsonFile of walk(resolve(dir))) {
    const report = readJson(jsonFile);
    for (const script of report.result ?? []) {
      const path = normalizeFileUrl(script.url || '');
      if (!path || !isSourceFile(path)) continue;
      const rel = relative(repoRoot, path).replaceAll('\\', '/');
      const ranges = [];
      let total = 0;
      for (const fn of script.functions ?? []) {
        for (const range of fn.ranges ?? []) {
          total += Math.max(0, range.endOffset - range.startOffset);
          ranges.push(range);
        }
      }
      const covered = mergeRanges(ranges).reduce((sum, range) => sum + Math.max(0, range.endOffset - range.startOffset), 0);
      const existing = files.get(rel) || { covered: 0, total: 0 };
      existing.covered += covered;
      existing.total += total;
      files.set(rel, existing);
    }
  }
  return files;
}

function summarizeIstanbul(summaryFile) {
  const summary = readJson(summaryFile);
  const files = new Map();
  for (const [key, value] of Object.entries(summary)) {
    if (key === 'total' || !value?.lines) continue;
    const rel = relative(repoRoot, resolve(key)).replaceAll('\\', '/');
    files.set(rel, { covered: value.lines.covered, total: value.lines.total });
  }
  return files;
}

const summaryFile = existsSync(coverageInput) && statSync(coverageInput).isDirectory()
  ? join(coverageInput, 'coverage-summary.json')
  : coverageInput;
const files = existsSync(summaryFile) ? summarizeIstanbul(summaryFile) : summarizeV8Coverage(coverageInput);
const totals = [...files.values()].reduce((acc, item) => ({ covered: acc.covered + item.covered, total: acc.total + item.total }), { covered: 0, total: 0 });
const percentage = pct(totals.covered, totals.total);
const result = {
  ok: percentage >= threshold && totals.total > 0,
  threshold,
  coveragePercent: Number(percentage.toFixed(2)),
  covered: totals.covered,
  total: totals.total,
  files: [...files.entries()].map(([file, data]) => ({ file, coveragePercent: Number(pct(data.covered, data.total).toFixed(2)), ...data })).sort((a, b) => a.coveragePercent - b.coveragePercent),
};

mkdirSync(resolve(outputPath, '..'), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Coverage: ${result.coveragePercent}% (${totals.covered}/${totals.total}) threshold: ${threshold}%`);
console.log(`Coverage gate report written to ${outputPath}`);

if (!result.ok) fail(totals.total === 0 ? 'no covered source files were found' : `${result.coveragePercent}% is below ${threshold}%`);
