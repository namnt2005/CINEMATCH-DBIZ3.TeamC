// Build check of the display dictionary (FR-006 "a missing key fails the build"; contracts/i18n.contract.md).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
// t('key'), t("key"), t(`prefix.${x}`) — the translator is always called t in this code base
const CALL = /\bt\(\s*(?:'([^']+)'|"([^"]+)"|`([^`$]*)\$\{[^`]*`|`([^`$]+)`)/g;

export function findI18nProblems({ files, messages }) {
  const { vi, en } = messages;
  const keys = new Set([...Object.keys(vi), ...Object.keys(en)]);
  const mismatched = [...keys].filter(k => !(k in vi) || !(k in en));
  const empty = Object.entries({ vi, en }).flatMap(([lang, dict]) =>
    Object.entries(dict).filter(([, v]) => typeof v !== 'string' || v.trim() === '').map(([k]) => `${lang}:${k}`));
  const missing = [];
  const seen = new Set();
  for (const { path: file, text } of files) {
    for (const m of text.matchAll(CALL)) {
      const exact = m[1] ?? m[2] ?? m[4];
      const prefix = m[3];
      const key = exact ?? `${prefix}*`;
      if (seen.has(key)) continue;
      seen.add(key);
      const ok = exact !== undefined
        ? exact in vi && exact in en
        : Object.keys(vi).some(k => k.startsWith(prefix) && k in en);
      if (!ok) missing.push({ key, file });
    }
  }
  return { missing, mismatched, empty };
}

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : sourceFiles(full);
    return /\.(m?js)$/.test(entry.name) ? [full] : [];
  });
}

export function checkRepository(root = ROOT) {
  const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
  const files = ['app', 'lib'].flatMap(d => sourceFiles(path.join(root, d)))
    .filter(f => !f.includes(`${path.sep}i18n${path.sep}`))
    .map(f => ({ path: path.relative(root, f), text: fs.readFileSync(f, 'utf8') }));
  const problems = findI18nProblems({ files, messages: { vi: read('lib/i18n/vi.json'), en: read('lib/i18n/en.json') } });
  return { ...problems, missing: problems.missing.map(({ key }) => key) };
}
