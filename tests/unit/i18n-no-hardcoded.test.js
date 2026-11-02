import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// Babel's parser ships with Next.js (no new dependency): JSX is read as a tree, not with regular expressions
const require = createRequire(import.meta.url);
const { parse } = require('next/dist/compiled/babel/parser');

// Proper nouns, and the unit km, read the same in both languages
const PROPER_NOUNS = new Set(['CINEMATCH', 'VFDA', 'EN', 'VI', 'Gemini', 'OpenStreetMap', 'km']);
// The map attribution is the licence text required by OpenStreetMap
const LICENCE_TEXT = new Set(['&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors']);
const TEXT_ATTRIBUTES = new Set(['title', 'alt', 'placeholder', 'aria-label', 'aria-description', 'label']);
const CSS_WORDS = new Set(['auto', 'none', 'center', 'solid', 'dashed', 'bold', 'normal', 'flex', 'block', 'inline', 'hidden', 'both',
  'left', 'right', 'top', 'bottom', 'pointer', 'contents', 'uppercase', 'italic', 'nowrap', 'wrap', 'column', 'row', 'start', 'end',
  'contain', 'cover', 'absolute', 'relative', 'fixed', 'sticky', 'grid', 'transparent', 'inherit', 'scroll', 'visible', 'middle']);

function appFiles(dir = 'app') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return appFiles(full);
    // Route handlers answer programs (JSON, redirects), not people; screens translate from their codes
    return entry.name.endsWith('.js') && entry.name !== 'route.js' ? [full] : [];
  });
}

/** True when a piece of text reads as interface wording rather than data, CSS, a key or a path. */
export function isProse(raw) {
  const text = String(raw).trim();
  if (!text || PROPER_NOUNS.has(text) || LICENCE_TEXT.has(text)) return false;
  if (/^[\w.+-]+@[\w.-]+$/.test(text)) return false;                       // e-mail address
  if (/^(\/|\.{1,2}\/|https?:|mailto:|#|data:)/.test(text)) return false;   // path, URL, anchor
  if (/^[a-z0-9_]+(\.[a-z0-9_{}*-]+)+$/i.test(text) && !/\s/.test(text)) return false; // dictionary key, file name
  if (/^[\w-]+\/[\w./-]*$/.test(text)) return false;                          // MIME type, time zone, path
  if (/\d(px|rem|em|%|vh|vw|fr|ms|s)\b|#[0-9a-f]{3,8}\b|rgba?\(/i.test(text)) return false; // CSS values
  if (/[À-ỹĐđ]/.test(text)) return true;                                     // Vietnamese wording
  if (/^[A-Z][a-z]+-[A-Z]/.test(text)) return false;                         // HTTP header names
  const words = text.match(/[A-Za-z]{2,}/g) || [];
  if (words.length === 0) return false;
  if (words.every(w => PROPER_NOUNS.has(w))) return false;
  if (/^[A-Z][a-z]{2,}/.test(text)) return true;                             // "Open", "Save changes"
  const lower = text.toLowerCase().match(/[a-z]{2,}/g) || [];
  if (/\b[a-z]{2,} [a-z]{2,}\b/.test(text) && !lower.every(w => CSS_WORDS.has(w))) return true; // "in total", "no data yet"
  return false;
}

function walk(node, visit, parent = null, key = null) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parent, key);
  for (const [k, value] of Object.entries(node)) {
    if (k === 'loc' || k === 'start' || k === 'end' || k === 'extra' || k === 'leadingComments' || k === 'trailingComments') continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, visit, node, k));
    else if (value && typeof value.type === 'string') walk(value, visit, node, k);
  }
}

const isConsoleCall = (node) => node?.type === 'CallExpression' && node.callee?.type === 'MemberExpression' && node.callee.object?.name === 'console';

function findHardcoded(file) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
  const found = [];
  const add = (node, text) => found.push(`${file}:${node.loc.start.line} ${JSON.stringify(String(text).trim().slice(0, 60))}`);
  walk(ast.program, (node, parent, key) => {
    if (node.type === 'JSXText') {
      const text = node.value.replace(/\s+/g, ' ').trim();
      if (/[A-Za-zÀ-ỹ]/.test(text) && !PROPER_NOUNS.has(text) && isProseOrWord(text)) add(node, text);
      return;
    }
    if (node.type === 'JSXAttribute' && node.value?.type === 'StringLiteral') {
      const name = node.name?.name;
      const value = node.value.value.trim();
      if (TEXT_ATTRIBUTES.has(name) && !PROPER_NOUNS.has(value) && (isProse(value) || isProseOrWord(value))) add(node, value);
      return;
    }
    if (node.type === 'StringLiteral') {
      if (parent?.type === 'ImportDeclaration' || parent?.type === 'ExportNamedDeclaration' || parent?.type === 'ExportAllDeclaration') return;
      if (parent?.type === 'JSXAttribute') return; // handled above
      if ((parent?.type === 'ObjectProperty' || parent?.type === 'ClassProperty') && key === 'key') return;
      if (parent?.type === 'CallExpression' && isConsoleCall(parent)) return;
      if (isProse(node.value)) add(node, node.value);
      return;
    }
    if (node.type === 'TemplateLiteral') {
      if (isConsoleCall(parent)) return;
      for (const quasi of node.quasis) if (isProse(quasi.value.cooked)) add(quasi, quasi.value.cooked);
    }
  });
  return found;
}

// JSX text is interface wording even when it is a single lower-case word ("or", "and")
function isProseOrWord(text) {
  return isProse(text) || /^[A-Za-zÀ-ỹ][A-Za-zÀ-ỹ' -]*[.:!?…]?$/.test(text);
}

describe('No hard-coded interface text in app/ (T046, FR-006, US-3, D7)', () => {
  test('the detector tells interface wording from data, CSS, keys and paths', () => {
    for (const s of ['Open', 'Save changes', 'in total', 'No locations yet — add the first one.', 'Đăng nhập', 'Month ']) assert.ok(isProse(s), s);
    for (const s of ['frame.brand', '/locations', 'system-ui, sans-serif', '1px solid #e5e7eb', 'Content-Type', 'POST', 'CINEMATCH',
      'application/json', 'repeat(auto-fill, minmax(', 'space-between', 'scouting@vfda.vn', 'center center', 'uppercase']) assert.ok(!isProse(s), s);
  });

  test('FR-006: every screen of app/ (SYS and M3) reads its text from lib/i18n, apart from proper nouns', () => {
    const found = appFiles().flatMap(findHardcoded);
    assert.deepEqual(found, [], `${found.length} hard-coded text(s):\n${found.join('\n')}`);
  });
});
