// Time-zone arithmetic for consultation requests (M7 FR-005, SC-33 SR-361) with Intl only: preferred times are
// entered in the member's IANA zone, stored in UTC and shown as DD/MM/YYYY HH:mm in that zone and in Hanoi time.
export const HANOI = 'Asia/Ho_Chi_Minh';

const formatters = new Map();
function formatter(zone) {
  if (!formatters.has(zone)) {
    formatters.set(zone, new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
    }));
  }
  return formatters.get(zone);
}
const partsOf = (ms, zone) => Object.fromEntries(formatter(zone).formatToParts(new Date(ms)).map(p => [p.type, p.value]));

/** True for a time-zone name Intl knows, of at most 40 characters (consultation_booking.timezone VARCHAR(40)). */
export function isValidZone(zone) {
  if (typeof zone !== 'string' || !zone || zone.length > 40 || !/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/.test(zone)) return false;
  try { formatter(zone); return true; } catch { return false; }
}

// How far `zone` is ahead of UTC at the instant `ms`
function offsetMs(ms, zone) {
  const p = partsOf(ms, zone);
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
}

/** 'YYYY-MM-DDTHH:mm' read in `zone` → ISO 8601 UTC; null when the text is not such a value. */
export function zonedToUtc(local, zone) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(local || ''));
  if (!m || !isValidZone(zone)) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let ms = guess - offsetMs(guess, zone);
  ms = guess - offsetMs(ms, zone); // a second pass settles the instants next to a summer-time change
  return new Date(ms).toISOString();
}

/** An instant as DD/MM/YYYY HH:mm in `zone`. */
export function formatInZone(iso, zone) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms) || !isValidZone(zone)) return null;
  const p = partsOf(ms, zone);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}
