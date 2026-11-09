#!/usr/bin/env python3
"""Prepare the game art. Run after adding or changing anything in art/.

Usage (from the project folder):
    python3 scripts/prepare_art.py        (needs: pip install pillow numpy)

art/backdrop/far|mid|front.png   parallax layers on a solid magenta (#FF00FF) background
art/sprites/<name>.png           single objects, transparent PNG (magenta background also OK)

Writes optimised copies to assets/backdrop/ and assets/sprites/, plus src/art.js which
tells the game what exists. Anything missing simply falls back to the built-in drawings.
Sprite names the game knows: see SPRITES below.
"""
import pathlib

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
ART = ROOT / "art"
ASSETS = ROOT / "assets"
JS = ROOT / "src" / "art.js"
EXTS = (".png", ".jpg", ".jpeg", ".webp")

# back to front: (name, height as a fraction of the sky, pan speed on bends)
BACKDROP = [
    ("far", 0.62, 0.15),
    ("mid", 0.5, 0.35),
    ("front", 0.36, 0.7),
]
BACKDROP_MAX_W = 1800

# name: (max pixel size of the longest side, trim transparent margins?)
# The wheel is not trimmed so it keeps rotating around its centre.
SPRITES = {
    "kancil": (768, True),
    "lorry": (768, True),
    "cow": (640, True),
    "pothole": (768, True),
    "duit": (384, True),
    "rendang": (384, True),
    "teh": (384, True),
    "palm": (1024, True),
    "tree": (1024, True),
    "house": (1024, True),
    "wheel": (768, False),
    "wheel_honk": (768, False),
    "dashboard": (1800, True),
    "car2": (768, True),
    "bus": (768, True),
    "kapcai": (512, True),
    "pelita": (384, True),
    "gantry": (1400, True),
    "phone": (512, True),
    "heart": (96, True),
    "heart_empty": (96, True),
    "icon_city": (128, True),
    "icon_kampung": (128, True),
    "icon_car": (128, True),
    # rear-view mirror faces (made by scripts/slice_faces.py): not trimmed, so they line up
    "face_normal": (320, False),
    "face_shock": (320, False),
    "face_sweat": (320, False),
    "face_hairup": (320, False),
    "face_dizzy": (320, False),
    "face_sleepy": (320, False),
    # Mak's video-call faces (scripts/slice_faces.py --mak)
    "mak_calling": (320, False),
    "mak_happy": (320, False),
    "mak_scold": (320, False),
    # kampung scene poses (scripts/slice_sheet.py): same canvas per character, not trimmed
    "boy_happy": (720, False),
    "boy_shock": (720, False),
    "boy_nervous": (720, False),
    "mak_welcome": (720, False),
    "mak_asking": (720, False),
    "mak_joy": (720, False),
    "kids_waiting": (720, False),
    "kids_cheer": (720, False),
    "kids_sulk": (720, False),
}

# extra backdrop pieces (magenta keyed, trimmed): name -> max width
EXTRAS = {"clouds": 1800, "ground": 1800}
# full-screen illustrations, used as-is: name -> max side
SCREENS = {"menu": 1536, "win": 1536, "lose": 1536, "kampung": 1536}

MAGENTA = np.array([255.0, 0.0, 255.0])


def box_blur(x, r):
    """Mean filter of radius r over the first two axes (edges handled by padding)."""
    pad = np.pad(x, [(r + 1, r), (r + 1, r)] + [(0, 0)] * (x.ndim - 2), mode="edge")
    c = pad.cumsum(0)
    c = c[2 * r + 1:] - c[:-2 * r - 1]
    c = c.cumsum(1)
    c = c[:, 2 * r + 1:] - c[:, :-2 * r - 1]
    return c / (2 * r + 1) ** 2


def key_magenta(img):
    """Solid magenta background -> transparency, with clean (un-pinked) soft edges."""
    P = np.asarray(img.convert("RGB"), dtype=float)
    m = np.minimum(P[..., 0], P[..., 2]) - P[..., 1]  # high on magenta, <= 0 on painted art
    # The "magenta" is rarely pure #FF00FF and often shades from top to bottom,
    # so measure the real background colour per row from the left/right borders.
    border = np.concatenate([P[0], P[-1], P[:, 0], P[:, -1]])
    bm = np.minimum(border[:, 0], border[:, 2]) - border[:, 1]
    K0 = np.median(border[bm > 150], axis=0) if (bm > 150).sum() > 20 else MAGENTA
    def edge_colour(cols):  # per-row background colour from a few border columns
        sm = np.minimum(cols[..., 0], cols[..., 2]) - cols[..., 1]
        ok = sm > 150
        c = (cols * ok[..., None]).sum(1) / np.maximum(ok.sum(1), 1)[:, None]
        c[~ok.any(1)] = K0
        return box_blur(c[:, None, :], 15)[:, 0, :]

    left, right = edge_colour(P[:, :4]), edge_colour(P[:, -4:])
    fx = np.linspace(0, 1, P.shape[1])[None, :, None]
    K = left[:, None, :] * (1 - fx) + right[:, None, :] * fx  # (H, W, 3)
    mK = np.minimum(K[..., 0], K[..., 2]) - K[..., 1]
    rough = np.clip((mK - 12.0 - m) / (mK + 8.0), 0, 1)
    # Painted colours have min(R,B) <= G (+ a little); anything below that is solid,
    # including dark neutral greys, which must not be treated as soft edges.
    solid = (rough > 0.95) | (m < 25)
    bg = rough < 0.04
    edge = ~solid & ~bg
    # true colour of each edge pixel ~ average of nearby solid pixels
    F = np.zeros_like(P)
    w = solid.astype(float)
    for r in (2, 4, 8, 16):
        num = box_blur(P * w[..., None], r)
        den = box_blur(w, r)
        fill = (den > 1e-3) & edge & (F.sum(-1) == 0)
        F[fill] = num[fill] / den[fill][:, None]
    # solve pixel = a*F + (1-a)*magenta for a
    d = F - K
    a_fit = ((P - K) * d).sum(-1) / np.maximum((d * d).sum(-1), 1.0)
    alpha = np.where(solid, 1.0, 0.0)
    known = edge & (F.sum(-1) > 0)
    alpha[known] = np.clip(a_fit[known], 0, 1)
    alpha[edge & ~known] = rough[edge & ~known]
    alpha[alpha < 0.04] = 0
    rgb = (P - (1 - alpha[..., None]) * K) / np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip(rgb, 0, 255)
    spill = np.clip(np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1], 0, None)
    rgb[..., 0] = np.where(edge, rgb[..., 0] - spill, rgb[..., 0])
    rgb[..., 2] = np.where(edge, rgb[..., 2] - spill, rgb[..., 2])
    rgb[alpha == 0] = 0
    return Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8))


def load(path):
    img = Image.open(path)
    has_alpha = img.mode in ("RGBA", "LA") or "transparency" in img.info
    if has_alpha:
        img = img.convert("RGBA")
        if np.asarray(img)[..., 3].min() < 255:
            return img
    return key_magenta(img)


def trim(img, top_only=False):
    a = np.asarray(img)[..., 3]
    ys, xs = np.where(a > 24)
    if not len(ys):
        return img
    pad = 2
    if top_only:
        return img.crop((0, max(0, ys.min() - pad), img.width, img.height))
    return img.crop((max(0, xs.min() - pad), max(0, ys.min() - pad),
                     min(img.width, xs.max() + pad + 1), min(img.height, ys.max() + pad + 1)))


WHEEL_RIM = 0.44  # rim outer radius as a fraction of the image (must match src/scene/Cockpit.js)


def align_wheel(img):
    """Re-frame a steering-wheel image so the rim is centred with radius WHEEL_RIM.
    Lets differently framed wheel pictures (normal / honking) swap without jumping."""
    a = np.asarray(img).astype(int)
    dark = (a[..., 3] > 200) & (a[..., :3].max(-1) < 95)
    H, W = dark.shape
    col = np.where(dark[:, W // 2 - 3:W // 2 + 4].any(1))[0]
    if len(col) < 10:
        return img
    top, bottom = col.min(), col.max()
    band = np.where(dark[top:top + max(4, (bottom - top) // 40)].any(0))[0]
    cx = (band.min() + band.max()) / 2 if len(band) else W / 2
    cy, r = (top + bottom) / 2, (bottom - top) / 2
    side = r / WHEEL_RIM
    box = (round(cx - side / 2), round(cy - side / 2), round(cx + side / 2), round(cy + side / 2))
    out = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), (0, 0, 0, 0))
    out.paste(img.crop((max(0, box[0]), max(0, box[1]), min(W, box[2]), min(H, box[3]))),
              (max(0, -box[0]), max(0, -box[1])))
    print(f"    aligned {img.width}x{img.height}: rim centre ({cx:.0f},{cy:.0f}) radius {r:.0f}")
    return out


def fit(img, max_side):
    s = max_side / max(img.size)
    if s < 1:
        img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    return img


def find(folder, name):
    for ext in EXTS:
        p = folder / f"{name}{ext}"
        if p.exists():
            return p
    return None


def main():
    (ASSETS / "backdrop").mkdir(parents=True, exist_ok=True)
    (ASSETS / "sprites").mkdir(parents=True, exist_ok=True)

    backdrop = []
    for name, height, parallax in BACKDROP:
        src = find(ART / "backdrop", name)
        if not src:
            print(f"  backdrop {name}: missing, using built-in")
            continue
        img = fit(trim(load(src), top_only=True), BACKDROP_MAX_W)
        img.save(ASSETS / "backdrop" / f"{name}.png", optimize=True)
        print(f"  backdrop {name}: {img.width}x{img.height}")
        backdrop.append(
            f"  {{ source: require('../assets/backdrop/{name}.png'), aspect: {img.width / img.height:.3f}, "
            f"height: {height}, parallax: {parallax} }},"
        )

    extras = []
    for name, max_w in EXTRAS.items():
        src = find(ART / "backdrop", name)
        if not src:
            continue
        img = fit(trim(load(src)), max_w)
        img.save(ASSETS / "backdrop" / f"{name}.png", optimize=True)
        print(f"  backdrop {name}: {img.width}x{img.height}")
        extras.append(
            f"  {name}: {{ source: require('../assets/backdrop/{name}.png'), aspect: {img.width / img.height:.3f} }},"
        )

    (ASSETS / "screens").mkdir(parents=True, exist_ok=True)
    screens = []
    for name, max_side in SCREENS.items():
        src = find(ART / "screens", name)
        if not src:
            continue
        img = fit(Image.open(src).convert("RGB"), max_side)
        img.save(ASSETS / "screens" / f"{name}.jpg", quality=85, optimize=True)
        print(f"  screen {name}: {img.width}x{img.height}")
        screens.append(f"  {name}: require('../assets/screens/{name}.jpg'),")

    sprites = []
    for name, (max_side, do_trim) in SPRITES.items():
        src = find(ART / "sprites", name)
        if not src:
            print(f"  sprite {name}: missing, using built-in")
            continue
        img = load(src)
        if name.startswith("wheel"):
            img = align_wheel(img)
        if do_trim:
            img = trim(img)
        img = fit(img, max_side)
        img.save(ASSETS / "sprites" / f"{name}.png", optimize=True)
        print(f"  sprite {name}: {img.width}x{img.height}")
        sprites.append(
            f"  {name}: {{ source: require('../assets/sprites/{name}.png'), aspect: {img.width / img.height:.3f} }},"
        )

    JS.write_text(
        "// Generated by `python3 scripts/prepare_art.py`. Don't edit by hand: re-run the script.\n"
        "// aspect = width / height of the trimmed image.\n\n"
        "// Painted backdrop layers, back to front. height = fraction of the sky, parallax = pan speed on bends.\n"
        "export const BACKDROP = [\n" + "".join(l + "\n" for l in backdrop) + "];\n\n"
        "export const ART = {\n" + "".join(l + "\n" for l in sprites) + "};\n\n"
        "// Clouds strip and ground painting.\n"
        "export const SCENE = {\n" + "".join(l + "\n" for l in extras) + "};\n\n"
        "// Full-screen menu / result illustrations.\n"
        "export const SCREENS = {\n" + "".join(l + "\n" for l in screens) + "};\n"
    )
    print(f"wrote {JS.relative_to(ROOT)}: {len(backdrop)} backdrop layer(s), {len(sprites)} sprite(s)")


if __name__ == "__main__":
    main()
