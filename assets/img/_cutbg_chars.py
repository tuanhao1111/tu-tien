# Tách nền char: rembg (AI matting, giữ glow mềm) + dọn caro xám còn sót.
#  Dùng chung 1 session cho cả batch (nhanh). Ghi đè file đích (đã backup raw ngoài).
#
#  CẦN: pip install rembg onnxruntime   (lần đầu tự tải model ~170MB)
#  DÙNG (chạy từ thư mục tu-tien):
#    1) Backup gốc trước:  cp assets/img/_originals_backup/char_*.png assets/img/_char_raw/
#    2) Tách nền hàng loạt: python assets/img/_cutbg_chars.py batch "assets/img/_originals_backup/char_*.png"
#    3) (thử 1 ảnh)        python assets/img/_cutbg_chars.py one IN.png OUT.png PREVIEW.png
#  LƯU Ý: thẻ Satori đọc PNG ở _originals_backup/ (xem assets.dataUri) -> chỉ cần tách nền các PNG ở đó.
#  Sau khi gen char MỚI: bỏ PNG vào _originals_backup/ rồi chạy lại bước 2.
import sys, glob, os
import numpy as np
from PIL import Image
from rembg import remove, new_session

SESSION = new_session('u2net')

def matte(im):
    out = remove(im, session=SESSION).convert('RGBA')
    a = np.array(out)
    r, g, b, al = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int), a[..., 3]
    br = (r + g + b) / 3
    # "caro xám": 3 kênh sát nhau + độ sáng trung (45..140) -> nền sót -> xóa
    gray = (np.abs(r - g) < 16) & (np.abs(g - b) < 16) & (np.abs(r - b) < 16)
    midbr = (br >= 45) & (br <= 140)
    checker = gray & midbr
    al2 = al.copy()
    al2[checker] = 0
    a[..., 3] = al2
    return Image.fromarray(a, 'RGBA')

def preview(out, path, bgcol=(16, 22, 34, 255)):
    bg = Image.new('RGBA', out.size, bgcol); bg.alpha_composite(out); bg.convert('RGB').save(path)

if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'one':
        im = Image.open(sys.argv[2])
        out = matte(im)
        out.save(sys.argv[3])
        preview(out, sys.argv[4])
        print('OK one', out.size)
    elif mode == 'batch':
        files = sorted(glob.glob(sys.argv[2]))
        done = 0
        for f in files:
            try:
                out = matte(Image.open(f))
                out.save(f)  # ghi đè (đã backup raw)
                done += 1
            except Exception as e:
                print('FAIL', os.path.basename(f), e)
        print('BATCH done', done, '/', len(files))
