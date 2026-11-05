// The project summary of a provincial notice (M7 FR-002, SC-32 #9; specs/006-m7-support research R3). Pure:
// rows from the database in, two lines out (Vietnamese, then English). app.notice_summary in
// supabase/migrations/20261106000100_m7_notices.sql builds the same text on PostgreSQL.

const FORMAT = {
  feature: ['Phim truyện', 'Feature film'], documentary: ['Phim tài liệu', 'Documentary'], commercial: ['Quảng cáo', 'Commercial'],
  tv: ['Chương trình truyền hình', 'TV programme'], music_video: ['Video ca nhạc', 'Music video']
};
const CREW = { u15: ['dưới 15 người', 'under 15'], '15_50': ['15–50 người', '15–50'], o50: ['trên 50 người', 'over 50'] };

const ddmmyyyy = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${y}`; };
const byCodeUnits = (a, b) => (a < b ? -1 : a > b ? 1 : 0);   // the order of PostgreSQL COLLATE "C" for these names

/**
 * @param {{ project_name, format, shoot_date, shoot_days_vn, crew_size_band }} project
 * @param {string} provinceName
 * @param {{ name_vi, name_en }[]} locations the project's interests in that province
 * @param {string[]} partners org_name of the confirmed Vietnamese partners
 */
export function buildSummary(project, provinceName, locations, partners) {
  const [fmtVi, fmtEn] = FORMAT[project.format] ?? [project.format, project.format];
  const [crewVi, crewEn] = CREW[project.crew_size_band] ?? [null, null];
  const date = project.shoot_date ? ddmmyyyy(project.shoot_date) : null;
  const days = project.shoot_days_vn === null || project.shoot_days_vn === undefined || project.shoot_days_vn === '' ? null : Number(project.shoot_days_vn);
  const namesVi = locations.map(l => l.name_vi).sort(byCodeUnits).join(', ');
  const namesEn = locations.map(l => l.name_en).sort(byCodeUnits).join(', ');
  const partner = [...partners].sort(byCodeUnits).join(', ');
  const vi = `${project.project_name} — ${fmtVi}; ngày quay đầu tiên ${date ?? 'chưa đặt'}; `
    + `${days === null ? 'chưa có số ngày quay' : `${days} ngày quay tại Việt Nam`}; `
    + `quy mô đoàn ${crewVi ?? 'chưa có'}; bối cảnh tại ${provinceName}: ${namesVi}; `
    + `${partner ? `đối tác Việt Nam: ${partner}` : 'chưa có đối tác Việt Nam được xác nhận'}.`;
  const en = `${project.project_name} — ${fmtEn}; first shooting day ${date ?? 'not set'}; `
    + `${days === null ? 'shooting days not set' : `${days} shooting days in Vietnam`}; `
    + `crew ${crewEn ?? 'not set'}; locations in ${provinceName}: ${namesEn}; `
    + `${partner ? `Vietnamese partner: ${partner}` : 'no confirmed Vietnamese partner yet'}.`;
  return { vi, en, text: `${vi}\n${en}`, missing: date ? [] : ['shoot_date'] };
}
