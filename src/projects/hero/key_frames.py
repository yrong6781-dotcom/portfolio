"""Cut the flat dark background out of a head-turn clip -> transparent WebP frames.
usage: key_frames.py VIDEO START END OUTDIR [SIZE] [FPS]
The background is found by flood-filling from the top/left/right borders (not the
bottom: the hoodie and black T-shirt touch it), so dark interior areas stay opaque.
Edge pixels get a soft alpha from their colour distance to the background."""
import sys, os, subprocess, glob, numpy as np, cv2
from PIL import Image
FF = os.path.expanduser('~/Library/Python/3.9/lib/python/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1')
video, start, end, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
size = int(sys.argv[5]) if len(sys.argv) > 5 else 720
fps = sys.argv[6] if len(sys.argv) > 6 else '24'
tmp = out + '_raw'
os.makedirs(tmp, exist_ok=True); os.makedirs(out, exist_ok=True)
for f in glob.glob(tmp + '/*') + glob.glob(out + '/*'): os.remove(f)
subprocess.run([FF, '-loglevel', 'error', '-y', '-ss', start, '-to', end, '-i', video, '-an',
                '-vf', f'fps={fps}', tmp + '/%03d.png'], check=True)
files = sorted(glob.glob(tmp + '/*.png'))
for i, f in enumerate(files):
    img = cv2.imread(f)  # BGR
    h, w = img.shape[:2]
    # background colour = median of the top border
    bg = np.median(img[:8].reshape(-1, 3), axis=0)
    dist = np.linalg.norm(img.astype(np.float32) - bg, axis=2)
    near = (dist < 22).astype(np.uint8)
    # connected-to-border background (top, left, right edges)
    n, lab = cv2.connectedComponents(near, connectivity=4)
    border = set(np.unique(np.concatenate([lab[0], lab[:, 0], lab[:, -1]]))) - {0}
    bgmask = np.isin(lab, list(border)) & (near > 0)
    # soft edge: inside a band around the background, alpha follows colour distance
    band = cv2.dilate(bgmask.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    soft = np.clip((dist - 10) / 40, 0, 1)
    alpha = np.ones((h, w), np.float32)
    alpha[band] = soft[band]
    alpha[bgmask] = 0
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0)
    # un-mix the background from semi-transparent pixels
    a3 = np.maximum(alpha, 1e-3)[..., None]
    rgb = (img.astype(np.float32) - (1 - a3) * bg) / a3
    page = np.array([27, 17, 17], np.float32)  # #11111b in BGR
    rgb = rgb + (page - bg)  # leftover background specks blend into the page
    rgb = np.clip(rgb, 0, 255).astype(np.uint8)
    rgba = np.dstack([cv2.cvtColor(rgb, cv2.COLOR_BGR2RGB), (alpha * 255).astype(np.uint8)])
    im = Image.fromarray(rgba)
    # square crop around the character's horizontal extent across the clip is done by caller via CROP env
    crop = os.environ.get('CROP')  # "x,y,w,h"
    if crop:
        x, y, cw, ch = map(int, crop.split(','))
        im = im.crop((x, y, x + cw, y + ch))
    im = im.resize((size, round(size * im.height / im.width)), Image.LANCZOS)
    im.save(f'{out}/{i:03d}.webp', 'WEBP', quality=82, method=6)
print(len(files), 'frames')
