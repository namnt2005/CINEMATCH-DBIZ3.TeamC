#!/usr/bin/env node
// npm run check:i18n — run before every build (prebuild). Fails on a key missing from vi.json or en.json,
// a key present in only one of them, or an empty text (FR-006).
import { checkRepository } from './lib/i18n-check.mjs';

const { missing, mismatched, empty } = checkRepository();
for (const key of missing) console.error(`✗ used in code, missing from the dictionary: ${key}`);
for (const key of mismatched) console.error(`✗ in one dictionary only: ${key}`);
for (const key of empty) console.error(`✗ empty text: ${key}`);
if (missing.length + mismatched.length + empty.length > 0) process.exit(1);
console.log('✓ i18n: vi.json and en.json complete');
