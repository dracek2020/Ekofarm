# EKOfarm – grafika rozhraní (v33, styl „lesní pohádková kniha“) ze Scenario do hry.
#   python3 tools/ui.py <složka s obrázky ze Scenario> [<složka s písmem>]
# Vstup: ui__panel.webp, ui__tiles.webp, ui__buttons.webp, ui__pill.webp, ui__round.webp, ui__bar.webp, ui__ribbon.webp,
#        ui__ozdoby.webp, ui__znak.webp, ui__splash.webp, ui__ikony_a|b|c.webp; písmo grandstander-latin(-ext).woff2 + OFL.txt.
# Výstup: public/img/u/*.webp (rámy, tlačítka, ozdoby – používá je jen CSS), malované ikony UI do public/img/i,
#         ikona aplikace, public/fonts/ a znovu public/js/assets.js (bez složky u).
import os, sys, json, shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from imgtools import clean, trim, dehaze, glow, parts, grid, icon

SRC = sys.argv[1]
FONT = sys.argv[2] if len(sys.argv) > 2 else None
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
IMG = os.path.join(ROOT, 'public', 'img')
made = []

def load(name):
    return Image.open(os.path.join(SRC, 'ui__' + name + '.webp')).convert('RGBA')

def save(im, kind, name, q=88):
    os.makedirs(os.path.join(IMG, kind), exist_ok=True)
    p = os.path.join(IMG, kind, name + '.webp')
    im.save(p, 'WEBP', quality=q, method=6)
    made.append(f'{kind}/{name} {im.width}×{im.height} {os.path.getsize(p) // 1024} kB')

def height(im, h):
    return im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)

def width(im, w):
    return im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)

def rows(im, n):
    """Objekty pod sebou (tlačítka): stejné řezání jako parts(), jen po řádcích."""
    return [p.transpose(Image.TRANSPOSE) for p in parts(im.transpose(Image.TRANSPOSE), n)]

def soft(im):
    return trim(glow(dehaze(im, T=200)))

# ---------- ikony rozhraní (nahradí kreslené SVG, klíče stejné jako v icons.js) ----------
SHEETS = {
    'a': ('coin star xp lock hammer cart gear trophy news chat book bell', lambda im: glow(dehaze(im, T=200))),
    'b': ('clock truck box axe gift sound mute sign user field up down', lambda im: glow(dehaze(im, T=200))),
    'c': ('w_sun w_cloud w_rain w_hot uzeny_uhor kaviar plus check cross butterfly', lambda im: glow(dehaze(im, T=160))),   # bílý mrak: jen poloprůhledný opar
}
UI_ONLY = {'plus', 'check', 'cross', 'butterfly'}   # jen pro CSS (zelené +, ✓, červené ×, motýl)
for k, (names, prep) in SHEETS.items():
    cells = grid(prep(load('ikony_' + k)), 4, 3)
    for name, im in zip(names.split(), cells):
        if im is None: raise SystemExit(f'ikony {k}: chybí {name}')
        if name in UI_ONLY: save(icon(im, 0.94).resize((96, 96), Image.LANCZOS), 'u', name)
        else: save(icon(glow(im, T=170, lum=0) if name == 'xp' else im), 'i', name)   # jetel: zelená záře pryč

# ---------- rámy a tlačítka (2× rozlišení; řezy pro border-image jsou v style.css) ----------
save(width(soft(load('panel')), 480), 'u', 'panel')
for im, name in zip(parts(soft(load('tiles')), 3), ['tile', 'tile_on', 'tile_gold']):
    save(width(trim(im), 192), 'u', name)
for im, name in zip(rows(soft(load('buttons')), 4), ['btn_green', 'btn_wood', 'btn_red', 'btn_gold']):
    save(height(trim(im), 96), 'u', name)
save(height(soft(load('pill')), 96), 'u', 'pill')
for im, name in zip(parts(soft(load('round')), 4), ['badge', 'medal', 'cap', 'round_green']):
    save(icon(trim(im), 1.0), 'u', name)
save(height(soft(load('bar')), 200), 'u', 'bar', q=86)
save(height(soft(load('ribbon')), 96), 'u', 'ribbon')
for im, name in zip(grid(glow(dehaze(load('ozdoby'))), 3, 2), ['o_leaf', 'o_toadstool', 'o_fern', 'o_flowers', 'o_acorn', 'o_moss']):
    if im is None: raise SystemExit('ozdoby: chybí ' + name)
    save(icon(im, 0.96).resize((96, 96), Image.LANCZOS), 'u', name)
znak = soft(load('znak'))
save(width(znak, 384), 'u', 'znak')
save(load('splash').convert('RGB').resize((720, 1080), Image.LANCZOS), 'u', 'splash', q=80)

# ---------- ikona aplikace: znak na teplém zeleném pozadí ----------
def app_icon(n):
    N = n * 4
    yy, xx = np.mgrid[0:N, 0:N] / N
    t = np.clip(np.sqrt((xx - 0.5) ** 2 + (yy - 0.45) ** 2) / 0.72, 0, 1)[..., None]
    rgb = (np.array([238, 226, 168]) * (1 - t) + np.array([92, 140, 56]) * t).astype(np.uint8)
    bg = Image.fromarray(np.dstack([rgb, np.full((N, N), 255, np.uint8)]), 'RGBA')
    z = znak.resize((round(N * 0.9), round(znak.height * N * 0.9 / znak.width)), Image.LANCZOS)
    bg.alpha_composite(z, ((N - z.width) // 2, (N - z.height) // 2))
    return bg.resize((n, n), Image.LANCZOS).convert('RGB')
for n in (192, 512):
    app_icon(n).save(os.path.join(IMG, f'icon-{n}.png'), optimize=True)

# ---------- písmo (licence OFL – OFL.txt musí ležet vedle písma) ----------
if FONT:
    fd = os.path.join(ROOT, 'public', 'fonts'); os.makedirs(fd, exist_ok=True)
    for f in ('grandstander-latin.woff2', 'grandstander-latin-ext.woff2', 'OFL.txt'):
        shutil.copy(os.path.join(FONT, f), os.path.join(fd, 'OFL-grandstander.txt' if f == 'OFL.txt' else f))

# ---------- seznam pro hru (bez složky u – tu načítá jen CSS) ----------
js = '// Vygenerováno nástrojem tools/assets.py / tools/fantasy.py / tools/ui.py – seznam grafiky ve hře (public/img/<druh>/<jméno>.webp).\n'
allf = {k: sorted(f[:-5] for f in os.listdir(os.path.join(IMG, k)) if f.endswith('.webp')) for k in sorted(os.listdir(IMG)) if os.path.isdir(os.path.join(IMG, k)) and k != 'u'}
js += 'export const ASSETS = ' + json.dumps(allf, ensure_ascii=False) + ';\n'
open(os.path.join(ROOT, 'public', 'js', 'assets.js'), 'w', encoding='utf8').write(js)
print('\n'.join(made))
print('u celkem', sum(os.path.getsize(os.path.join(IMG, 'u', f)) for f in os.listdir(os.path.join(IMG, 'u'))) // 1024, 'kB')
