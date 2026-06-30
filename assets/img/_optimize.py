# =====================================================================
#  TỐI ƯU ẢNH cho Discord — nén PNG -> WebP nhỏ gọn (cần Python + Pillow).
#  Discord embed chỉ hiện thumbnail ~80px / ảnh ~400-600px, nên KHÔNG cần ảnh
#  to (file 2048px ~ 7-13 MB sẽ upload rất chậm/dễ lỗi). Script này resize +
#  chuyển sang .webp (~30-150 KB) và DỜI bản gốc .png vào _originals_backup/.
#
#  Dùng:  python assets/img/_optimize.py      (chạy từ thư mục tu-tien)
#  Cài Pillow nếu thiếu:  pip install Pillow
#
#  Idempotent: chạy lại chỉ xử lý các .png MỚI (ảnh cũ đã thành .webp).
#  Game đọc .webp tự động (assets.js). Xong rồi có thể xóa _originals_backup/
#  để lấy lại dung lượng (sau khi đã kiểm tra ảnh hiện đúng trong game).
# =====================================================================
import os, shutil
from PIL import Image

IMG = os.path.dirname(os.path.abspath(__file__))
BACKUP = os.path.join(IMG, '_originals_backup')
os.makedirs(BACKUP, exist_ok=True)

BANNER_PREFIX = ('realm_', 'panel_', 'zone_')   # ảnh ngang 16:9 -> 1280px
BANNER_EXACT = {'shop', 'bag', 'quest', 'story'}

def target_size(stem):
    if stem.startswith('boss_'):
        return 768                                  # chân dung boss
    if stem.startswith(BANNER_PREFIX) or stem in BANNER_EXACT:
        return 1280                                 # banner
    return 512                                       # icon (gear/sect/skill/pill/mat/foe/npc)

def main():
    before = after = n = 0
    for fn in sorted(os.listdir(IMG)):
        if not fn.lower().endswith('.png'):
            continue
        src = os.path.join(IMG, fn)
        if not os.path.isfile(src):
            continue
        stem = os.path.splitext(fn)[0]
        try:
            im = Image.open(src)
            im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
            im.thumbnail((target_size(stem), target_size(stem)))
            out = os.path.join(IMG, stem + '.webp')
            im.save(out, 'WEBP', quality=82, method=6)
            before += os.path.getsize(src); after += os.path.getsize(out)
            shutil.move(src, os.path.join(BACKUP, fn))
            n += 1
        except Exception as e:
            print('LỖI', fn, e)
    print(f'Đã nén {n} ảnh: {before/1048576:.1f} MB -> {after/1048576:.2f} MB. Bản gốc ở _originals_backup/.')

if __name__ == '__main__':
    main()
