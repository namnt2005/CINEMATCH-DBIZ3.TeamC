// VFDA Verified (M4 BR-004, FR-011): valid 12 months from the decision, read as a rule — nothing has to run for
// the badge to disappear. Dates are Vietnam dates (UTC+7, no summer time).
const DAY = 86400000;
const VN_OFFSET = 7 * 3600000;

/** The Asia/Ho_Chi_Minh calendar date of an instant, as YYYY-MM-DD. */
export function todayInVietnam(now = new Date()) {
  return new Date(now.getTime() + VN_OFFSET).toISOString().slice(0, 10);
}

/** The Vietnam date 12 months after a decision; 29 February ends on 28 February. */
export function verifiedUntil(verifiedAt) {
  const start = todayInVietnam(new Date(verifiedAt));
  const [y, m, d] = start.split('-').map(Number);
  const last = new Date(Date.UTC(y + 1, m, 0)).getUTCDate();
  return `${y + 1}-${String(m).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

/** True while the badge is valid on `today` (the last day counts). */
export const isVerified = (org, today = todayInVietnam()) => Boolean(org?.verified_until) && String(org.verified_until).slice(0, 10) >= today;

/** YYYY-MM of the verification while the badge is valid, else null (SC-19 #8). */
export function verifiedMonth(org, today = todayInVietnam()) {
  if (!isVerified(org, today) || !org.verified_at) return null;
  return todayInVietnam(new Date(org.verified_at)).slice(0, 7);
}

/** Days from `today` to the last valid day. */
export const daysLeft = (org, today = todayInVietnam()) =>
  Math.round((Date.parse(`${String(org.verified_until).slice(0, 10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY);

/** FR-011: valid and ending within 30 days. */
export const isExpiring = (org, today = todayInVietnam()) => isVerified(org, today) && daysLeft(org, today) <= 30;
