#!/usr/bin/env python3
# =====================================================================
#  TẠO BẢN PNG (cho THẺ ĐỘNG Satori) TỪ CÁC .webp ĐÃ NÉN.
#
#  Vì sao cần: pipeline ảnh động (Satori + resvg, dùng ở thẻ Shop / Hồ Sơ /
#  BXH / Túi Đồ) CHỈ đọc được PNG — resvg KHÔNG giải mã webp. Còn webp thì
#  hiển thị tốt ở embed (Discord tự render). Sau khi bạn nén ảnh -> webp bằng
#  _optimize.py, các thẻ động sẽ KHÔNG thấy ảnh nữa (chỉ hiện tile chữ).
#
#  Script này quét mọi .webp trong assets/img/ và tạo bản .png tương ứng đặt
#  vào assets/img/_originals_backup/ — nơi assets.dataUri() ĐỌC ĐẦU TIÊN.
#  -> Thẻ động hiện ảnh thật, webp vẫn dùng cho embed. Không xóa gì.
#
#  Chạy:  python assets/img/_webp_to_png.py
#  Cần:   pip install pillow   (PIL — giống _optimize.py)
# =====================================================================
import os

try:
    from PIL import Image
except ImportError:
    raise SystemExit('Thiếu Pillow. Cài: pip install pillow')

HERE = os.path.dirname(os.path.abspath(__file__))
ORIG = os.path.join(HERE, '_originals_backup')
os.makedirs(ORIG, exist_ok=True)

created, skipped = 0, 0
for f in sorted(os.listdir(HERE)):
    if not f.lower().endswith('.webp'):
        continue
    name = os.path.splitext(f)[0]
    out = os.path.join(ORIG, name + '.png')
    if os.path.exists(out):
        skipped += 1
        continue
    try:
        Image.open(os.path.join(HERE, f)).convert('RGBA').save(out, 'PNG')
        created += 1
        print('  +', name + '.png')
    except Exception as e:
        print('  ! lỗi', f, '-', e)

print(f'\nXong: tạo {created} PNG mới, bỏ qua {skipped} cái đã có (trong _originals_backup/).')
print('Restart bot để thẻ động đọc ảnh mới (có cache dò file).')
