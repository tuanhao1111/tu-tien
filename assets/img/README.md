# 🖼️ Ảnh game — Tiên Đồ Lộ

Bỏ file ảnh vào **thư mục này** đúng tên là ảnh tự hiện trong game (không cần sửa code).
Hệ thống đọc qua `../assets.js`. Thiếu ảnh nào thì chỗ đó **không hiện gì** (game vẫn chạy bình thường).

## Quy ước tên file
Đuôi hỗ trợ: `png`, `jpg`, `jpeg`, `gif`, `webp` (ưu tiên theo thứ tự đó).

| Loại | Tên file | Hiển thị |
|---|---|---|
| Cảnh giới | `realm_<index>.png` | **banner** (cuối embed Hồ Sơ) |
| Môn phái | `sect_<id>.png` | **thumbnail** (góc phải embed Môn Phái) |
| Panel kênh | `panel_<key>.png` | **banner** (cuối panel) |

### `realm_<index>` — index khớp `cultivation.REALMS` (0..9)
`0` Phàm Nhân · `1` Luyện Khí · `2` Trúc Cơ · `3` Kim Đan · `4` Nguyên Anh ·
`5` Hóa Thần · `6` Luyện Hư · `7` Đại Thừa · `8` Độ Kiếp · `9` Tiên Nhân

### `sect_<id>` — id môn phái
`kiem_tong` · `huyen_hoa` · `dan_dinh` · `cuong_the` · `huyet_ma` · `phong_linh`

### `panel_<key>` — key panel (khớp `panels.js` PANELS)
`soNhap` · `tuLuyen` · `dotPha` · `nhiemVu` · `monPhai` · `hoSo` ·
`luyenTruong` · `dauDai` · `bangXepHang`

## Ví dụ
- `assets/img/realm_3.png` → ảnh banner cho Kim Đan trên Hồ Sơ.
- `assets/img/sect_kiem_tong.png` → thumbnail Kiếm Tông.
- `assets/img/panel_soNhap.png` → banner panel Sơ Nhập.

## Dùng URL thay vì file (tùy chọn)
Nếu host ảnh ngoài (imgur / Discord CDN…), điền URL vào 3 map trong `assets.js`:
```js
const REALM_URL = { 3: 'https://i.imgur.com/abc.png' };
const SECT_URL  = { kiem_tong: 'https://…' };
const PANEL_URL = { soNhap: 'https://…' };
```
URL được **ưu tiên** hơn file local cùng loại.

## Lưu ý
- Đổi/ thêm ảnh local khi bot ĐANG chạy: cần **restart** bot (kết quả dò file được cache).
- Panel: chạy lại `/setup` để cập nhật ảnh lên message panel đã đăng.
- Khuyến nghị: ảnh ngang ~16:9 cho banner, vuông cho thumbnail; giữ dung lượng nhỏ.
