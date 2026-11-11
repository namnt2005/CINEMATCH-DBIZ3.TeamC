import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// The error codes M5 adds to the shared M2 plumbing (T007; contracts/documents-api and drafts-api).
const vi = JSON.parse(fs.readFileSync('lib/i18n/vi.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('lib/i18n/en.json', 'utf8'));
const NEW = { NOT_IN_KIT: 422, FILE_TYPE: 422, FILE_TOO_LARGE: 422, LIMIT: 422, EMPTY_PARAGRAPH: 422, UPLOAD_MISSING: 409, TRANSLATION_UNAVAILABLE: 409 };

describe('M5 error codes (T007)', () => {
  test('each code is known, maps to its status and has a text in both languages', async () => {
    const { CHECK_ERRORS } = await import('../../lib/checks/errors.js');
    const { checkError } = await import('../../lib/api/checks.js');
    for (const [code, status] of Object.entries(NEW)) {
      assert.ok(CHECK_ERRORS.includes(code), `${code} in CHECK_ERRORS`);
      const res = checkError(code);
      assert.equal(res.status, status, code);
      assert.equal((await res.json()).error, code);
      const key = `checks.api.${code.toLowerCase()}`;
      assert.ok(vi[key] && en[key], key);
    }
  });
});
