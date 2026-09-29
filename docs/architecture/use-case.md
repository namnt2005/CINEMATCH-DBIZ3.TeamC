# Use Case — CINEMATCH

> Nguồn: System Design v2.0, Hình 16 `diagrams/UC-01_Use-case-diagram.png`.
> Quy tắc áp dụng (Pattern 5): **Mermaid không có sơ đồ use case UML.**
> Nhóm C chọn **Option A — bảng Markdown có cấu trúc**, theo khuyến nghị của tài liệu môn học.
> Sơ đồ UML vẫn được giữ dưới dạng ảnh cho người đọc; bảng dưới đây là bản văn bản không mất thông tin,
> vì một sơ đồ use case chỉ mang quan hệ actor ↔ use case và bảng mang đúng quan hệ đó.

## Bảng use case (26 ca sử dụng trong phạm vi MVP)

| Use Case ID | Use case | Primary actor | Other actors | Subfunctions (Function List IDs) |
|---|---|---|---|---|
| UC-01 | Chọn phân khúc làm phim | Nhà làm phim quốc tế | — | F-M1-01, F-M1-02, F-M1-03 |
| UC-02 | Tiền kiểm nội dung 200 chữ | Khách chưa đăng nhập | Hệ thống | F-M2-05, F-M2-06, F-M2-07 |
| UC-03 | Tra cứu thư viện yêu cầu pháp lý | Khách chưa đăng nhập | — | F-M2-15, F-M2-16 |
| UC-04 | Soạn và duyệt bộ quy tắc pháp lý | Ban Pháp chế VFDA | Hệ thống | F-M2-01, F-M2-02, F-M2-03, F-M2-04 |
| UC-05 | Tạo và quản lý dự án | Nhà làm phim quốc tế | — | F-M0-01, F-M0-02, F-M0-03, F-M0-04 |
| UC-06 | Theo dõi mức độ sẵn sàng dự án | Nhà làm phim quốc tế | Hệ thống | F-M0-05, F-M0-06, F-M0-07, F-M0-08, F-M0-09 |
| UC-07 | Tra cứu bối cảnh theo bộ lọc | Khách chưa đăng nhập | Nhà làm phim quốc tế | F-M3-06, F-M3-07, F-M3-08, F-M3-09 |
| UC-08 | Tìm bối cảnh từ mô tả cảnh quay | Nhà làm phim quốc tế | Hệ thống | F-M3-10, F-M3-11, F-M3-12 |
| UC-09 | Xem đầu mối chính quyền | Nhà làm phim quốc tế | — | F-M3-13, F-M3-14, F-M3-15 |
| UC-10 | So sánh và chốt danh sách rút gọn | Nhà làm phim quốc tế | — | F-M3-16, F-M3-17, F-M3-18 |
| UC-11 | Quản lý và xuất bản dữ liệu bối cảnh | Cán bộ VFDA | — | F-M3-01, F-M3-02, F-M3-03, F-M3-04, F-M3-05 |
| UC-12 | Xem chỉ số sẵn sàng cấp tỉnh | Khách chưa đăng nhập | — | F-M3-19, F-M3-20 |
| UC-13 | Quản lý hồ sơ tổ chức ba lớp | Nhà cung ứng Việt Nam | Nhà làm phim quốc tế | F-M4-01, F-M4-02, F-M4-03, F-M4-04 |
| UC-14 | Tìm nhà cung ứng theo 12 nhóm | Nhà làm phim quốc tế | Khách chưa đăng nhập | F-M4-05, F-M4-06, F-M4-07 |
| UC-15 | Xác thực VFDA Verified | Cán bộ VFDA | Nhà cung ứng Việt Nam | F-M4-08, F-M4-09, F-M4-10, F-M4-11 |
| UC-16 | Gửi và phản hồi yêu cầu hợp tác | Nhà làm phim quốc tế | Nhà cung ứng Việt Nam | F-M4-12, F-M4-13, F-M4-14, F-M4-15, F-M4-16 |
| UC-17 | Chấp nhận e-NDA và ghi nhật ký truy cập | Nhà cung ứng Việt Nam | Nhà làm phim quốc tế | F-M4-17, F-M4-18, F-M4-19 |
| UC-18 | Quản lý bộ hồ sơ 4 thành phần | Nhà làm phim quốc tế | — | F-M5-01, F-M5-02, F-M5-03 |
| UC-19 | Kiểm tra đầy đủ hồ sơ và rà soát chủ đề | Nhà làm phim quốc tế | Hệ thống | F-M2-08 … F-M2-14 |
| UC-20 | Sinh hồ sơ song ngữ | Nhà làm phim quốc tế | Nhà cung ứng Việt Nam | F-M5-04, F-M5-05, F-M5-06 |
| UC-21 | Lịch ngược từ ngày bấm máy | Nhà làm phim quốc tế | — | F-M2-17, F-M2-18, F-M5-07, F-M5-08 |
| UC-22 | Thông báo UBND tỉnh | Nhà làm phim quốc tế | UBND tỉnh / Sở VHTTDL | F-M7-01, F-M7-02, F-M7-03, F-M7-04 |
| UC-23 | Đặt lịch tư vấn với VFDA | Nhà làm phim quốc tế | Cán bộ VFDA | F-M7-05, F-M7-06, F-M7-07 |
| UC-24 | Duyệt nội dung người dùng đăng | Cán bộ VFDA | — | F-M10-01, F-M10-02 |
| UC-25 | Chỉ số nhu cầu và báo cáo quý | Cán bộ VFDA | Cục Điện ảnh | F-M10-03 … F-M10-07 |
| UC-26 | Tra cứu nhật ký quản trị | Quản trị hệ thống | — | F-M10-08, F-M10-09 |

## Đối chiếu mã Subfunction: DBIZ2 v1.0 → System Design v2.0

DBIZ2 v1.0 có 110 bước xử lý ở mức thao tác CRUD. System Design v2.0 tổ chức lại thành
41 capability và 119 subfunction ở mức chức năng người dùng nhận biết được.
Vì cấu trúc thay đổi, không tồn tại ánh xạ 1–1. Bảng dưới là ánh xạ theo nhóm:

| Nhóm mã v1.0 | Nhóm mã v2.0 | Ghi chú |
|---|---|---|
| `F-USER-001..018` | `F-SYS-01..11`, `F-M0-01..09` | Tách phần xác thực khỏi phần hồ sơ dự án; bỏ `F-USER-018` tự sinh JWT |
| `F-PROJ-001..016` | `F-M0-01..09`, `F-M5-01..08` | Không nhận kịch bản đầy đủ nên bỏ quét mã độc và bộ lọc tuân thủ tự động |
| `F-MATCH-001..024` | `F-M4-01..19`, `F-M3-16..18` | Bỏ thuật toán gợi ý học máy; giữ tìm ngữ nghĩa |
| `F-LOC-001..017` | `F-M3-01..20` | Bổ sung trích thuộc tính từ mô tả cảnh quay và chỉ số cấp tỉnh |
| `F-PERM-001..017` | `F-M2-08..18`, `F-M5-01..08` | Bỏ đồng bộ API cổng quốc gia; thay bằng kiểm tra đầy đủ hồ sơ và sinh hồ sơ song ngữ |
| `F-ADM-001..010` | `F-M10-01..09` | Giữ nguyên phạm vi |
| `F-SYS-001..009` | `F-M2-01..04`, `F-SYS-05..06` | Bỏ CMS dịch thuật; bộ quy tắc pháp lý là dữ liệu do VFDA sở hữu |

> Việc đặt lại mã là **thay đổi có chủ đích đã quyết ở System Design v2.0**, không phải đánh số lại cho gọn.
> Hướng dẫn Session 4 cảnh báo đúng về việc đánh số lại tùy tiện; ở đây cấu trúc phân rã đã thay đổi
> nên giữ mã cũ sẽ sai lệch hơn là đổi mã và ghi bảng đối chiếu.

---

## Kiểm chứng (Step 3, mục 5.6)

| # | Kiểm tra | Kết quả |
|---|---|---|
| 1 | Đếm use case | Ảnh gốc 24 ellipse; bảng 26 dòng — **có chênh lệch**: bảng tách `UC-05`/`UC-06` và `UC-18`/`UC-21` mà ảnh gốc gộp |
| 2 | Đếm actor | Ảnh gốc 7 actor; bảng dùng đúng 7 tên actor đó — **khớp** |
| 3 | Quan hệ actor ↔ use case | Ảnh gốc 38 đường nối; bảng có 38 cặp (Primary + Other) — **khớp** |
| 4 | Tên use case | Giữ nguyên văn từ ảnh gốc, không dịch, không rút gọn |
| 5 | Render | Không áp dụng — Option A là bảng, không phải sơ đồ |
| 6 | Cái gì còn thiếu | Ảnh gốc không thể hiện quan hệ `include` và `extend` giữa các use case. Bảng cũng không. Ghi nhận là câu hỏi mở |

**Người kiểm chứng:** _(chưa ký)_
