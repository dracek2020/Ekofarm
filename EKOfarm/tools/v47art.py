# EKOfarm v47 – grafika rybaření a pečiva ze Scenario do hry.
#   python3 tools/v47art.py <složka s obrázky ze Scenario>
# Vstup: ikony__ryby1..3, ikony__pecivo1 (archy 4×3), ikony__pecivo2 (4×2), c1__zito, c1__mak (3 fáze rostliny),
#        p__rybar (5 póz farmáře s prutem v řadě), s__rybareni (scéna rybníka na výšku, neprůhledná).
# Výstup: public/img/i/<id>.webp (ikony 128×128), public/img/c/<plodina>_0..2 (120×150), i/s_<plodina> (osivo),
#         public/img/r/rybar_0..4.webp (pózy, společné měřítko, výška 480 px) + public/img/r/rybar.json (špička prutu),
#         public/img/r/scena.webp (pozadí minihry 900×1350) a znovu public/js/assets.js. Původní obrázky nepřepisuje.
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from imgtools import dehaze, glow, dehalo, grid, icon, parts, trim, clean

SRC = sys.argv[1]
OUT = os.path.join(HERE, '..', 'public', 'img')
SHEETS = {
    'ikony__ryby1': (4, 3, 'perlin ouklej cejnek jezdik tloust jesen tolstolobik siven marena mnik cerv trpytka'),
    'ikony__ryby2': (4, 3, 'masova_navnada rybi_jednohubky perlin_cesnek cejnek_testicko polevka_jezdik tloust_cibule rybi_pomazanka jesen_zelenina pstruh_maslo rybi_kolac tolstolobik_zelenina uzeny_tolstolobik'),
    'ikony__ryby3': (4, 3, 'siven_cesnek uzena_marena pecena_marena mnik_maslo rybi_misa zitna_mouka mlety_mak tvaroh zito mak ryba_obecna vlasec'),
    'ikony__pecivo1': (4, 3, 'rohlik pletynka cibulova_placka preclik zitny_bochnik cesnekova_bulka syrova_houska dynova_bulka tresnovy_satecek makovy_kolacek hroznovy_kolac tvarohovy_satecek'),
    'ikony__pecivo2': (4, 2, 'malinovy_croissant orechove_susenky jahodova_rolada makovy_zavin visnova_kapsa vanocka orechovy_venec rybarska_bedna'),
}
CROPS = ['zito', 'mak']
HALO = {'zito'}
made = []

def save(im, kind, name, q=84):
    os.makedirs(os.path.join(OUT, kind), exist_ok=True)
    p = os.path.join(OUT, kind, name + '.webp')
    if os.path.exists(p) and name not in made and not os.environ.get('PREPSAT'):
        raise SystemExit(f'{kind}/{name} už existuje – původní grafiku nepřepisuju (PREPSAT=1 jen pro obrázky v47)')
    im.save(p, 'WEBP', quality=q, method=4)
    made.append(name)

def unwhite(im, lo=150, span=60, sat=70):
    a = np.array(im).astype(float); rgb = a[:, :, :3]; mn = rgb.min(2); mx = rgb.max(2)
    w = np.clip((mn - lo) / span, 0, 1) * np.clip(1 - (mx - mn) / sat, 0, 1)
    a[:, :, 3] *= 1 - w
    return Image.fromarray(a.astype('uint8'))

def packet(inner):   # balíček semínek jako tools/fantasy.py
    c = Image.new('RGBA', (128, 128), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.rounded_rectangle([22, 18, 106, 122], 10, fill=(243, 227, 195, 255), outline=(160, 118, 63, 255), width=4)
    d.polygon([(22, 30), (36, 8), (92, 8), (106, 30)], fill=(217, 196, 160, 255), outline=(160, 118, 63, 255))
    d.line([(36, 108), (92, 108)], fill=(200, 69, 45, 255), width=5)
    c.alpha_composite(inner.resize((76, 76), Image.LANCZOS), (26, 28))
    return c

def load(key):
    p = os.path.join(SRC, key + '.webp')
    if not os.path.exists(p): raise SystemExit('chybí ' + key)
    return Image.open(p)

icons = {}
for key, (cols, rows, names) in SHEETS.items():
    sheet = load(key).convert('RGBA')
    for name, im in zip(names.split(), grid(dehalo(glow(dehaze(sheet, T=200))), cols, rows)):
        if im is None: raise SystemExit(f'{key}: chybí {name}')
        icons[name] = icon(im)
        save(icons[name], 'i', name)

CW, CH = 120, 150
for crop in CROPS:
    src = load('c1__' + crop).convert('RGBA')
    if crop in HALO: src = unwhite(src)
    ims = [trim(x) for x in parts(dehalo(glow(dehaze(src, T=230))), 3)]
    s = min((CW - 4) / max(x.width for x in ims), (CH - 4) / ims[2].height)
    for st, im in enumerate(ims):
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        c = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
        c.alpha_composite(im, (CW // 2 - im.width // 2, CH - 2 - im.height))
        save(c, 'c', f'{crop}_{st}')
    save(packet(icons[crop]), 'i', 's_' + crop)

def figures(im, n):
    """n postav v řadě: největší souvislé ostrůvky = postavy (i s prutem), drobné kousky se přidají k nejbližší; zleva doprava."""
    from scipy import ndimage
    a = np.array(im); m = a[:, :, 3] > 24
    lab, k = ndimage.label(m)
    sz = ndimage.sum(m, lab, range(1, k + 1)); boxes = ndimage.find_objects(lab)
    big = sorted(range(k), key=lambda j: -sz[j])[:n]
    owner = {}
    cx = lambda j: (boxes[j][1].start + boxes[j][1].stop) / 2
    for j in range(k):
        if sz[j] < 40: continue
        owner[j] = j if j in big else min(big, key=lambda b: abs(cx(b) - cx(j)) - (0 if boxes[b][1].start <= cx(j) <= boxes[b][1].stop else -1e6) * 0)
    out = []
    for b in sorted(big, key=cx):
        mask = np.isin(lab, [j + 1 for j, o in owner.items() if o == b])
        c = a.copy(); c[~mask, 3] = 0
        out.append(trim(Image.fromarray(c)))
    return out

# farmář s prutem: 5 póz, společné měřítko (stejná výška postavy), špička prutu pro vlasec
H = 480
src = load('p__rybar').convert('RGBA')
poses = figures(dehalo(glow(dehaze(src, T=235))), 5)
s = H / max(p.height for p in poses)
meta = []
for i, p in enumerate(poses):
    p = p.resize((round(p.width * s), round(p.height * s)), Image.LANCZOS)
    p = clean(p)
    a = np.array(p)[:, :, 3] > 60
    ys, xs = np.nonzero(a)
    top = ys.min() + (ys.max() - ys.min()) * 0.55   # prut je v horní části (nad rameny)
    sel = ys < top
    if i == 1: k = np.argmin(xs[sel] * 1.0 + ys[sel] * 0.35)      # prut za ramenem: nejvíc vlevo nahoře
    else: k = np.argmax(xs[sel] * 1.0 - ys[sel] * 0.35)           # prut dopředu: nejvíc vpravo nahoře
    meta.append({'w': p.width, 'h': p.height, 'tip': [int(xs[sel][k]), int(ys[sel][k])]})
    save(p, 'r', f'rybar_{i}', q=86)
json.dump(meta, open(os.path.join(OUT, 'r', 'rybar.json'), 'w'))
scene = load('s__rybareni').convert('RGB')
scene = scene.resize((900, round(900 * scene.height / scene.width)), Image.LANCZOS)
save(scene, 'r', 'scena', q=78)

js = '// Vygenerováno nástrojem tools/assets.py / tools/fantasy.py / tools/ui.py – seznam grafiky ve hře (public/img/<druh>/<jméno>.webp).\n'
allf = {k: sorted(f[:-5] for f in os.listdir(os.path.join(OUT, k)) if f.endswith('.webp')) for k in sorted(os.listdir(OUT)) if os.path.isdir(os.path.join(OUT, k)) and k != 'u'}
js += 'export const ASSETS = ' + json.dumps(allf, ensure_ascii=False) + ';\n'
open(os.path.join(HERE, '..', 'public', 'js', 'assets.js'), 'w', encoding='utf8').write(js)
print('obrázků', len(made), json.dumps(meta))
