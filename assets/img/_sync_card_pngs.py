#!/usr/bin/env python3
# =====================================================================
#  ĐỒNG BỘ PNG cho THẺ ĐỘNG (Satori) — chạy SAU mỗi lần thêm/đổi ảnh.
#
#  Vì sao cần: thẻ động (Shop / Hồ Sơ / BXH / Túi Đồ) đọc ảnh từ
#  `_originals_backup/<ten>.png` (resvg KHÔNG đọc webp). Khi bạn bỏ ảnh MỚI
#  (png/webp) vào assets/img/, thẻ vẫn dùng bản CŨ trong _originals_backup
#  -> ảnh không cập nhật. Ảnh gen gốc lại thường RẤT TO (vài MB) -> render chậm.
#
#  Script này: với mỗi ảnh trong assets/img/, nếu nó MỚI HƠN bản trong
#  _originals_backup (hoặc chưa có) -> thu nhỏ (cạnh dài <= 1280px) + lưu PNG
#  đè vào _originals_backup. Ảnh KHÔNG đổi -> bỏ qua (giữ nguyên bản tốt).
#
#  Chạy:  python assets/img/_sync_card_pngs.py
#  Cần:   pip install pillow
# =====================================================================
import os

try:
    from PIL import Image
except ImportError:
    raise SystemExit('Thieu Pillow. Cai: pip install pillow')

HERE = os.path.dirname(os.path.abspath(__file__))
ORIG = os.path.join(HERE, '_originals_backup')
os.makedirs(ORIG, exist_ok=True)
EXTS = ('.png', '.webp', '.jpg', '.jpeg')
MAX_SIDE = 1280  # cạnh dài tối đa (banner 16:9 ~1280; icon 768 giữ nguyên)

made, skipped = 0, 0
for f in sorted(os.listdir(HERE)):
    low = f.lower()
    if not low.endswith(EXTS):
        continue
    if low.endswith('.png') and os.path.dirname(os.path.join(HERE, f)) == ORIG:
        continue
    name = os.path.splitext(f)[0]
    src = os.path.join(HERE, f)
    dst = os.path.join(ORIG, name + '.png')
    # Bỏ qua nếu bản PNG trong _originals_backup MỚI HƠN file nguồn.
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        skipped += 1
        continue
    try:
        im = Image.open(src).convert('RGBA')
        w, h = im.size
        if max(w, h) > MAX_SIDE:
            if w >= h:
                im = im.resize((MAX_SIDE, round(h * MAX_SIDE / w)), Image.LANCZOS)
            else:
                im = im.resize((round(w * MAX_SIDE / h), MAX_SIDE), Image.LANCZOS)
        im.save(dst, 'PNG', optimize=True)
        made += 1
        print('  + ' + name + '.png  (' + str(im.size) + ')')
    except Exception as e:
        print('  ! loi ' + f + ' - ' + str(e))

print('\nXong: cap nhat ' + str(made) + ' PNG, bo qua ' + str(skipped) + ' (da moi).')
print('Restart bot de the dong doc anh moi.')
