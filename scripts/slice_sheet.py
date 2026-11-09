#!/usr/bin/env python3
"""Cut a 1-row character sheet (poses side by side on magenta) into transparent pose sprites.

Usage (from the project folder):
    python3 scripts/slice_sheet.py <sheet.png> <prefix> <name1,name2,...>
e.g.
    python3 scripts/slice_sheet.py art/drafts/kampung/mak-sheet.png mak welcome,asking,joy
then run scripts/prepare_art.py (add the names to its SPRITES list first).

Writes art/sprites/<prefix>_<name>.png. Every pose gets the same canvas, placed the same way
relative to its cell, so swapping poses doesn't make the character jump. Pieces that reach
into the next cell (open arms, hearts) stay with the pose whose cell holds most of that piece.
The background is removed by colour distance (works for lilac tudungs, unlike soft keying).
"""
import pathlib
import sys
from collections import deque

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "art" / "sprites"
MARGIN = 0.25  # extra canvas on each side of a cell, as a fraction of the cell width
STEP = 4  # work on a 1/STEP size mask when finding connected pieces


def alpha_of(P, bg):
    return np.clip((np.linalg.norm(P - bg, axis=-1) - 40) / 90, 0, 1)


def label(mask):
    """Connected pieces of a boolean mask (4-neighbour). Returns an int label image, 0 = none."""
    H, W = mask.shape
    lab = np.zeros((H, W), int)
    n = 0
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]:
            continue
        n += 1
        lab[y0, x0] = n
        q = deque([(y0, x0)])
        while q:
            y, x = q.popleft()
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n
                    q.append((yy, xx))
    return lab


def main():
    sheet_path, prefix, names = sys.argv[1], sys.argv[2], sys.argv[3].split(",")
    img = Image.open(sheet_path).convert("RGB")
    P = np.asarray(img).astype(float)
    H, W = P.shape[:2]
    bg = np.median(P[:6].reshape(-1, 3), axis=0)
    a = alpha_of(P, bg)

    # which cell owns each piece: the cell with most of that piece's pixels
    small = a[::STEP, ::STEP] > 0.5
    lab = label(small)
    cw = W / len(names)
    cols = (np.arange(small.shape[1]) * STEP // cw).astype(int).clip(0, len(names) - 1)
    owner = np.zeros(lab.max() + 1, int)
    for k in range(1, lab.max() + 1):
        ys, xs = np.nonzero(lab == k)
        owner[k] = np.bincount(cols[xs], minlength=len(names)).argmax()
    # thin edge pixels missed by the small mask belong to the piece right next to them:
    # grow the labels a few steps into the empty space around them
    for _ in range(3):
        grown = lab.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            shifted = np.roll(lab, (dy, dx), axis=(0, 1))
            grown = np.where(grown == 0, shifted, grown)
        lab = grown
    own = owner[lab]
    own_full = np.kron(own, np.ones((STEP, STEP), int))[:H, :W]
    lab_full = np.kron(lab, np.ones((STEP, STEP), int))[:H, :W]
    own_full = np.where(lab_full > 0, own_full, -1)  # far from any piece: stray speck, drop it

    rgb = np.clip((P - (1 - a[..., None]) * bg) / np.maximum(a, 1e-3)[..., None], 0, 255)
    m = round(cw * MARGIN)
    OUT.mkdir(parents=True, exist_ok=True)
    for i, name in enumerate(names):
        ai = np.where(own_full == i, a, 0)
        left = round(i * cw) - m
        canvas = np.zeros((H, round(cw) + 2 * m, 4))
        x0, x1 = max(0, left), min(W, left + canvas.shape[1])
        canvas[:, x0 - left:x1 - left, :3] = rgb[:, x0:x1]
        canvas[:, x0 - left:x1 - left, 3] = ai[:, x0:x1] * 255
        canvas[canvas[..., 3] == 0, :3] = 0
        Image.fromarray(canvas.astype(np.uint8)).save(OUT / f"{prefix}_{name}.png")
        print(f"  {prefix}_{name}: {canvas.shape[1]}x{H}")


if __name__ == "__main__":
    main()
