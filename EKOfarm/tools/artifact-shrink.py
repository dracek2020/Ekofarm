# v47: menší kopie velkých obrázků JEN pro testovací verzi (artefakt má limit 16 MB): ilustrace událostí (public/img/e)
# a scéna rybaření se zmenší a víc zkomprimují do build/img-small/<druh>/<jméno>.webp. Hra online používá originály.
#   python3 tools/artifact-shrink.py   (pak npm run build:artifact)
import os
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC, OUT = os.path.join(ROOT, 'public', 'img'), os.path.join(ROOT, 'build', 'img-small')
JOBS = {'e': (480, 60), 'r/scena': (720, 70)}
n = 0
for key, (w, q) in JOBS.items():
    kind, only = (key.split('/') + [None])[:2]
    for f in sorted(os.listdir(os.path.join(SRC, kind))):
        if not f.endswith('.webp') or (only and f[:-5] != only): continue
        im = Image.open(os.path.join(SRC, kind, f))
        if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        os.makedirs(os.path.join(OUT, kind), exist_ok=True)
        im.save(os.path.join(OUT, kind, f), 'WEBP', quality=q, method=6); n += 1
print('zmenšeno', n)
