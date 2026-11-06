import { createHash, randomBytes } from 'node:crypto';
import { slugFrom } from '../db/admin-shape.js';

// Shared rules of partner invitations (BR-003, D2): a one-time 64-hex code whose SHA-256 alone is stored, 7 days.
export const INVITATION_DAYS = 7;
export const newCode = () => randomBytes(32).toString('hex');
export const codeHash = (code) => createHash('sha256').update(String(code ?? ''), 'utf8').digest('hex');

/** The organisation slug from its name, accents removed (contract: invitations-api). */
export const orgSlug = (name) => slugFrom(name) || 'partner';

/** l***@benxua.example.vn — enough to recognise the address, not to read it. */
export function maskEmail(email) {
  const [local, domain] = String(email || '').split('@');
  return domain ? `${local.slice(0, 1)}***@${domain}` : '***';
}

export function invitationState(inv, now = new Date()) {
  if (inv.accepted_at) return 'accepted';
  return new Date(inv.expires_at) > now ? 'open' : 'expired';
}

export function addDays(iso, days) {
  return new Date(new Date(iso).getTime() + days * 86400000).toISOString().replace('Z', '+00:00');
}
