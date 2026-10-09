"""Assemble the hero head-turn frames: mirrored right turn (= left turn) -> front -> right turn.
usage: build_turn.py FRONT_DIR RIGHT_DIR OUT_DIR   (dirs of keyed WebP frames from key_frames.py)"""
import sys, glob, os, numpy as np
from PIL import Image, ImageFilter
front_dir, right_dir, out = sys.argv[1:4]
def arr(p): return np.array(Image.open(p).convert('RGBA')).astype(np.float32) / 255
fa = arr(sorted(glob.glob(front_dir + '/*.webp'))[0])
R = [arr(p) for p in sorted(glob.glob(right_dir + '/*.webp'))]
# match the front frame's colour to the first turn frame (it is the generator's input image, a bit cooler)
mf, mr = fa[..., 3] > .5, R[0][..., 3] > .5
for c in range(3):
    fa[..., c] = (fa[..., c] - fa[..., c][mf].mean()) * (R[0][..., c][mr].std() / fa[..., c][mf].std()) + R[0][..., c][mr].mean()
fa[..., :3] = np.clip(fa[..., :3], 0, 1)
def blend(a, b, t):  # premultiplied, so colours under transparent pixels never show
    pa, pb = a[..., :3] * a[..., 3:], b[..., :3] * b[..., 3:]
    al = a[..., 3:] * (1 - t) + b[..., 3:] * t
    rgb = (pa * (1 - t) + pb * t) / np.maximum(al, 1e-4)
    return np.concatenate([np.clip(rgb, 0, 1), al], axis=2)
# no cross-fades: a blended frame shows two faces at once (ghosting). The front frame cuts
# straight to the first real turn frame, which reads as her eyes catching the cursor.
right = [fa] + R[1:]
left = [im[:, ::-1] for im in right]
seq = left[:0:-1] + right
os.makedirs(out, exist_ok=True)
for f in glob.glob(out + '/*.webp'): os.remove(f)
for i, im in enumerate(seq):
    a = im.copy(); a[..., :3] *= (a[..., 3:] > 0)  # clean colour under fully transparent pixels
    im8 = Image.fromarray((a * 255 + .5).astype(np.uint8))
    # the source is 720p and is shown larger than that: a light unsharp mask keeps hair and glasses crisp
    rgb = im8.convert('RGB').filter(ImageFilter.UnsharpMask(radius=1.6, percent=70, threshold=2))
    rgb.putalpha(im8.getchannel('A'))
    rgb.save(f'{out}/{i:03d}.webp', 'WEBP', quality=92, method=6)
print(len(seq), 'frames; front at', len(left) - 1, '=', (len(left) - 1) / (len(seq) - 1))
