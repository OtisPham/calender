# Lịch Cá Nhân Tích Hợp Lịch Âm, Lịch Dạy Học & Bảng Tính Lương MindX (PWA)

Ứng dụng Web Đơn Trang (Single Page Application - SPA) chuẩn PWA được xây dựng bằng **HTML5, Tailwind CSS và JavaScript thuần**, tích hợp sâu giữa:
1. **Lịch Âm Thiên Văn**: Tự động tính Khóa Lễ Sám Hối (14 & cuối tháng) và Lễ Phóng Sanh (Chủ Nhật đầu tiên sau ngày 15 ÂL).
2. **Quản Lý Lịch Dạy Học (14 Tuần)** & **Kiểm Tra Xung Đột (Quy tắc đệm 30 phút)**.
3. **Bảng Tính Lương & Tổng Hợp Thu Nhập Cuối Tháng (Chuẩn Quy Chế MindX - Rank T0)**.

---

## 💰 CƠ CHẾ TÍNH LƯƠNG GIẢNG DẠY MINDX (RANK T0)

Mức lương cơ sở mặc định theo **Rank T0**: **70.000 VNĐ / giờ** *(Có thể tùy chỉnh hoặc nâng rank T1: 90k, T2: 100k ngay trên giao diện web)*.

### 1. Đối với Lớp Học Chính Thức
- **Vai trò Giảng viên (LEC):**
  - Sĩ số lớp $> 3$ học viên: $100\% \times \text{Lương theo giờ} \times \text{Số giờ dạy}$.
  - Sĩ số lớp $\le 3$ học viên (thiếu sĩ số): $75\% \times \text{Lương theo giờ} \times \text{Số giờ dạy}$.
  - Đối với các mã lớp mô hình $1-1; 1-2; 1-3$: $100\% \times \text{Lương theo giờ} \times \text{Số giờ dạy}$.
- **Vai trò Trợ giảng (TA):**
  - Luôn tính: $75\% \times \text{Lương theo giờ} \times \text{Số giờ dạy}$.

### 2. Dạy Bù (Make up)
- Sĩ số $\le 3$ học sinh: $75\% \times \text{Lương theo giờ} \times \text{Số giờ dạy}$ ($1\text{h}/1\text{ ca}$, ca trên $2\text{h}$ cần duyệt từ TM).
- Sĩ số $> 3$ học sinh: $100\% \times \text{Lương theo giờ} \times \text{Số giờ dạy}$ (tính như lớp học bình thường).

### 3. Ca Trải Nghiệm (Trial)
- **Trực trải nghiệm Offline tại cơ sở:**
  - Ca bình thường: **100.000 VNĐ / ca** ($3 - 4\text{ giờ}$) + **20.000 VNĐ / học sinh** trải nghiệm.
  - Hủy sát giờ (trước $10 - 60$ phút):
    - GV chưa đến cơ sở: **0 VNĐ** (Không tính công).
    - GV đã đến cơ sở (ở lại trực 30 phút): **50.000 VNĐ / ca trực**.
    - Cơ sở vẫn cần GV trực đầy đủ ca ($3\text{ giờ}$): **80.000 VNĐ**.
- **Trực trải nghiệm Online:**
  - Ca bình thường:
    - 1 học viên: **40.000 VNĐ / ca**.
    - 2 học viên: **60.000 VNĐ / ca**.
    - 3 học viên: **80.000 VNĐ / ca**.
  - Hủy sát giờ (trước $10 - 30$ phút): **40.000 VNĐ / ca**.

### 4. Tổng Hợp Cuối Tháng
- Website tự động tổng hợp:
  - **Tổng thu nhập tháng** (VNĐ).
  - **Tổng số giờ dạy thực tế**.
  - **Cơ cấu buổi dạy:** Số buổi LEC, TA, Dạy bù, Ca Trial.
  - **Bảng kê chi tiết từng buổi:** Ngày, giờ, khóa học, vai trò, % lương, thành tiền.

---

## 📋 TÍNH NĂNG ÂM LỊCH & QUY TẮC ĐỆM 30 PHÚT

### 1. Lịch Âm Lịch (Phóng Sanh & Sám Hối)
- **Khóa Lễ Sám Hối:**
  - Ngày 14 Âm lịch: **16:00 đến 20:00**.
  - Ngày cuối tháng Âm lịch (Tự động nhận diện tháng thiếu 29 hay tháng đủ 30): **16:00 đến 20:00**.
- **Lễ Phóng Sanh:**
  - **CHỈ DIỄN RA VÀO NGÀY CHỦ NHẬT ĐẦU TIÊN SAU NGÀY 15 ÂM LỊCH (RẰM)**.
  - Khung giờ: **05:00 đến 08:00 sáng**.
  - *Ví dụ:* 15 ÂL là Thứ Bảy $\rightarrow$ Chủ Nhật ngày 16 ÂL là ngày Phóng Sanh; 15 ÂL là Thứ Ba $\rightarrow$ Chủ Nhật cuối tuần đó là ngày Phóng Sanh.

### 2. Quy Tắc Đệm 30 Phút (Kiểm Tra Xung Đột)
- Hai sự kiện bất kỳ trong ngày KHÔNG được trùng giờ và phải cách nhau tối thiểu **30 phút**:
  $$\text{Xung Đột} \iff (startA < endB + 30) \land (startB < endA + 30)$$
- Các buổi dạy 14 tuần bị trùng hoặc cách giờ Sám hối (16:00 - 20:00) dưới 30 phút được **đánh dấu nền đỏ toàn bộ dòng kèm cảnh báo chi tiết**.

---

## 🎨 GIAO DIỆN & TÍNH NĂNG "LỚP MỚI" (/design-taste-frontend)

Ứng dụng được thiết kế theo tiêu chuẩn công thái học cao cấp (tactile UI), hạn chế tối đa việc gõ phím thủ công:
1. **Nút "➕ Lớp Mới" Nổi Bật:**
   - Đặt cố định ngay trên thanh công cụ điều hướng trên cùng, bấm 1 chạm để chuyển ngay đến form thêm lớp học mới từ bất kỳ màn hình nào.
2. **Chi Nhánh MindX & Sĩ Số Học Viên:**
   - **Chi nhánh:** Menu sổ xuống tích hợp chính xác 5 cơ sở giảng dạy của bạn kèm Mã cơ sở + Tùy chọn Online:
     1. `39HTLO` - MindX Hải Thượng Lãn Ông
     2. `490PTB` - MindX Phú Mỹ Hưng
     3. `6183/2` - MindX Đường 3 Tháng 2
     4. `165-167NTT` - MindX Him Lam
     5. `343PNL` - MindX Phạm Ngũ Lão
     6. `MindX Online` (Zoom / Google Meet)
   - **Bộ đếm Sĩ số Tactile Stepper (`−` / `+`):** Bấm tăng giảm trực quan số lượng học sinh kèm huy hiệu phản hồi tức thì về mức % lương được hưởng:
     - Sĩ số $> 3$ HS: Đủ sĩ số $\rightarrow 100\%$ lương theo giờ.
     - Sĩ số $\le 3$ HS: Thiếu sĩ số $\rightarrow 75\%$ lương theo giờ.
     - Lớp 1-1: $\rightarrow 100\%$ lương theo giờ.
3. **Cải Thiện Giao Diện Chọn Thời Gian & Khung Giờ:**
   - **8 Nút Khung Giờ Ca Học Chuẩn MindX (1 chạm):**
     - Sáng 1: `08:00 - 10:00` (2h) | Sáng 2: `09:30 - 11:30` (2h)
     - Chiều 1: `14:00 - 16:00` (2h) | Chiều 2: `15:30 - 17:30` (2h)
     - Tối 1: `17:30 - 19:30` (2h) | Tối 2: `18:00 - 20:00` (2h)
     - Tối 3: `18:00 - 20:30` (2.5h) | Tối 4: `19:30 - 21:30` (2h)
   - **Pill Thời Lượng Nhanh:** Các nút `+1.0h`, `+1.5h`, `+2.0h`, `+2.5h`, `+3.0h` tự động cộng dồn từ giờ bắt đầu.
   - **Tùy chỉnh giờ thủ công:** Hỗ trợ nhập giờ bắt đầu và kết thúc tự do.
4. **Hộp Ước Tính Lương Tức Thì (Live Salary Estimator):**
   - Tự động tính và hiển thị ngay trong form: Tỷ lệ áp dụng, số giờ/buổi, lương ước tính 1 buổi và tổng dự toán thu nhập cho toàn bộ khóa học 14 tuần.
5. **Bộ Lọc Lịch Dạng Menu Sổ Xuống (Dropdown Checkbox):**
   - Thay thế toàn bộ hàng filter dàn trải cũ bằng một nút bấm gọn gàng **"👁️ Bộ Lọc Lịch [4]"** kèm menu sổ xuống có checkbox cho từng loại lịch (Phóng Sanh, Sám Hối, Lịch Dạy, Cá Nhân) cùng nút chọn nhanh "Tất cả / Tắt", không còn bị tràn màn hình.

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY
1. Mở file `index.html` trực tiếp bằng trình duyệt (Chrome, Edge, Safari...).
2. Bấm nút **"➕ Lớp Mới"** để tạo lịch dạy 14 tuần, chọn khung giờ ca học và chi nhánh.
3. Bấm vào tab **"💰 Bảng Tính Lương Tháng"** để xem thu nhập tổng hợp cuối tháng.
4. Có thể bấm nút **"Cài Đặt App"** để cài thành ứng dụng độc lập trên điện thoại hoặc máy tính (PWA Offline).
