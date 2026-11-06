// SC-36 view rules (M4 FR-009, FR-010, BR-004, Q3), pure.
import { todayInVietnam, verifiedUntil } from '../../../lib/partners/badge.js';

/** #11: the badge would run from today (Vietnam) to the same day next year. */
export const approvalPreview = (now = new Date()) => ({ from: todayInVietnam(now), until: verifiedUntil(now.toISOString()) });

/** #12: a reason of 1–1000 characters. */
export const canReject = (reason) => { const n = String(reason || '').trim().length; return n >= 1 && n <= 1000; };

/** #10, Q3: on only with the film-service business line confirmed. */
export const canSwitchArt13On = (businessLineConfirmed) => businessLineConfirmed === true;

export const STATUS_TABS = ['pending', 'approved', 'rejected', 'all'];
