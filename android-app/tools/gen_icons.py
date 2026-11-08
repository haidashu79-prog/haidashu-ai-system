#!/usr/bin/env python3
# 生成易玄机安卓图标：青底 + 米色「易」字，各密度、方形/圆形/自适应前景/商店图
import os
from PIL import Image, ImageDraw, ImageFont

RES = os.path.join(os.path.dirname(__file__), "..", "app", "src", "main", "res")
QING = (47, 107, 92, 255)
PAPER = (247, 243, 233, 255)

FONT_CANDIDATES = [
    ("/System/Library/Fonts/PingFang.ttc", 0),
    ("/System/Library/Fonts/STHeiti Medium.ttc", 0),
    ("/System/Library/Fonts/Supplemental/Songti.ttc", 0),
    ("/System/Library/Fonts/Hiragino Sans GB.ttc", 0),
    ("/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 0),
]

DENS = {"mdpi": 1.0, "hdpi": 1.5, "xhdpi": 2.0, "xxhdpi": 3.0, "xxxhdpi": 4.0}


def pick_font(size):
    for path, idx in FONT_CANDIDATES:
        if not os.path.exists(path):
            continue
        try:
            f = ImageFont.truetype(path, size, index=idx)
            box = f.getbbox("易")
            if box and box[2] - box[0] > 0 and box[3] - box[1] > 0:
                return f
        except Exception:
            continue
    return ImageFont.load_default()


def draw_glyph(img, size, ratio):
    d = ImageDraw.Draw(img)
    f = pick_font(max(8, int(size * ratio)))
    box = d.textbbox((0, 0), "易", font=f)
    w, h = box[2] - box[0], box[3] - box[1]
    x = (size - w) / 2 - box[0]
    y = (size - h) / 2 - box[1]
    d.text((x, y), "易", font=f, fill=PAPER)


def square_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * 0.22)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=QING)
    draw_glyph(img, size, 0.60)
    return img


def round_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([0, 0, size - 1, size - 1], fill=QING)
    draw_glyph(img, size, 0.56)
    return img


def foreground(size):
    # 自适应图标前景：透明底，只有米色「易」，留在中间安全区里
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_glyph(img, size, 0.46)
    return img


def main():
    for dens, scale in DENS.items():
        folder = os.path.join(RES, "mipmap-" + dens)
        os.makedirs(folder, exist_ok=True)
        s = int(round(48 * scale))
        square_icon(s).save(os.path.join(folder, "ic_launcher.png"))
        round_icon(s).save(os.path.join(folder, "ic_launcher_round.png"))
        fs = int(round(108 * scale))
        foreground(fs).save(os.path.join(folder, "ic_launcher_foreground.png"))
        print("wrote", folder, s, fs)

    # 应用商店用的大图
    store = os.path.join(RES, "..", "..", "..", "..", "app-store-icon.png")
    square_icon(512).save(os.path.normpath(store))
    print("wrote store icon")


if __name__ == "__main__":
    main()
