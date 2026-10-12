# Ứng dụng Tra Cứu Từ Điển Mã Loại Đất Việt Nam

Ứng dụng web tra cứu từ điển mã loại đất Việt Nam qua các thời kỳ pháp luật (từ giai đoạn Chỉ thị 299/TTg năm 1980 đến Luật Đất đai 2024 hiện hành).

Ứng dụng chạy hoàn toàn phía client (trình duyệt web), không cần cơ sở dữ liệu backend, có thể mở trực tiếp từ tệp cục bộ (`file:///...`) hoặc triển khai trên bất kỳ dịch vụ tĩnh nào (GitHub Pages, Vercel, Netlify...).

---

## 1. Tính năng Nổi bật

- **Tìm kiếm tức thời (Instant Search):**
  - Tìm kiếm theo ký hiệu mã (`LUC`, `ONT`, `ODT`, `T`, `COC`, `HLD`, `RPK`...).
  - Tìm kiếm theo tên loại đất (hỗ trợ cả tiếng Việt có dấu và không dấu: "thổ cư", "tho cu", "đất lúa", "nương rẫy"...).
  - Tìm kiếm theo điều luật trích dẫn ("Điều 141", "Điều 210", "Thông tư 08", "Nghị định 102"...).
  - Phím tắt tiện lợi: Bấm `/` hoặc `Ctrl + K` để chuyển nhanh vào ô tìm kiếm.

- **Bộ lọc đa chiều:**
  - Lọc theo nhóm đất: *Nông nghiệp*, *Phi nông nghiệp*, *Chưa sử dụng*, *Hành lang bảo vệ an toàn & Hạn chế quyền*, *Chỉ tiêu quy hoạch*, *Đối tượng quản lý & sử dụng đất*.
  - Lọc theo thời kỳ pháp lý: *Luật Đất đai 2024*, *Luật Đất đai 2013*, *Luật Đất đai 2003*, *Giai đoạn 1993 - 2001*, *Chỉ thị 299/TTg*.

- **Thông tin chi tiết chuyên sâu:**
  - **Trục thời gian chuyển đổi (Timeline):** Sơ đồ diễn tiến kết nối mã đất xuyên suốt 5 thời kỳ từ năm 1980 đến nay.
  - **Thông số màu bản đồ hiện trạng (RGB):** Hiển thị mẫu màu và mã màu RGB / HEX theo Thông tư 27/2018/TT-BTNMT (click ô mẫu màu để sao chép mã Hex).
  - **Bảng đối chiếu đa văn bản:** Bảng so sánh trực diện ký hiệu mã qua từng Thông tư và Quyết định chuyên ngành — **click vào bất kỳ ký hiệu mã nào trong bảng để tra cứu tiếp mã đó**.
  - **Hộp thông tin pháp lý đặc thù:**
    - Căn cứ công nhận hạn mức đất ở theo **Điều 141 Luật Đất đai 2024** và Điều 27 Nghị định 101/2024/NĐ-CP (đối với đất `T`, `V`, `Ao` thời kỳ 299).
    - Ranh giới và điều kiện hạn chế quyền sử dụng đất trong hành lang an toàn công trình theo **Điều 210 Luật Đất đai 2024** (`HLD`, `HLR`, `HLS`, `HLM`, `DHL`).
    - Quy định về thẩm quyền đính chính sai sót CSDL địa chính theo **Khoản 1 Điều 152 Luật Đất đai 2024** và **Điều 45 Nghị định 101/2024/NĐ-CP**.
  - **Danh mục 22 văn bản pháp luật:** Bảng tra cứu toàn văn danh mục văn bản quy phạm pháp luật căn cứ từ 1980 đến 2024.

- **QoL (tiện ích nâng cao):**
  - **Đếm số lượng theo nhóm** hiển thị trực tiếp trên từng pill bộ lọc.
  - **Đánh dấu (highlight) từ khóa** khớp trong danh sách kết quả tìm kiếm.
  - **Lịch sử tra cứu gần đây** (tối đa 8 mục, lưu `localStorage` tại máy người dùng).
  - **Chip tra nhanh mã phổ biến** tại màn hình khởi đầu (`LUC`, `ONT`, `CLN`, `HLD`, `T`, `TSQ`...).
  - **In / Xuất PDF** hồ sơ chi tiết mã đất (bộ lọc in tự ẩn các phần giao diện không cần thiết).

---

## 2. Cấu trúc Thư mục

```text
├── index.html       # Giao diện người dùng Semantic HTML5
├── app.css          # Bảng định kiểu giao diện phong cách công sở GIS
├── app.js           # Động cơ tìm kiếm, lọc và điều hướng client-side
├── data.js          # Cơ sở dữ liệu tĩnh (185 bản ghi mã đất & 22 văn bản pháp lý)
└── README.md        # Tài liệu hướng dẫn sử dụng
```

---

## 3. Cách Sử dụng

### Cách 1: Mở trực tiếp (Không cần cài đặt, không cần mạng)
Nhấp đúp chuột vào tệp `index.html` để mở trong bất kỳ trình duyệt nào (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari...).

### Cách 2: Triển khai GitHub Pages
Vào phần **Settings** của repository trên GitHub $\rightarrow$ **Pages** $\rightarrow$ chọn nhánh `main` (thư mục root `/`) $\rightarrow$ Nhấn **Save**. Trang web sẽ được xuất bản trực tuyến miễn phí.
