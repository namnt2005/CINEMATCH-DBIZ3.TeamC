// Saving a check to a project (research R7): every finding is verified again on the server against the current rule set
// and the text, which is then thrown away; a forged code or quote is never saved. Shared by both data sources.
import { verifyFindings } from './verify.js';
import { attentionLevel } from './attention.js';
import { synopsisHash } from './input.js';
import { CheckError } from '../checks/errors.js';

export const MAX_NOTE = 1000;

export function verifySaved({ text, lang, findings }, rules) {
  if (typeof text !== 'string' || !text.trim() || !['en', 'vi'].includes(lang) || !Array.isArray(findings) || findings.length === 0 || findings.length > 50) {
    throw new CheckError('VALIDATION_ERROR', { findings: 'content.error.findings' });
  }
  const { kept, dropped_count: dropped } = verifyFindings({ text, pairs: findings, rules });
  if (dropped > 0 || kept.length === 0) throw new CheckError('VALIDATION_ERROR', { findings: 'content.error.findings' });
  return { kept, hash: synopsisHash(text), level: attentionLevel(kept) };
}

export function validateNote(note) {
  if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > MAX_NOTE)) throw new CheckError('VALIDATION_ERROR', { note: 'content.error.note' });
  return typeof note === 'string' && note.trim() ? note.trim() : null;
}
