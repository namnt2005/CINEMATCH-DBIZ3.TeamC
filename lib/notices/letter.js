// The provincial letter (M7 BR-001, BR-002, Clarifications Q1–Q2; specs/006-m7-support research R3). Pure:
// the crew downloads it and sends it to the office they choose; the system never sends it.
// Wording is the team's draft, pending the VFDA Legal Board (spec-M7 BR-002, research Open question 8).

export const RECIPIENTS = Object.freeze(['peoples_committee', 'culture_department']);
export const BR002 = Object.freeze({
  vi: 'Thư này không thay thế giấy phép quay phim do Bộ Văn hóa, Thể thao và Du lịch cấp.',
  en: 'This letter does not replace the filming licence issued by the Ministry of Culture, Sports and Tourism.'
});
const ADDRESSEE = {
  peoples_committee: { vi: (p) => `Kính gửi: Ủy ban nhân dân ${p}`, en: (p) => `To: the People's Committee of ${p}` },
  culture_department: { vi: (p) => `Kính gửi: Sở Văn hóa, Thể thao và Du lịch ${p}`, en: (p) => `To: the Department of Culture, Sports and Tourism of ${p}` }
};

/** The summary is stored as two lines: Vietnamese, then English (lib/notices/summary.js). */
function summaryLines(summary) {
  const lines = String(summary || '').split('\n').filter(Boolean);
  return { vi: lines[0] ?? '', en: lines[lines.length - 1] ?? '' };
}

/**
 * @param {{ projectName: string, provinceName: string, summary: string }} notice
 * @param {'peoples_committee'|'culture_department'} recipient
 * @returns {{ recipient: string, paragraphs: { lang: 'vi'|'en', text: string }[] }}
 */
export function buildLetter(notice, recipient) {
  const to = ADDRESSEE[recipient];
  if (!to) throw new Error(`Unknown recipient: ${recipient}`);
  const { projectName, provinceName } = notice;
  const s = summaryLines(notice.summary);
  const vi = [
    to.vi(provinceName),
    `Đoàn làm phim của dự án ${projectName} trân trọng thông báo tới quý cơ quan kế hoạch quay phim tại địa phương.`,
    `Thông tin dự án: ${s.vi}`,
    'Thư này được soạn trên nền tảng CINEMATCH và đã được cán bộ VFDA xem xét trước khi đoàn làm phim gửi đi.',
    BR002.vi,
    'Trân trọng,',
    `Đoàn làm phim ${projectName}`
  ];
  const en = [
    to.en(provinceName),
    `The film crew of the project ${projectName} would like to inform you of its plan to film in your province.`,
    `Project details: ${s.en}`,
    'This letter was prepared on the CINEMATCH platform and reviewed by VFDA staff before the crew sends it.',
    BR002.en,
    'Yours faithfully,',
    `The crew of ${projectName}`
  ];
  return { recipient, paragraphs: [...vi.map(text => ({ lang: 'vi', text })), ...en.map(text => ({ lang: 'en', text }))] };
}
