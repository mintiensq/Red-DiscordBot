"""Generate the PNG app icons (run: python3 make_icons.py)."""
from PIL import Image, ImageDraw, ImageFont
import os

def font(size):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
              "/System/Library/Fonts/Supplemental/Arial Bold.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def icon(size, path):
    s = 4  # supersample
    S = size * s
    img = Image.new("RGB", (S, S))
    d = ImageDraw.Draw(img)
    top, bot = (24, 28, 52), (10, 12, 24)
    for y in range(S):
        t = y / S
        d.line([(0, y), (S, y)], fill=tuple(int(top[i] * (1 - t) + bot[i] * t) for i in range(3)))
    m, w = S * 0.17, S * 0.075
    box = [m, m, S - m, S - m]
    d.arc(box, 0, 360, fill=(52, 58, 92), width=int(w))
    d.arc(box, -90, 200, fill=(255, 140, 66), width=int(w))
    f = font(int(S * 0.30))
    d.text((S / 2, S / 2), "66", font=f, fill=(255, 255, 255), anchor="mm")
    img.resize((size, size), Image.LANCZOS).save(path)

for sz in (180, 192, 512):
    icon(sz, f"icons/icon-{sz}.png")
