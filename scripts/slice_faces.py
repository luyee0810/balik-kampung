#!/usr/bin/env python3
"""Cut a 3x2 expression sheet into the rear-view mirror faces, lined up so they don't jump.

Usage (from the project folder):
    python3 scripts/slice_faces.py [sheet.png]     (default: art/drafts/characters/player-mirror-sheet.png)
    python3 scripts/slice_faces.py --mak [sheet.png]   (default: art/drafts/characters/mak-call-sheet.png)
then run scripts/prepare_art.py as usual.

--mak: a 1x3 sheet of Mak (calling, happy, scold). Each third is cropped to a square around her
purple tudung, so it fits the portrait on the phone: art/sprites/mak_<name>.png. Her lilac
tudung is too close to magenta for prepare_art.py's soft keying, so these are cut out here
(transparent PNG) using how far each pixel is from the sheet's own background colour.

Sheet layout (left to right, top to bottom): normal, shock, sweat, hairup, dizzy, sleepy,
on a magenta background. All faces get the same scale (the sheet draws them the same size);
each is centred on its skin and lined up on the bottom of the skin (the neck above the
collar), then saved as art/sprites/face_<name>.png (still on magenta).
"""
import pathlib
import sys

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHEET = ROOT / "art" / "drafts" / "characters" / "player-mirror-sheet.png"
OUT = ROOT / "art" / "sprites"
NAMES = ["normal", "shock", "sweat", "hairup", "dizzy", "sleepy"]
SIZE = 512  # output square
FACE_W = 0.46  # skin width (ear to ear) as a fraction of SIZE
NECK_Y = 0.78  # where the bottom of the skin (neck) sits, as a fraction of SIZE


def skin_box(cell):
    P = np.asarray(cell.convert("RGB")).astype(int)
    r, g, b = P[..., 0], P[..., 1], P[..., 2]
    skin = (r > 170) & (g > 110) & (g < 185) & (b > 40) & (b < 130) & (r - g > 35) & (g - b > 30)
    ys, xs = np.where(skin)
    # ignore stray pixels: use percentiles, not min/max
    return np.percentile(xs, 2), np.percentile(xs, 98), np.percentile(ys, 2), np.percentile(ys, 98)


MAK_SHEET = ROOT / "art" / "drafts" / "characters" / "mak-call-sheet.png"
MAK_NAMES = ["calling", "happy", "scold"]
MAK_HEAD = 0.6  # tudung width as a fraction of the square crop
MAK_TOP = 0.17  # top of the tudung, as a fraction of the square crop


def cut_out(img, bg):
    """Background colour -> transparent, with soft edges un-blended from the background."""
    P = np.asarray(img.convert("RGB")).astype(float)
    K = np.array(bg, dtype=float)
    a = np.clip((np.linalg.norm(P - K, axis=-1) - 40) / 90, 0, 1)
    rgb = np.clip((P - (1 - a[..., None]) * K) / np.maximum(a, 1e-3)[..., None], 0, 255)
    rgb[a == 0] = 0
    return Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8))


def slice_mak(path):
    sheet = Image.open(path).convert("RGB")
    P = np.asarray(sheet).astype(int)
    r, g, b = P[..., 0], P[..., 1], P[..., 2]
    tudung = (b > 170) & (r > 140) & (g > 100) & (r - g > 20) & (b - g > 40)
    bg = tuple(int(v) for v in np.median(P[:6].reshape(-1, 3), axis=0))
    cw = sheet.width // 3
    for i, name in enumerate(MAK_NAMES):
        ys, xs = np.where(tudung[:, i * cw:(i + 1) * cw])
        x0, x1, y0 = np.percentile(xs, 1) + i * cw, np.percentile(xs, 99) + i * cw, np.percentile(ys, 1)
        side = (x1 - x0) / MAK_HEAD
        left, top = (x0 + x1) / 2 - side / 2, y0 - MAK_TOP * side
        out = Image.new("RGB", (round(side), round(side)), bg)  # pad with background, cut out below
        box = tuple(round(v) for v in (left, top, left + side, top + side))
        src = (max(i * cw, box[0]), max(0, box[1]), min((i + 1) * cw, box[2]), min(sheet.height, box[3]))  # own third only
        out.paste(sheet.crop(src), (src[0] - box[0], src[1] - box[1]))
        cut_out(out, bg).resize((SIZE, SIZE), Image.LANCZOS).save(OUT / f"mak_{name}.png")
        print(f"  mak_{name}: tudung {x1 - x0:.0f}px wide, crop {side:.0f}px")


def main():
    if "--mak" in sys.argv:
        args = [a for a in sys.argv[1:] if a != "--mak"]
        return slice_mak(args[0] if args else MAK_SHEET)
    sheet = Image.open(sys.argv[1] if len(sys.argv) > 1 else SHEET).convert("RGB")
    cw, ch = sheet.width // 3, sheet.height // 2
    OUT.mkdir(parents=True, exist_ok=True)
    cells = [sheet.crop(((i % 3) * cw, (i // 3) * ch, (i % 3 + 1) * cw, (i // 3 + 1) * ch)) for i in range(6)]
    boxes = [skin_box(c) for c in cells]
    k = FACE_W * SIZE / float(np.median([x1 - x0 for x0, x1, _, _ in boxes]))
    bg = tuple(int(v) for v in np.median(np.asarray(sheet)[:6].reshape(-1, 3), axis=0))  # the sheet's own magenta
    for name, cell, (x0, x1, y0, y1) in zip(NAMES, cells, boxes):
        cell = cell.resize((round(cell.width * k), round(cell.height * k)), Image.LANCZOS)
        out = Image.new("RGB", (SIZE, SIZE), bg)
        out.paste(cell, (round(SIZE / 2 - (x0 + x1) / 2 * k), round(SIZE * NECK_Y - y1 * k)))
        out.save(OUT / f"face_{name}.png")
        print(f"  face_{name}: skin {x1 - x0:.0f}x{y1 - y0:.0f}px")
    print(f"  scale {k:.2f}, background {bg}")

if __name__ == "__main__":
    main()
