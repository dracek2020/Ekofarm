# EKOfarm – příprava grafiky pro hru z balíčků od hráče (jednou, při nové grafice).
#   python3 tools/assets.py <složka 02_JEDNOTLIVE_PNG> <složka 01_KOMPLETNI_ARCHY>
# Výstup: public/img/{t,c,s,b,z,m,p,i}/*.webp (2× rozlišení) a public/js/assets.js (seznam pro hru).
# Plodiny a stromy (archy 2, 3, 6, 7) se berou z jednotlivých výřezů (stejná buňka pro všechny fáze),
# všechno ostatní se vyřízne z kompletních archů po celých objektech – výřezy v mřížce některé obrázky ořízly.
# Doplňkové archy 17–19 (patří do složky s kompletními archy): 17 sója, hrách a salát (nahrazují kopie okurky
# a zelí), 18 lesní stromy (celé, s kmenem), 19 ikony 6 ryb a jídel z v15.
# Originály se do hry nekopírují – zůstávají u hráče.
import os, sys, json, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

SRC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/a2/02_JEDNOTLIVE_PNG'
SHEETS = sys.argv[2] if len(sys.argv) > 2 else '/tmp/a1/01_KOMPLETNI_ARCHY'
ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'public', 'img')
made = {}

def src(arch, idx):
    d = os.path.join(SRC, f'Arch_{arch:02d}')
    return os.path.join(d, sorted(os.listdir(d))[idx - 1])

def clean(im, keep_ratio=0.25):
    """Odstraní úlomky sousedních obrázků (malé ostrůvky u okraje výřezu) a skoro průhledné pixely."""
    a = np.array(im)
    alpha = a[:, :, 3]
    mask = alpha > 24
    lab, n = ndimage.label(mask)
    if n > 1:
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        big = sizes.max()
        h, w = mask.shape
        drop = np.zeros(n + 1, bool)
        for i, (sl, sz) in enumerate(zip(ndimage.find_objects(lab), sizes), 1):
            touches = sl[0].start == 0 or sl[1].start == 0 or sl[0].stop == h or sl[1].stop == w
            drop[i] = sz < big * 0.004 or (touches and sz < big * keep_ratio)
        a[drop[lab], 3] = 0
    a[alpha <= 8, 3] = 0
    return Image.fromarray(a)

def trim(im):
    bb = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    return im.crop(bb) if bb else im

def save(im, kind, name):
    os.makedirs(os.path.join(OUT, kind), exist_ok=True)
    im.save(os.path.join(OUT, kind, name + '.webp'), 'WEBP', quality=84, method=4)
    made.setdefault(kind, []).append(name)

def load(arch, idx, ratio=0.25):
    return clean(Image.open(src(arch, idx)).convert('RGBA'), ratio)

def fit_w(im, w):
    return im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)

def grid_cells(arch, rows, cols):
    """Arch, kde má jedna buňka víc kousků (několik rostlinek): řádky a sloupce podle průhledných mezer."""
    a = np.array(Image.open(glob.glob(os.path.join(SHEETS, f'Arch_{arch:02d}_*.png'))[0]).convert('RGBA'))
    m = a[:, :, 3] > 24
    def bands(v):
        out = []
        for i in np.where(v)[0]:
            if out and i - out[-1][1] <= 10: out[-1][1] = i + 1   # mezera do 10 px = pořád stejný pás
            else: out.append([i, i + 1])
        return [b for b in out if b[1] - b[0] >= 12]                # drobné smítko není pás
    rb = bands(m.any(1))
    if len(rb) != rows: raise SystemExit(f'Arch {arch}: čekám {rows} řádky, našel jsem {len(rb)}')
    out = []
    for r0, r1 in rb:
        cb = bands(m[r0:r1].any(0))
        if len(cb) != cols: raise SystemExit(f'Arch {arch}: čekám {cols} sloupce, našel jsem {len(cb)}')
        for c0, c1 in cb:
            c = a[r0:r1, c0:c1].copy(); c[c[:, :, 3] <= 8, 3] = 0
            out.append(Image.fromarray(c))
    return out

_sheets = {}
def sheet(arch, expect=None):
    """Objekty z kompletního archu v pořadí čtení (po řádcích zleva). Každý objekt = souvislá oblast;
    drobnosti poblíž (včely u úlů) se přidají k nejbližšímu, dva slité objekty se rozdělí v nejužším místě."""
    if arch in _sheets: return _sheets[arch]
    a = np.array(Image.open(glob.glob(os.path.join(SHEETS, f'Arch_{arch:02d}_*.png'))[0]).convert('RGBA'))
    mask = a[:, :, 3] > 24
    lab, n = ndimage.label(mask)
    sizes = ndimage.sum(mask, lab, range(1, n + 1)); boxes = ndimage.find_objects(lab)
    big = [i for i in range(n) if sizes[i] > sizes.max() * 0.08]
    groups = {i: [i] for i in big}
    for i in range(n):
        if i in groups or sizes[i] < 150: continue
        cy = (boxes[i][0].start + boxes[i][0].stop) / 2; cx = (boxes[i][1].start + boxes[i][1].stop) / 2
        def dist(b):
            sy, sx = boxes[b]
            return max(sy.start - cy, 0, cy - sy.stop) + max(sx.start - cx, 0, cx - sx.stop)
        near = min(big, key=dist)
        if dist(near) < 70: groups[near].append(i)
    items = []
    for members in groups.values():
        m = np.isin(lab, [k + 1 for k in members])
        soft = ndimage.binary_dilation(m, iterations=4) & ~(mask & ~m)     # i měkký okraj a stín
        ys = np.where(soft.any(1))[0]; xs = np.where(soft.any(0))[0]
        y0, y1, x0, x1 = ys[0], ys[-1] + 1, xs[0], xs[-1] + 1
        c = a[y0:y1, x0:x1].copy(); c[~soft[y0:y1, x0:x1], 3] = 0; c[c[:, :, 3] <= 8, 3] = 0
        items.append([y0, y1, x0, x1, c])
    while expect and len(items) < expect:      # slité objekty: nejširší rozdělit v nejužším místě u středu
        k = max(range(len(items)), key=lambda j: items[j][3] - items[j][2])
        y0, y1, x0, x1, c = items[k]
        w = c.shape[1]; cols = (c[:, :, 3] > 24).sum(0)
        cut = w // 3 + int(np.argmin(cols[w // 3: w - w // 3]))
        items[k:k + 1] = [[y0, y1, x0, x0 + cut, c[:, :cut].copy()], [y0, y1, x0 + cut, x1, c[:, cut:].copy()]]
    items.sort(key=lambda it: it[0])
    rows = []
    for it in items:
        if rows and (it[0] + it[1]) / 2 < max(r[1] for r in rows[-1]): rows[-1].append(it)
        else: rows.append([it])
    out = [Image.fromarray(it[4]) for r in rows for it in sorted(r, key=lambda it: it[2])]
    if expect and len(out) != expect: raise SystemExit(f'Arch {arch}: čekám {expect} objektů, našel jsem {len(out)}')
    _sheets[arch] = out
    return out
def obj(arch, idx, expect=None):
    return sheet(arch, expect)[idx - 1]

# ---------- budovy a ozdoby na plátno podle šablony (2×: šířka (w+h)*96, výška 1,25×, přední roh 24 px nad spodkem) ----------
def canvas(im, w, h, fill=0.94, flat=False):
    W = (w + h) * 96; H = round(W * 1.25); bottom = H - 24
    im = trim(im)
    s = min(W * fill / im.width, (bottom - 4) / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    drop = round(im.height * 0.03)
    # plochý objekt (rybník) má strmější půdorys než mřížka hry – posadit až ke spodku plátna, aby byl uprostřed svých políček
    top = H - im.height if flat else min(H - im.height, bottom + drop - im.height)
    c.alpha_composite(im, (W // 2 - im.width // 2, top))
    return c

BUILD = [  # (arch, pořadí, jméno, políček w, h)
    (4, 1, 'stodola', 3, 2), (4, 2, 'rybnik', 3, 3), (4, 3, 'vcelin', 2, 2), (4, 4, 'rybarna', 2, 2), (4, 5, 'medarna', 2, 2),
    (5, 1, 'prodejna', 3, 3), (5, 2, 'stanek', 3, 3), (5, 3, 'trziste', 3, 3), (5, 4, 'domek_a', 2, 2), (5, 5, 'domek_b', 2, 2), (5, 6, 'domek_c', 2, 2),
    (8, 1, 'kurnik', 2, 2), (8, 2, 'kravin', 3, 3), (8, 3, 'prasecak', 3, 3), (8, 4, 'ovcin', 3, 3),
    (10, 1, 'ker', 1, 1), (10, 2, 'kvetiny', 1, 1), (10, 3, 'lavicka', 1, 1), (10, 4, 'jablon', 1, 1), (10, 5, 'fontana', 1, 1),
]
COUNT = {1: 12, 4: 5, 5: 6, 8: 8, 9: 14, 10: 9}
for arch, i, name, w, h in BUILD:
    im = obj(arch, i, COUNT[arch])
    save(canvas(im, w, h, 0.9, True) if name == 'rybnik' else canvas(im, w, h), 'b', name)

# ---------- dlaždice země (kosočtverec 192×96 ve 2×) ----------
TILES = ['trava_a', 'trava_b', 'louka_a', 'louka_b', 'cesta_a', 'cesta_b', 'dlazba', 'pole', 'pole_osete']
for i, name in enumerate(TILES, 1):
    save(fit_w(trim(obj(1, i, 12)), 192), 't', name)
save(fit_w(trim(obj(1, 10)), 120), 't', 'plot_se')     # plot podél hrany ↘
save(fit_w(trim(obj(1, 11)), 120), 't', 'plot_ne')     # plot podél hrany ↗
save(fit_w(trim(obj(1, 12)), 128), 't', 'cedule')

# ---------- plodiny: celý výřez (stejné umístění ve všech fázích), 3 fáze ----------
CROPS = ['wheat', 'redkvicka', 'salat', 'corn', 'rajce', 'carrot', 'okurka', 'potato', 'jahody', 'cibule',
         'soy', 'cesnek', 'repka', 'paprika', 'sun', 'zeli', 'beet', 'hrach', 'meloun', 'dyne']
NEW_CROPS = ['soy', 'hrach', 'salat']   # z archu 17 (v archu 2 a 3 byly kopie okurky a zelí)
for k, crop in enumerate(CROPS):
    if crop in NEW_CROPS: continue
    arch, base = (2, k * 3) if k < 10 else (3, (k - 10) * 3)
    for st in range(3):
        im = load(arch, base + st + 1, 0.6)
        save(im, 'c', f'{crop}_{st}')
# nové plodiny na stejné plátno jako ostatní (173×173, rostliny stojí na y 157 uprostřed), jedno měřítko pro
# všechny 3 fáze – zralá rostlina je zhruba stejně široká jako zralé plodiny z archů 2 a 3
cells17 = grid_cells(17, 3, 3)
for r, crop in enumerate(NEW_CROPS):
    ims = [trim(x) for x in cells17[r * 3: r * 3 + 3]]
    s = min(146 / ims[2].width, 150 / max(x.height for x in ims))
    for st, im in enumerate(ims):
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        c = Image.new('RGBA', (173, 173), (0, 0, 0, 0))
        c.alpha_composite(im, (86 - im.width // 2, 158 - im.height))
        save(c, 'c', f'{crop}_{st}')

# ---------- stromy a keře do sadu (stejné měřítko pro všechny 3 stavy) ----------
TREES = [(6, 'jablon'), (6, 'hrusen'), (6, 'svestka'), (6, 'tresen'), (6, 'visen'), (6, 'merunka'), (6, 'broskev'),
         (7, 'orech'), (7, 'maliny'), (7, 'rybiz'), (7, 'angrest'), (7, 'boruvky'), (7, 'reva')]
BUSH = dict(maliny=0.78, rybiz=0.78, angrest=0.78, boruvky=0.78, reva=0.9)   # keře jsou menší než stromy
def tree_set(ims, names, kind, k=1.0, shadow=False):
    ims = [trim(x) for x in ims]
    s = k * min(min(176 / x.width, 200 / x.height) for x in ims)
    for im, name in zip(ims, names):
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        c = Image.new('RGBA', (192, 240), (0, 0, 0, 0))   # 1 políčko: kmen na středu políčka (y 168+)
        if shadow:   # měkký stín na zemi pod lesním stromem
            sh = Image.new('L', (192, 240), 0)
            ImageDraw.Draw(sh).ellipse([96 - im.width * 0.4, 182 - 15, 96 + im.width * 0.4, 182 + 13], fill=70)
            c.putalpha(sh.filter(ImageFilter.GaussianBlur(5)))
        c.alpha_composite(im, (96 - im.width // 2, 182 - im.height))
        save(c, kind, name)
counter = {6: 0, 7: 0}
for arch, tid in TREES:
    b = counter[arch]; counter[arch] += 3
    tree_set([load(arch, b + 1), load(arch, b + 2), load(arch, b + 3)], [f'{tid}_grow', f'{tid}_ready', f'{tid}_dead'], 's', BUSH.get(tid, 1.0))
for j, n in enumerate(['les_a', 'les_b', 'les_c']):   # dub, smrk, bříza z archu 18 (v archu 7 byly dole uříznuté)
    tree_set([obj(18, j + 1, 3)], [n], 's', shadow=True)

# ---------- zvířata, stroje, lidé (ořez, 2× velikost ve hře) ----------
for i, (name, w) in enumerate([('slepice', 52), ('krava', 140), ('prase', 104), ('ovce', 104)], 5):
    save(fit_w(trim(obj(8, i, 8)), w), 'z', name)
MACH = ['brazda60', 'brazda120', 'klas4', 'klas8', 'pluh', 'secka', 'lis']
for k, m in enumerate(MACH):
    for j, side in enumerate(['l', 'r']):
        save(fit_w(trim(obj(9, k * 2 + j + 1, 14)), 144 if k < 4 else 112), 'm', f'{m}_{side}')
for i, name in enumerate(['farmar_l', 'farmar_r', 'pomocnik_l', 'pomocnik_r'], 6):
    im = trim(obj(10, i, 9))
    save(im.resize((round(im.width * 68 / im.height), 68), Image.LANCZOS), 'p', name)

# ---------- ikony předmětů 128×128 ----------
ICON_ARCH = {
    11: 'wheat corn soy repka sun hrach redkvicka salat carrot rajce potato okurka cibule cesnek paprika beet zeli dyne jahody meloun',
    12: 'jablko hruska svestka tresne merunka visne broskev orech maliny rybiz angrest boruvky hrozny krmivo_slepice krmivo_kravy krmivo_prasata krmivo_ovce vejce mleko maso',
    13: 'vlna chleb kolac tresnovy_kolac muffiny buchty orechovy_kolac mouka smetana syr maslo olej sl_olej cukr salat_mix okurky kecup lecho kysane_zeli kompot',
    14: 'hrachovka dynovka broskve_sklo dzus_mrkev dzus_jablko dzus_hruska dzus_visne most napoj povidla dzem_malina dzem_jahoda marmelada dzem_merunka klobasa uzene klubko svetr deka slama',
    15: 'seminkovy_chleb prazena_seminka dynovy_olej navnada plast med svicka medovnik pernik rybi_polevka smazeny_kapr peceny_lin rybi_prsty uzeny_pstruh candat_maslo stika_cibule sumcovy_gulas plotice kapr lin',
    16: 'okoun pstruh candat stika sumec udice udice2 kolecko motyka',
    19: 'karas cejn amur uhor bolen jeseter rybi_karbanatky amur_gril - - bolen_bylinky',   # „-“ = v archu je jiné jídlo, nepoužije se
}
def icon(im, fill=0.92):
    im = trim(im)
    s = 128 * fill / max(im.width, im.height)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    c = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    c.alpha_composite(im, ((128 - im.width) // 2, (128 - im.height) // 2))
    return c
icons = {}
for arch, names in ICON_ARCH.items():
    for i, n in enumerate(names.split(), 1):
        if n == '-': continue
        icons[n] = icon(obj(arch, i, len(names.split())))
        save(icons[n], 'i', n)
# ikony budov, zvířat a strojů z herní grafiky (aby UI vypadalo stejně jako mapa)
def from_img(path, fill=0.96):
    return icon(Image.open(path).convert('RGBA'), fill)
P = lambda k, n: os.path.join(OUT, k, n + '.webp')
for key, path in [('house', P('b', 'statek_1')), ('barn', P('b', 'sklad_1')), ('garage', P('b', 'stodola')), ('shop', P('b', 'prodejna')),
                  ('stall', P('b', 'stanek')), ('market', P('b', 'trziste')), ('pond', P('b', 'rybnik')), ('hive', P('b', 'vcelin')),
                  ('tree', P('s', 'jablon_ready')), ('blossom', P('b', 'jablon')), ('bush', P('b', 'ker')), ('flowers', P('b', 'kvetiny')),
                  ('bench', P('b', 'lavicka')), ('fountain', P('b', 'fontana')), ('hen', P('z', 'slepice')), ('cow', P('z', 'krava')),
                  ('pig', P('z', 'prase')), ('sheep', P('z', 'ovce')), ('tractor', P('m', 'brazda60_l')), ('combine', P('m', 'klas4_l')),
                  ('pluh', P('m', 'pluh_l')), ('secka', P('m', 'secka_l')), ('lis', P('m', 'lis_l')), ('farmer', P('p', 'farmar_l')),
                  ('helper', P('p', 'pomocnik_l')), ('plot', P('t', 'pole'))]:
    if os.path.exists(path):
        save(from_img(path), 'i', key)
# semena (balíček s plodinou) a sazenice (květináč s ovocem)
def packet(inner):
    c = Image.new('RGBA', (128, 128), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.rounded_rectangle([22, 18, 106, 122], 10, fill=(243, 227, 195, 255), outline=(160, 118, 63, 255), width=4)
    d.polygon([(22, 30), (36, 8), (92, 8), (106, 30)], fill=(217, 196, 160, 255), outline=(160, 118, 63, 255))
    d.line([(36, 108), (92, 108)], fill=(200, 69, 45, 255), width=5)
    c.alpha_composite(inner.resize((76, 76), Image.LANCZOS), (26, 28))
    return c
def pot(inner):
    c = Image.new('RGBA', (128, 128), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.line([(64, 80), (64, 36)], fill=(122, 78, 42, 255), width=6)
    d.ellipse([30, 34, 66, 52], fill=(95, 174, 58, 255)); d.ellipse([62, 26, 98, 44], fill=(79, 154, 58, 255))
    d.polygon([(36, 84), (92, 84), (84, 124), (44, 124)], fill=(200, 102, 45, 255)); d.rectangle([32, 76, 96, 88], fill=(168, 84, 42, 255))
    c.alpha_composite(inner.resize((56, 56), Image.LANCZOS), (68, 2))
    return c
for crop in CROPS:
    save(packet(icons[crop]), 'i', 's_' + crop)
TREE_FRUIT = dict(jablon='jablko', hrusen='hruska', svestka='svestka', tresen='tresne', visen='visne', merunka='merunka', broskev='broskev',
                  orech='orech', maliny='maliny', rybiz='rybiz', angrest='angrest', boruvky='boruvky', reva='hrozny')
for t, f in TREE_FRUIT.items():
    save(pot(icons[f]), 'i', 'z_' + t)

# ---------- seznam pro hru ----------
js = '// Vygenerováno nástrojem tools/assets.py – seznam grafiky ve hře (public/img/<druh>/<jméno>.webp).\n'
allf = {k: sorted(f[:-5] for f in os.listdir(os.path.join(OUT, k)) if f.endswith('.webp')) for k in sorted(made)}
js += 'export const ASSETS = ' + json.dumps(allf, ensure_ascii=False) + ';\n'
open(os.path.join(ROOT, 'public', 'js', 'assets.js'), 'w', encoding='utf8').write(js)
tot = sum(os.path.getsize(os.path.join(OUT, k, n + '.webp')) for k, v in allf.items() for n in v)
print({k: len(v) for k, v in allf.items()}, 'celkem', tot // 1024, 'kB')
