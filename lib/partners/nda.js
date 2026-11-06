// The one standard mutual NDA (M4 Q4, FR-017; specs/007-m4-partners D5): config/nda/NDA-2026.1.json names the stored
// version code and the bilingual draft in docs/legal/nda-v1.0.md (bản nháp — chờ VFDA xem).
import nda from '../../config/nda/NDA-2026.1.json' with { type: 'json' };

export const NDA_VERSION = nda.version;
export const NDA_DOCUMENT = nda.document;
export const NDA_STATUS = nda.status;
