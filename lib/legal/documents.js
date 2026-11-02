// Privacy policy (SC-42) and terms of use (SC-43): the text of each version, in Vietnamese and English
// (BR-003, SR-251..SR-265). The English text is the draft of the screen mockups (docs/screens/img/SC-42.png,
// SC-43.png); the Vietnamese text is its translation. Both stay drafts until the VFDA Legal Board approves
// them (SR-255, SR-265). [[account]], [[signup]], [[privacy]], [[terms]] mark the links of the page.
import { currentConsentVersion } from '../db/consent.js';

const DRAFT = {
  privacy: {
    title: { vi: 'Chính sách bảo mật', en: 'Privacy policy' },
    sections: {
      en: [
        { id: 'who', heading: 'Who we are', body: 'CINEMATCH is operated for the Vietnam Film Development Association (VFDA) to help film crews prepare a shoot in Vietnam.' },
        { id: 'collect', heading: 'What we collect', body: 'When you create an account: your full name, work email, company name, country, crew role and, if you give it, your website. We also keep the projects and documents you add.' },
        { id: 'anonymous', heading: 'Data stored without personal data', body: 'Texts you submit to the content pre-check and the scene searches you confirm are stored without your name, email or any other personal data. Scene searches feed only aggregate statistics about what producers look for, and are never used to train a model.' },
        { id: 'access', heading: 'Who can see your data', body: "Your projects are visible only to their members. Local authority contacts and partners' private information are filtered in the database by role, not only hidden on screen." },
        { id: 'delete', heading: 'Deleting your account', body: 'You can delete your account in [[account]]. It is deactivated at once; your name, email and phone are replaced by anonymous values within 30 days. Projects, uploads and approvals stay for the other people who rely on them and show Former member.' },
        { id: 'consent', heading: 'Your consent', body: 'You accept this policy when you [[signup]]. We record the version you accepted and the date and time. If you are signed in, your record is shown in [[account]].' }
      ],
      vi: [
        { id: 'who', heading: 'Chúng tôi là ai', body: 'CINEMATCH được vận hành cho Hiệp hội Xúc tiến Phát triển Điện ảnh Việt Nam (VFDA) để giúp các đoàn phim chuẩn bị quay tại Việt Nam.' },
        { id: 'collect', heading: 'Chúng tôi thu thập gì', body: 'Khi bạn tạo tài khoản: họ tên, email công việc, tên công ty, quốc gia, vai trò trong đoàn phim và, nếu bạn cung cấp, website của bạn. Chúng tôi cũng lưu các dự án và tài liệu bạn thêm vào.' },
        { id: 'anonymous', heading: 'Dữ liệu lưu không kèm thông tin cá nhân', body: 'Nội dung bạn gửi để kiểm tra sơ bộ và các tìm kiếm cảnh quay bạn xác nhận được lưu không kèm họ tên, email hay bất kỳ dữ liệu cá nhân nào khác. Tìm kiếm cảnh quay chỉ dùng cho thống kê tổng hợp về nhu cầu của nhà sản xuất, và không bao giờ được dùng để huấn luyện mô hình.' },
        { id: 'access', heading: 'Ai có thể xem dữ liệu của bạn', body: 'Dự án của bạn chỉ thành viên dự án mới xem được. Liên hệ chính quyền địa phương và thông tin riêng của đối tác được lọc theo vai trò ngay trong cơ sở dữ liệu, không chỉ ẩn trên màn hình.' },
        { id: 'delete', heading: 'Xoá tài khoản', body: 'Bạn có thể xoá tài khoản trong [[account]]. Tài khoản bị vô hiệu hoá ngay; họ tên, email và số điện thoại được thay bằng giá trị ẩn danh trong vòng 30 ngày. Dự án, tệp tải lên và phê duyệt vẫn được giữ cho những người khác cần đến và hiển thị là Cựu thành viên.' },
        { id: 'consent', heading: 'Sự đồng ý của bạn', body: 'Bạn chấp nhận chính sách này khi [[signup]]. Chúng tôi ghi lại phiên bản bạn đã chấp nhận cùng ngày giờ. Nếu đã đăng nhập, bạn xem bản ghi đó trong [[account]].' }
      ]
    }
  },
  terms: {
    title: { vi: 'Điều khoản sử dụng', en: 'Terms of use' },
    sections: {
      en: [
        { id: 'who', heading: 'Who may use CINEMATCH', body: 'Film professionals preparing or supporting a shoot in Vietnam. You must give true details about yourself and your company.' },
        { id: 'roles', heading: 'Accounts and roles', body: 'A new account is a member account. Partner, VFDA staff, Legal Board and admin roles are granted only by a VFDA admin; every grant is recorded.' },
        { id: 'information', heading: 'Information, not legal approval', body: 'Checks and checklists help you prepare. They cite rules written by the VFDA Legal Board, but only the competent authority approves a permit.' },
        { id: 'partners', heading: 'Partner content', body: 'Profile text and photos published by partners are reviewed by VFDA before they are shown; the last approved version stays public meanwhile.' },
        { id: 'ending', heading: 'Ending your account', body: 'You may delete your account at any time in [[account]]. VFDA may deactivate an account that breaks these terms. Accounts are deactivated, never erased; see the [[privacy]].' },
        { id: 'acceptance', heading: 'Acceptance', body: 'You accept these terms by ticking the box when you [[signup]]. We record the version and the date and time you accepted.' }
      ],
      vi: [
        { id: 'who', heading: 'Ai được dùng CINEMATCH', body: 'Người làm phim đang chuẩn bị hoặc hỗ trợ một đợt quay tại Việt Nam. Bạn phải cung cấp thông tin đúng về bản thân và công ty.' },
        { id: 'roles', heading: 'Tài khoản và vai trò', body: 'Tài khoản mới là tài khoản thành viên. Vai trò đối tác, nhân viên VFDA, Hội đồng pháp lý và quản trị chỉ do quản trị viên VFDA cấp; mọi lần cấp đều được ghi lại.' },
        { id: 'information', heading: 'Thông tin tham khảo, không phải phê duyệt pháp lý', body: 'Các bước kiểm tra và danh mục giúp bạn chuẩn bị. Chúng trích dẫn quy định do Hội đồng pháp lý VFDA soạn, nhưng chỉ cơ quan có thẩm quyền mới cấp giấy phép.' },
        { id: 'partners', heading: 'Nội dung của đối tác', body: 'Nội dung hồ sơ và ảnh do đối tác đăng được VFDA xem xét trước khi hiển thị; trong lúc đó, phiên bản được duyệt gần nhất vẫn công khai.' },
        { id: 'ending', heading: 'Chấm dứt tài khoản', body: 'Bạn có thể xoá tài khoản bất cứ lúc nào trong [[account]]. VFDA có thể vô hiệu hoá tài khoản vi phạm các điều khoản này. Tài khoản chỉ bị vô hiệu hoá, không bao giờ bị xoá hẳn; xem [[privacy]].' },
        { id: 'acceptance', heading: 'Chấp nhận', body: 'Bạn chấp nhận các điều khoản này bằng cách đánh dấu vào ô khi [[signup]]. Chúng tôi ghi lại phiên bản cùng ngày giờ bạn chấp nhận.' }
      ]
    }
  }
};

// Versions whose text CINEMATCH holds. Earlier versions accepted in the seed (2026.1) have no stored text:
// asking for one shows the current version with the "does not exist" notice (research Open question 17).
const VERSIONS = () => ({ [currentConsentVersion()]: { date: null, draft: true, ...DRAFT } });

export const DOCUMENT_KINDS = Object.freeze(['privacy', 'terms']);

/**
 * @param {'privacy'|'terms'} kind
 * @param {string} [version] ?version= from the URL; unknown → current version with requestedMissing
 */
export function getDocument(kind, version) {
  const versions = VERSIONS();
  const current = currentConsentVersion();
  const chosen = version && versions[version] ? version : current;
  const entry = versions[chosen];
  return {
    kind,
    version: chosen,
    date: entry.date,
    draft: entry.draft,
    title: entry[kind].title,
    sections: entry[kind].sections,
    requestedMissing: Boolean(version) && !versions[version]
  };
}

/** Versions with stored text, newest first (SC-42 *Earlier versions*). */
export const storedVersions = () => Object.keys(VERSIONS()).sort().reverse();
