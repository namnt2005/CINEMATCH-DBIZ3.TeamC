// Dates and times as people in Vietnam read them (DD/MM/YYYY HH:mm, Vietnam time), in both languages.
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

function parts(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  return Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value]));
}

export function formatDate(value) {
  const p = parts(value);
  return p ? `${p.day}/${p.month}/${p.year}` : '';
}

export function formatTime(value) {
  const p = parts(value);
  return p ? `${p.hour}:${p.minute}` : '';
}
