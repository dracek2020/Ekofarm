# EKOfarm v35 – nové budovy („pestrá farma“: každá budova jiná střecha, materiál a poznávací znak) ze Scenario do hry.
#   python3 tools/budovy.py <složka s obrázky ze Scenario>
# Vstup: b__<jméno>.webp (např. b__statek_1.webp, b__pekarna.webp) – zpracují se jen budovy, které ve složce jsou.
# Výstup: public/img/b/<jméno>.webp (stejné plátno jako dosud: šířka (w+h)×96, výška 1,25×, přední roh 24 px nad spodkem),
#         ikony budov v public/img/i (house, barn, garage, pond, hive) a znovu public/js/assets.js.
# Originály ze Scenario se do hry nekopírují.
import os, sys, json
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from imgtools import trim, dehaze, glow, dehalo, base_geom, canvas, icon

SRC = sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'public', 'img')
SIZES = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'building_sizes.json')))
made = []

def save(im, kind, name):
    p = os.path.join(OUT, kind, name + '.webp')
    im.save(p, 'WEBP', quality=84, method=4)
    made.append(f'{kind}/{name} {im.width}×{im.height} {os.path.getsize(p) // 1024} kB')

def rect_fit(im, w, h):
    """Obdélníkový podstavec: levý, pravý a přední roh → rohy W, E, S políček na plátně šablony.
    x se jen škáluje (svislé hrany zůstanou svislé), y se lineárně přepočítá z x a y (svislé zkosení)."""
    a = np.array(im)[:, :, 3] > 24; H, W = a.shape
    low = a[int(H * 0.5):]                                   # rohy podstavce leží ve spodní polovině
    cols = np.where(low.any(0))[0]; xl, xr = cols[0], cols[-1]
    yl = int(H * 0.5) + np.where(low[:, xl])[0].mean(); yr = int(H * 0.5) + np.where(low[:, xr])[0].mean()
    yb = np.where(a.any(1))[0][-1]; xb = np.where(a[yb])[0].mean()
    CW = (w + h) * 96; CH = round(CW * 1.25); bot = CH - 24
    T = np.array([[0, bot - w * 48], [w * 96, bot], [CW, bot - h * 48]], float)   # W, S, E
    S_ = np.array([[xl, yl], [xb, yb], [xr, yr]], float)
    sx = (T[2, 0] - T[0, 0]) / (S_[2, 0] - S_[0, 0]); cx = T[0, 0] - sx * S_[0, 0]
    d, e, f = np.linalg.solve(np.c_[S_, np.ones(3)], T[:, 1])   # y' = d·x + e·y + f
    # PIL: výstupní (X, Y) → vstupní (x, y): x = (X − cx)/sx, y = (Y − d·x − f)/e
    ix = 1 / sx
    coeffs = (ix, 0, -cx * ix, -d * ix / e, 1 / e, (d * cx * ix - f) / e)
    return im.transform((CW, CH), Image.AFFINE, coeffs, resample=Image.BICUBIC)

names = sorted(f[3:-5] for f in os.listdir(SRC) if f.startswith('b__') and f.endswith('.webp'))
if not names: raise SystemExit('ve složce nejsou žádné b__*.webp')
for name in names:
    kind = name.split('_')[0] if name.startswith(('statek_', 'sklad_')) else name
    if kind not in SIZES: raise SystemExit('neznámá budova ' + name)
    w, h = SIZES[kind][:2]
    im = trim(dehalo(glow(dehaze(Image.open(os.path.join(SRC, f'b__{name}.webp')).convert('RGBA'), T=230))))
    # Podstavec ze Scenario bývá strmější (šířka : výška ≈ 1,6–1,9 : 1) než mřížka hry (2 : 1) – svislé stlačení podle něj.
    if w != h:   # obdélník (Stodola 3×2): rohy podstavce přímo na rohy políček
        save(rect_fit(im, w, h), 'b', name); continue
    g = base_geom(im); r = g['rx'] / max(1, g['hh'])
    r = min(2.0, max(1.45, r)) if 1.3 <= r <= 2.3 else 1.67   # nejde změřit (zakrytý podstavec) – běžný poměr
    im = im.resize((im.width, round(im.height * r / 2)), Image.LANCZOS)
    save(canvas(im, w, h), 'b', name)

# ikony budov v rozhraní (aby vypadaly stejně jako mapa)
for key, src in [('house', 'statek_1'), ('barn', 'sklad_1'), ('garage', 'stodola'), ('pond', 'rybnik'), ('hive', 'vcelin')]:
    if src in names: save(icon(Image.open(os.path.join(OUT, 'b', src + '.webp')).convert('RGBA'), 0.96), 'i', key)

js = '// Vygenerováno nástrojem tools/assets.py / tools/fantasy.py / tools/ui.py – seznam grafiky ve hře (public/img/<druh>/<jméno>.webp).\n'
allf = {k: sorted(f[:-5] for f in os.listdir(os.path.join(OUT, k)) if f.endswith('.webp')) for k in sorted(os.listdir(OUT)) if os.path.isdir(os.path.join(OUT, k)) and k != 'u'}
js += 'export const ASSETS = ' + json.dumps(allf, ensure_ascii=False) + ';\n'
open(os.path.join(ROOT, 'public', 'js', 'assets.js'), 'w', encoding='utf8').write(js)
print('\n'.join(made))
