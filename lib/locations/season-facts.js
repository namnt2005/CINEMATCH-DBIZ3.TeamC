/**
 * Display labels for the Seasons and permits facts of SC-16 #9 (T046).
 * Missing data reads "no data yet", never "no" (BR-003, SR-113).
 * For month lists, null = no data yet and [] = VFDA recorded none (Clarifications Q3, agreed 2026-10-30).
 * The default language is English; SC-16 passes 'vi'.
 */

const LABELS = {
  en: {
    noData: 'No data yet',
    night: { yes: 'Night shooting allowed', no: 'Not allowed', ask: 'Ask the local authority' },
    noRainyMonths: 'No rainy months recorded',
    noMonthsToAvoid: 'No months to avoid recorded',
    months: (list) => list.map(m => MONTH_NAMES_EN[m - 1]).join(', ')
  },
  vi: {
    noData: 'Chưa có dữ liệu',
    night: { yes: 'Có', no: 'Không', ask: 'Hỏi địa phương' },
    noRainyMonths: 'Không có tháng mưa',
    noMonthsToAvoid: 'Không có tháng cần tránh',
    months: (list) => 'Tháng ' + list.join(', ')
  }
};

const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function labelsFor(lang) {
  return LABELS[lang] || LABELS.en;
}

// Accepts an array or the JSON text stored in the seed; returns null when there is no data
function toMonthList(value) {
  let list = value;
  if (typeof value === 'string') {
    if (value.trim() === '') return null;
    try {
      list = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(list)) return null;
  return list.map(Number).filter(m => m >= 1 && m <= 12).sort((a, b) => a - b);
}

function monthsLabel(value, emptyKey, lang) {
  const labels = labelsFor(lang);
  const list = toMonthList(value);
  if (list === null) return labels.noData;
  if (list.length === 0) return labels[emptyKey];
  return labels.months(list);
}

export function noDataLabel(lang = 'en') {
  return labelsFor(lang).noData;
}

export function nightShootingLabel(value, lang = 'en') {
  const labels = labelsFor(lang);
  return labels.night[value] || labels.noData;
}

export function rainyMonthsLabel(value, lang = 'en') {
  return monthsLabel(value, 'noRainyMonths', lang);
}

export function monthsToAvoidLabel(value, lang = 'en') {
  return monthsLabel(value, 'noMonthsToAvoid', lang);
}
