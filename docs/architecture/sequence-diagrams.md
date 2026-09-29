# Sequence Diagrams — CINEMATCH

> Nguồn: System Design v2.0. Ảnh gốc: `diagrams/SEQ-01..SEQ-12`.
> Quy tắc áp dụng (Pattern 4): **participant phải là bộ phận thật của hệ thống, không phải chức danh**.
> Mũi tên liền `->>` là lời gọi, mũi tên đứt `-->>` là giá trị trả về, `Note over` là quy tắc gắn với một bước.
>
> Hướng dẫn Step 3 mục 5.4 yêu cầu dùng `alt / else` cho nhánh lỗi. Các sequence dưới đây **giữ nguyên
> cấu trúc tuần tự của ảnh gốc** vì ảnh gốc không vẽ nhánh lỗi. Chỗ nào thiếu nhánh lỗi đã được ghi
> vào bảng kiểm chứng ở cuối file để đưa vào mục 10 của Spec Document ở Step 5.


---

## SEQ-01 — Đăng ký và đăng nhập

*Ảnh gốc: `diagrams/SEQ-01_Dang-ky-Dang-nhap.png` (Hình 4). Participant: 5 · Message: 11.*

```mermaid
sequenceDiagram
    actor GU as Khách chưa đăng nhập
    participant FE as Ứng dụng Next.js
    participant AU as Supabase Auth
    participant DB as Supabase PostgreSQL + RLS
    participant MAIL as Resend

    GU->>FE: Nhập email, mật khẩu, tên tổ chức
    FE->>FE: Kiểm tra định dạng bằng Zod
    FE->>AU: signUp(email, password)
    AU->>MAIL: Gửi email xác thực
    AU-->>FE: Trả về user chưa xác thực
    GU->>FE: Bấm liên kết xác thực trong email
    FE->>AU: verifyOtp(token)
    AU->>DB: Tạo bản ghi profiles, role = member
    DB-->>AU: Profile ID
    AU-->>FE: Phiên đăng nhập
    FE-->>GU: Chuyển tới màn hình chọn phân khúc
    Note over DB: Không tự sinh JWT, không tự băm mật khẩu — dùng Supabase Auth
```

> Vai trò được gán ở tầng CSDL và thực thi bằng RLS, không kiểm soát ở giao diện.


---

## SEQ-02 — Tiền kiểm nội dung 200 chữ (không cần đăng ký)

*Ảnh gốc: `diagrams/SEQ-02_Tien-kiem-200-chu.png` (Hình 5). Participant: 5 · Message: 11.*

```mermaid
sequenceDiagram
    actor GU as Khách chưa đăng nhập
    participant FE as Ứng dụng Next.js
    participant EF as Edge Function
    participant DB as Supabase PostgreSQL + RLS
    participant AI as API mô hình ngôn ngữ

    GU->>FE: Dán tóm tắt tối đa 200 chữ
    FE->>FE: Kiểm tra giới hạn số lần gọi
    FE->>EF: preCheck(text)
    EF->>DB: Đọc legal_rules đã duyệt
    DB-->>EF: Danh sách quy tắc + trích dẫn
    EF->>AI: Gọi mô hình kèm bộ quy tắc, structured output
    AI-->>EF: findings[] (rule_code, quoted_text)
    EF->>EF: Loại bỏ phát hiện có trích dẫn không tồn tại
    EF->>DB: Ghi bản ghi vào briefs
    EF-->>FE: Danh sách chủ đề cần lưu ý
    FE-->>GU: Hiển thị cảnh báo kèm điều khoản
    Note over EF: Không kết luận được duyệt hay không — chỉ nêu vấn đề để con người xem xét
```

> Mỗi lượt tiền kiểm là một điểm dữ liệu cho chỉ số nhu cầu của VFDA.


---

## SEQ-03 — Tìm bối cảnh từ mô tả cảnh quay

*Ảnh gốc: `diagrams/SEQ-03_Tim-boi-canh-tu-mo-ta.png` (Hình 6). Participant: 5 · Message: 10.*

```mermaid
sequenceDiagram
    actor U as Nhà làm phim
    participant FE as Ứng dụng Next.js
    participant EF as Edge Function
    participant AI as API mô hình ngôn ngữ
    participant DB as Supabase PostgreSQL + RLS

    U->>FE: Nhập mô tả cảnh quay tự do
    FE->>EF: extractSceneAttributes(text)
    EF->>AI: Trích thuộc tính theo khuôn định sẵn
    AI-->>EF: {scene_types, era, time_of_day, ...}
    EF->>EF: Kiểm chứng theo danh mục loại bối cảnh
    EF->>DB: search_locations(thuộc tính)
    DB->>DB: Chấm điểm 100 thang theo 6 tiêu chí
    DB-->>EF: Danh sách xếp hạng + match_reasons[]
    EF-->>FE: Kết quả kèm lý do khớp
    FE-->>U: Lưới thẻ địa điểm, mỗi thẻ nêu vì sao khớp
    Note over DB: Chỉ trả về địa điểm published = true và điểm từ 40 trở lên
```

> AI là bộ phân tích đầu vào; bộ chấm điểm tất định trong CSDL mới quyết định thứ hạng.


---

## SEQ-04 — Xem đầu mối chính quyền — kiểm soát bằng RLS

*Ảnh gốc: `diagrams/SEQ-04_Xem-dau-moi-chinh-quyen.png` (Hình 7). Participant: 4 · Message: 12.*

```mermaid
sequenceDiagram
    actor GU as Khách chưa đăng nhập
    actor U as Nhà làm phim
    participant FE as Ứng dụng Next.js
    participant DB as Supabase PostgreSQL + RLS

    GU->>FE: Mở trang chi tiết địa điểm
    FE->>DB: SELECT locations WHERE slug = ?
    DB-->>FE: Dữ liệu địa điểm công khai
    FE->>DB: SELECT location_authority_contacts
    DB->>DB: RLS: vai trò anon → 0 dòng
    DB-->>FE: Rỗng
    FE-->>GU: Hiển thị khối mời đăng ký thay cho đầu mối
    U->>FE: Đăng nhập rồi mở lại trang
    FE->>DB: SELECT location_authority_contacts
    DB->>DB: RLS: đã đăng nhập → trả dữ liệu
    DB-->>FE: Tên, điện thoại, email đầu mối
    FE-->>U: Hiển thị đầy đủ thông tin liên hệ
    Note over DB: Dữ liệu nhạy cảm không bao giờ rời CSDL với người chưa đủ quyền
```

> Kiểm chứng: xem nguồn trang ở cửa sổ ẩn danh, không được tìm thấy số điện thoại.


---

## SEQ-05 — So sánh bối cảnh và chốt danh sách rút gọn

*Ảnh gốc: `diagrams/SEQ-05_So-sanh-chot-shortlist.png` (Hình 8). Participant: 3 · Message: 10.*

```mermaid
sequenceDiagram
    actor U as Nhà làm phim
    participant FE as Ứng dụng Next.js
    participant DB as Supabase PostgreSQL + RLS

    U->>FE: Chọn tối đa 4 địa điểm để so sánh
    FE->>FE: Lưu lựa chọn tạm trong trình duyệt
    FE->>DB: Lấy dữ liệu 4 địa điểm
    DB-->>FE: Thuộc tính đầy đủ từng địa điểm
    FE-->>U: Bảng so sánh 8 hàng tiêu chí
    U->>FE: Bấm Chốt vào danh sách rút gọn
    FE->>DB: INSERT project_shortlist
    DB->>DB: Tính lại mặt đồng hồ Bối cảnh
    DB-->>FE: Điểm mức sẵn sàng mới
    FE-->>U: Bảng điều khiển cập nhật ngay
```

> Mỗi ô trong bảng so sánh là đạt, cảnh báo, hoặc cần kiểm tra — không để trống.


---

## SEQ-06 — Yêu cầu hợp tác và vòng phản hồi hai chiều

*Ảnh gốc: `diagrams/SEQ-06_Yeu-cau-hop-tac.png` (Hình 9). Participant: 5 · Message: 13.*

```mermaid
sequenceDiagram
    actor U as Nhà làm phim
    participant FE as Ứng dụng Next.js
    participant DB as Supabase PostgreSQL + RLS
    participant MAIL as Resend
    actor PT as Nhà cung ứng Việt Nam

    U->>FE: Chọn đối tác, chọn dự án, viết ghi chú
    FE->>DB: INSERT collab_requests (status = pending)
    DB->>MAIL: Webhook: gửi email thông báo
    MAIL->>PT: Bạn có một yêu cầu hợp tác mới
    PT->>FE: Mở hộp thư yêu cầu
    FE->>DB: SELECT chi tiết yêu cầu + dự án
    DB-->>FE: Thông tin yêu cầu
    PT->>FE: Chấp nhận / Từ chối / Cần thêm thông tin
    FE->>DB: UPDATE status + response_note
    DB->>DB: Mở lớp organization_private cho hai bên
    DB->>MAIL: Webhook: thông báo kết quả
    MAIL->>U: Đối tác đã chấp nhận yêu cầu của bạn
    DB->>DB: Cập nhật mặt đồng hồ Đối tác = 100%
    Note over DB: Năm trạng thái: pending, under_review, info_requested, accepted, declined
```

> Theo Điều 13 Luật Điện ảnh 2022, hồ sơ bắt buộc kèm thỏa thuận với đơn vị Việt Nam.


---

## SEQ-07 — Quy trình xác thực VFDA Verified

*Ảnh gốc: `diagrams/SEQ-07_VFDA-Verified.png` (Hình 10). Participant: 6 · Message: 14.*

```mermaid
sequenceDiagram
    actor PT as Nhà cung ứng Việt Nam
    participant FE as Ứng dụng Next.js
    participant ST as Supabase Storage
    participant DB as Supabase PostgreSQL + RLS
    actor VF as Cán bộ VFDA
    participant MAIL as Resend

    PT->>FE: Nộp giấy ĐKKD + 2 dự án tham chiếu
    FE->>ST: Tải tài liệu lên Storage
    ST-->>FE: Đường dẫn tài liệu
    FE->>DB: INSERT verification_request
    DB->>MAIL: Thông báo cho cán bộ VFDA
    MAIL->>VF: Có hồ sơ xác thực mới
    VF->>FE: Mở hàng đợi xác thực
    FE->>DB: SELECT hồ sơ chờ duyệt
    DB-->>FE: Danh sách hồ sơ
    VF->>FE: Duyệt hoặc từ chối kèm lý do
    FE->>DB: UPDATE verified, verified_by, verified_at
    DB->>DB: Ghi audit_log
    DB->>MAIL: Thông báo kết quả cho tổ chức
    MAIL->>PT: Tổ chức của bạn đã được VFDA xác thực
    Note over DB: Hệ thống tự nhắc xác thực lại sau 12 tháng
```

> Đây là cơ chế biến VFDA thành bên kiểm định của ngành mà không cần văn bản pháp lý mới.


---

## SEQ-08 — Kiểm tra tính đầy đủ hồ sơ theo Điều 13

*Ảnh gốc: `diagrams/SEQ-08_Kiem-tra-day-du-ho-so.png` (Hình 11). Participant: 4 · Message: 12.*

```mermaid
sequenceDiagram
    actor U as Nhà làm phim
    participant FE as Ứng dụng Next.js
    participant ST as Supabase Storage
    participant DB as Supabase PostgreSQL + RLS

    U->>FE: Mở bộ hồ sơ của dự án
    FE->>DB: SELECT required_documents theo phân khúc
    DB-->>FE: Danh mục 4 thành phần bắt buộc
    FE-->>U: Hiển thị danh mục và trạng thái từng mục
    U->>FE: Tải lên văn bản đề nghị và hợp đồng dịch vụ
    FE->>ST: Lưu tài liệu
    ST-->>FE: Đường dẫn
    FE->>DB: INSERT documents
    FE->>DB: check_dossier_completeness(project_id)
    DB->>DB: Đối chiếu tài liệu đã có với danh mục
    DB-->>FE: Đã có 2/4 · Thiếu: kịch bản tiếng Việt, cam kết Điều 9
    FE-->>U: Danh sách thành phần còn thiếu
    Note over DB: Logic tất định, không dùng mô hình ngôn ngữ — rủi ro gần bằng không
```

> Bốn thành phần theo Điều 13 khoản 3 Luật Điện ảnh 2022 (Luật số 05/2022/QH15).


---

## SEQ-09 — Rà soát chủ đề theo bộ quy tắc của VFDA

*Ảnh gốc: `diagrams/SEQ-09_Ra-soat-chu-de.png` (Hình 12). Participant: 5 · Message: 12.*

```mermaid
sequenceDiagram
    actor U as Nhà làm phim
    participant FE as Ứng dụng Next.js
    participant EF as Edge Function
    participant DB as Supabase PostgreSQL + RLS
    participant AI as API mô hình ngôn ngữ

    U->>FE: Chạy kiểm tra nội dung cho dự án
    FE->>EF: reviewTopics(project_id)
    EF->>DB: SELECT legal_rules WHERE approved_by IS NOT NULL
    DB-->>EF: Bộ quy tắc + số phiên bản
    EF->>AI: Đối chiếu tóm tắt với danh mục quy tắc
    AI-->>EF: findings[] kèm quoted_text
    EF->>EF: Loại phát hiện có rule_code lạ hoặc trích dẫn không có thật
    EF->>DB: INSERT compliance_runs (rule_version)
    EF->>DB: INSERT compliance_findings
    EF-->>FE: Danh sách phát hiện đã lọc
    FE-->>U: Hiển thị kèm điều khoản và tuyên bố miễn trừ
    U->>FE: Đánh dấu đã xem xét từng phát hiện
    Note over EF: Không hiển thị bất kỳ cảnh báo nào thiếu trích dẫn điều khoản
```

> Hệ thống không diễn giải luật — chỉ vận hành bộ quy tắc do VFDA soạn và ký duyệt.


---

## SEQ-10 — Sinh hồ sơ song ngữ

*Ảnh gốc: `diagrams/SEQ-10_Sinh-ho-so-song-ngu.png` (Hình 13). Participant: 6 · Message: 12.*

```mermaid
sequenceDiagram
    actor U as Nhà làm phim
    participant FE as Ứng dụng Next.js
    participant EF as Edge Function
    participant AI as API mô hình ngôn ngữ
    participant ST as Supabase Storage
    actor PT as Nhà cung ứng Việt Nam

    U->>FE: Yêu cầu sinh kịch bản tóm tắt tiếng Việt
    FE->>EF: generateBilingual(project_id)
    EF->>AI: Dịch và định dạng theo cấu trúc quy định
    AI-->>EF: Bản tiếng Việt có cấu trúc
    EF->>EF: Dựng PDF hai cột đối chiếu Anh–Việt
    EF->>EF: Đóng dấu BẢN NHÁP — CẦN HIỆU ĐÍNH mọi trang
    EF->>ST: Lưu tệp PDF
    ST-->>EF: Đường dẫn tệp
    EF-->>FE: Tệp đã sẵn sàng
    FE-->>U: Tải bản nháp về
    U->>PT: Gửi cho đối tác Việt Nam hiệu đính
    PT->>FE: Đánh dấu đã hiệu đính
    Note over EF: Không bao giờ tự động nộp — sản phẩm cuối là tệp để con người xử lý tiếp
```

> Luật yêu cầu kịch bản tóm tắt và kịch bản chi tiết phần quay tại Việt Nam bằng tiếng Việt.


---

## SEQ-11 — Thông báo UBND tỉnh khi có quan tâm bối cảnh

*Ảnh gốc: `diagrams/SEQ-11_Thong-bao-UBND-tinh.png` (Hình 14). Participant: 5 · Message: 11.*

```mermaid
sequenceDiagram
    actor U as Nhà làm phim
    participant FE as Ứng dụng Next.js
    participant DB as Supabase PostgreSQL + RLS
    participant MAIL as Resend
    actor PV as UBND tỉnh / Sở VHTTDL

    U->>FE: Bấm Quan tâm địa điểm này
    FE->>DB: INSERT location_interest (project_id, location_id)
    DB->>DB: Database webhook kích hoạt
    DB->>MAIL: Soạn thư kèm tóm tắt dự án
    MAIL->>PV: Có đoàn phim quan tâm bối cảnh tại địa phương
    PV->>FE: Mở liên kết phản hồi
    PV->>FE: Đã tiếp nhận / Cần thêm thông tin / Chưa hỗ trợ được
    FE->>DB: UPDATE trạng thái phản hồi
    DB->>MAIL: Thông báo cho nhà làm phim
    MAIL->>U: Địa phương đã phản hồi
    U->>FE: Xem trang theo dõi phối hợp địa phương
    Note over DB: Chi tiết này nằm trong Executive Summary của BA Report nhưng bị bỏ sót ở MVP v1
```

> Đây là chức năng duy nhất mà một sàn giao dịch tư nhân không thể sao chép.


---

## SEQ-12 — Chỉ số nhu cầu và báo cáo quý

*Ảnh gốc: `diagrams/SEQ-12_Chi-so-nhu-cau-Bao-cao-quy.png` (Hình 15). Participant: 5 · Message: 13.*

```mermaid
sequenceDiagram
    actor VF as Cán bộ VFDA
    participant FE as Ứng dụng Next.js
    participant DB as Supabase PostgreSQL + RLS
    participant EF as Edge Function
    participant AI as API mô hình ngôn ngữ

    VF->>FE: Mở bảng chỉ số nhu cầu
    FE->>DB: SELECT view demand_index (kỳ báo cáo)
    DB->>DB: Tổng hợp 6 chỉ số từ briefs và collab_requests
    DB-->>FE: Bộ số liệu
    FE-->>VF: Bảng số liệu và biểu đồ
    VF->>FE: Yêu cầu sinh báo cáo quý
    FE->>EF: generateQuarterlyReport(period)
    EF->>DB: Truy vấn số liệu nguồn
    DB-->>EF: Số liệu có truy vết
    EF->>AI: Soạn phần diễn giải từ số liệu
    AI-->>EF: Bản diễn giải
    EF->>EF: Dựng PDF mang thương hiệu VFDA
    EF-->>VF: Tệp báo cáo để cán bộ đọc lại trước khi gửi
    Note over EF: Mọi con số phải truy vết được về truy vấn CSDL, và một người phải đọc trước khi gửi
```

> Đây là tài sản thể chế VFDA chưa từng có — bằng chứng để đề nghị công nhận vai trò đầu mối.


---

## Kiểm chứng (Step 3, mục 5.6)

| # | Kiểm tra | Kết quả |
|---|---|---|
| 1 | Đếm participant | Tổng 58 participant trên 12 sequence — sinh trực tiếp từ cùng nguồn dữ liệu vẽ ảnh, **khớp tuyệt đối** |
| 2 | Đếm và truy vết message, kể cả chiều | Tổng 141 message — sinh trực tiếp từ cùng nguồn dữ liệu, **khớp tuyệt đối** |
| 3 | Nhánh quyết định | Ảnh gốc không vẽ nhánh `alt / else`. Bản Mermaid cũng không có — **giữ đúng nguyên tắc không tự thêm** |
| 4 | Tên participant | Không đổi tên, không dịch. Chức danh đã được thay bằng bộ phận hệ thống ngay từ ảnh gốc |
| 5 | Render và đặt cạnh ảnh gốc | Ảnh gốc trong thư mục `diagrams/` |
| 6 | Cái gì còn thiếu | **Toàn bộ 12 sequence đều thiếu nhánh lỗi.** Ví dụ: SEQ-02 không vẽ trường hợp API mô hình trả lỗi; SEQ-06 không vẽ trường hợp email không gửi được; SEQ-08 không vẽ trường hợp tệp tải lên vượt dung lượng. Đây là **câu hỏi mở**, phải vào mục 10 của Spec Document ở Step 5 |

**Người kiểm chứng:** _(chưa ký — cần một thành viên nhóm C đối chiếu rồi ghi tên vào đây)_

> Khối Mermaid ở file này được **sinh tự động từ đúng cấu trúc dữ liệu đã dùng để vẽ ảnh PNG**,
> nên rủi ro "AI đọc ảnh rồi bỏ sót một bước" bằng không ở bước chuyển đổi.
> Rủi ro còn lại nằm ở chỗ khác: **ảnh gốc có đúng không**. Đó mới là thứ con người phải kiểm.
