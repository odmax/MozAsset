#!/usr/bin/env node

/**
 * scripts/check-encoding.mjs
 *
 * Scans the project for mojibake (corrupted UTF-8) text patterns
 * and reports all affected files. Fails with exit code 1 if issues found.
 *
 * Usage:
 *   node scripts/check-encoding.mjs
 *   node scripts/check-encoding.mjs --fix    (auto-replace in-place)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Directories to exclude
const EXCLUDE_DIRS = new Set([
  'node_modules', '.next', '.git', 'dist', 'build', 'out',
  '.vercel', '.vscode', 'coverage', '.turbo',
]);

// File extensions to scan
const INCLUDE_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.json', '.md', '.html', '.css', '.txt',
  '.yml', '.yaml', '.toml', '.env.example',
]);

// Build patterns dynamically to avoid self-detection.
// Mojibake results from UTF-8 bytes being interpreted as Latin-1/Windows-1252.
// Common double-encoded character patterns:
const MOJIBAKE_MAP = [
  //  byte sequences (Latin-1 view of UTF-8 encoded high chars)
  //  \u00E2\u20AC\u2122  ->  '  (right single quote, U+2019)
  { bytes: [0xE2, 0x80, 0x99], replacement: "'", description: 'U+2019 right single quote' },
  //  \u00E2\u20AC\u02DC  ->  '  (left single quote, U+2018)
  { bytes: [0xE2, 0x80, 0x98], replacement: "'", description: 'U+2018 left single quote' },
  //  \u00E2\u20AC\u0153  ->  "  (left double quote, U+201C)
  { bytes: [0xE2, 0x80, 0x9C], replacement: '"', description: 'U+201C left double quote' },
  //  \u00E2\u20AC\u009D  ->  "  (right double quote, U+201D)
  { bytes: [0xE2, 0x80, 0x9D], replacement: '"', description: 'U+201D right double quote' },
  //  \u00E2\u20AC\u201C  ->  "  (same as above via double encoding)
  { bytes: [0xE2, 0x80, 0x9C], replacement: '"', description: 'U+201C left double quote' },
  //  \u00E2\u20AC\u201D  ->  "  (same as above via double encoding)
  { bytes: [0xE2, 0x80, 0x9D], replacement: '"', description: 'U+201D right double quote' },
  //  \u00E2\u20AC\u201C  ->  ,
  { bytes: [0xE2, 0x80, 0xBA], replacement: "'", description: 'U+203A single guillemet' },
  //  \u00E2\u20AC\u201C  ->  ,
  { bytes: [0xE2, 0x80, 0xB9], replacement: "'", description: 'U+2039 single guillemet' },
  //  \u00E2\u20AC\u201C  em dash
  //  \u00E2\u20AC\u201C  en dash
  //  \u00E2\u20AC\u00A2  bullet
  { bytes: [0xE2, 0x80, 0xA2], replacement: '-', description: 'U+2022 bullet' },
  //  \u00E2\u20AC\u00A6  ellipsis
  { bytes: [0xE2, 0x80, 0xA6], replacement: '...', description: 'U+2026 ellipsis' },
  //  \u00E2\u20AC\u201C  left double quote (another encoding)
  { bytes: [0xE2, 0x80, 0x9C], replacement: '"', description: 'U+201C left double quote' },
  //  \u00E2\u20AC\u201D  right double quote (another encoding)
  { bytes: [0xE2, 0x80, 0x9D], replacement: '"', description: 'U+201D right double quote' },
  //  \u00E2\u20AC\u201C  en dash
  { bytes: [0xE2, 0x80, 0x93], replacement: '-', description: 'U+2013 en dash' },
  //  \u00E2\u20AC\u201D  em dash
  { bytes: [0xE2, 0x80, 0x94], replacement: '--', description: 'U+2014 em dash' },
  //  \u00E2\u20AC\u00B0  per mille
  { bytes: [0xE2, 0x80, 0xB0], replacement: '%', description: 'U+2030 per mille' },
  //  \u00E2\u20AC\u00A0  dagger
  { bytes: [0xE2, 0x80, 0xA0], replacement: '', description: 'U+2020 dagger' },
  //  \u00E2\u20AC\u00A1  double dagger
  { bytes: [0xE2, 0x80, 0xA1], replacement: '', description: 'U+2021 double dagger' },
  //  \u00C3\u2020\u017E  caron variants
  { bytes: [0xC5, 0xA1], replacement: 's', description: 'U+0161 s-caron' },
  { bytes: [0xC5, 0x93], replacement: 'oe', description: 'U+0153 oe ligature' },
  { bytes: [0xC5, 0xBD], replacement: 'Z', description: 'U+017D Z-caron' },
  { bytes: [0xC5, 0xB8], replacement: 'y', description: 'U+0178 Y-diaeresis' },
  { bytes: [0xC5, 0xBE], replacement: 'z', description: 'U+017E z-caron' },
  //  \u00C3\u201A\u00A9  ->  \u00A9 (copyright)  -  this is \u00C2\u00A9 as double-encoded
  { bytes: [0xC3, 0x82, 0xC2, 0xA9], replacement: '\u00A9', description: 'U+00A9 copyright (double-encoded)' },
];

// Build regex patterns from byte sequences
function buildPatterns() {
  const patterns = [];
  for (const entry of MOJIBAKE_MAP) {
    const patternStr = entry.bytes.map(b => '\\x' + b.toString(16).padStart(2, '0')).join('');
    patterns.push({
      regex: new RegExp(patternStr, 'g'),
      replacement: entry.replacement,
      description: entry.description,
    });
  }
  // Additional generic patterns
  patterns.push({
    regex: /[\x80-\xBF]{2,}/g,
    replacement: null,
    description: 'unexpected continuation bytes',
  });
  return patterns;
}

const PATTERNS = buildPatterns();

function shouldExclude(dir) {
  const parts = dir.split(path.sep);
  return parts.some(p => EXCLUDE_DIRS.has(p));
}

function* walk(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!shouldExclude(fullPath)) yield* walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (INCLUDE_EXT.has(ext)) yield fullPath;
      }
    }
  } catch { /* permission denied etc */ }
}

function detect(filePath, doFix) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return 0;
  }

  let found = 0;
  let fixed = content;

  for (const { regex, description, replacement } of PATTERNS) {
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(content)) !== null) {
      if (found === 0) console.log(`\n${filePath}`);
      const context = getContext(content, match.index);
      const hex = [...match[0]].map(c => '\\x' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
      console.log(`  ${description}: "${match[0]}" at offset ${match.index} [hex:${hex}] ${context}`);
      found++;
    }

    if (doFix && replacement !== null) {
      fixed = fixed.replace(regex, replacement);
    }
  }

  if (doFix && found > 0) {
    fs.writeFileSync(filePath, fixed, 'utf-8');
    console.log(`  -> fixed ${found} issues`);
  }

  return found;
}

function getContext(content, index) {
  const start = Math.max(0, index - 20);
  const end = Math.min(content.length, index + 20);
  let snippet = content.slice(start, end).replace(/\n/g, '\\n');
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  return `[${snippet}]`;
}

// Count pattern occurrences without context (for summary)
function countOccurrences(content) {
  let count = 0;
  for (const { regex } of PATTERNS) {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(content)) !== null) count++;
  }
  return count;
}

async function main() {
  const doFix = process.argv.includes('--fix');
  const srcDir = path.join(ROOT, 'src');
  const prismaDir = path.join(ROOT, 'prisma');
  const scriptsDir = path.join(ROOT, 'scripts');

  let totalIssues = 0;
  let affectedFiles = 0;

  const allDirs = [srcDir, prismaDir, scriptsDir];
  for (const d of allDirs) {
    if (!fs.existsSync(d)) continue;
    for (const filePath of walk(d)) {
      const count = detect(filePath, doFix);
      if (count > 0) {
        totalIssues += count;
        affectedFiles++;
      }
    }
  }

  if (!doFix) {
    let summaryCount = 0;
    for (const d of allDirs) {
      if (!fs.existsSync(d)) continue;
      for (const filePath of walk(d)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          summaryCount += countOccurrences(content);
        } catch { /* skip */ }
      }
    }
    if (summaryCount > 0) {
      console.log(`\n========================================`);
      console.log(`FOUND ${totalIssues} mojibake issues in ${affectedFiles} files`);
      console.log(`Total occurrences across all patterns: ${summaryCount}`);
      console.log(`Run with --fix to auto-replace common patterns`);
      console.log(`========================================`);
      process.exit(1);
    } else {
      console.log('No mojibake detected. Codebase is clean.');
    }
  } else {
    console.log(`\nFixed ${totalIssues} issues in ${affectedFiles} files`);
  }
}

main().catch(console.error);
