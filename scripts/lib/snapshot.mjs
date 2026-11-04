// FR-008 by hand, or where pg_cron is not enabled (specs/005-m0-workspace research R10): one readiness
// snapshot per non-archived project for a date. The work is lib/db/readiness.js snapshotReadiness().
import { snapshotReadiness } from '../../lib/db/readiness.js';
import { todayInVietnam } from '../../lib/projects/input.js';

export async function runSnapshot({ date } = {}) {
  const day = date || todayInVietnam();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`Date must be YYYY-MM-DD, got ${day}`);
  return snapshotReadiness(day);
}
