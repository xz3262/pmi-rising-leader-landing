#!/usr/bin/env python3
# 把生成的紫色人像合成到 template.png 的透明窗口下方
import sys
from PIL import Image

template_path = 'assets/template.png'
portrait_path = sys.argv[1] if len(sys.argv) > 1 else 'tools/nominee-preview-portrait.png'
out_path = sys.argv[2] if len(sys.argv) > 2 else 'tools/nominee-preview-final.png'

tpl = Image.open(template_path).convert('RGBA')
W, H = tpl.size
alpha = tpl.split()[-1]
ap = alpha.load()

def col_trans_frac(x, y0, y1):
    c = 0; n = 0
    for y in range(y0, y1, 8):
        n += 1
        if ap[x, y] < 128: c += 1
    return c / max(n, 1)

def row_trans_frac(y, x0, x1):
    c = 0; n = 0
    for x in range(x0, x1, 8):
        n += 1
        if ap[x, y] < 128: c += 1
    return c / max(n, 1)

# 窗口左边界：上半部分中第一个「大多透明」的列（PMI 面板右缘）
win_left = 0
for x in range(0, W, 4):
    if col_trans_frac(x, 0, H // 2) > 0.5:
        win_left = x; break

# 窗口下边界：从上往下，x∈[win_left,W] 大多透明的最后一行（文字带上缘）
win_bottom = 0
for y in range(0, H, 4):
    if row_trans_frac(y, win_left, W) > 0.5:
        win_bottom = y
    elif y > H * 0.2 and win_bottom > 0:
        break

print('画布 %dx%d | 检测窗口: left=%d(%.1f%%) bottom=%d(%.1f%%) 宽=%d 高=%d'
      % (W, H, win_left, 100*win_left/W, win_bottom, 100*win_bottom/H, W-win_left, win_bottom))

# 底层画布：用人像背景色铺满（任何模板透明处都显示紫色，不留黑）
por = Image.open(portrait_path).convert('RGBA')
bg_color = por.getpixel((4, 4))  # 取人像左上角作为背景紫
canvas = Image.new('RGBA', (W, H), bg_color)

# 人像按 cover 方式铺满窗口矩形 [win_left,0] -> [W, win_bottom]
win_w, win_h = W - win_left, win_bottom
pw, ph = por.size
scale = max(win_w / pw, win_h / ph)
nw, nh = int(pw * scale), int(ph * scale)
por_r = por.resize((nw, nh), Image.LANCZOS)
# 居中裁剪到窗口大小
ox = (nw - win_w) // 2
oy = (nh - win_h) // 2
por_c = por_r.crop((ox, oy, ox + win_w, oy + win_h))
canvas.alpha_composite(por_c, (win_left, 0))

# 叠加模板（文字/logo/二维码在最上层，像素级不变）
canvas.alpha_composite(tpl, (0, 0))

# 输出全分辨率 + 一张缩略预览
final = canvas.convert('RGB')
final.save(out_path.replace('.png', '-full.jpg'), quality=92)
preview = final.resize((1080, int(1080 * H / W)), Image.LANCZOS)
preview.save(out_path, quality=92)
print('已保存预览', out_path, '及全分辨率', out_path.replace('.png', '-full.jpg'))
