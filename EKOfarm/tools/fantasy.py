# EKOfarm – pohádková grafika (v32) ze Scenario do hry.
#   python3 tools/fantasy.py <složka s obrázky ze Scenario> [<složka pro portréty>]
# Vstup: soubory pojmenované podle klíče (b__statek_1.webp, s3__jablon.webp, c3__wheat.webp, tex__trava_a.webp,
# ikony__1.webp, portrety__1.webp, z__slepice.webp, m__brazda60.webp, p__farmar.webp, t__plot_se.webp, les3__les.webp).
# Výstup: public/img/{t,c,s,b,z,m,p,i}/*.webp (2× rozlišení, stejné rozměry plátna jako dosud) a public/js/assets.js.
# Budovy mají vlastní travnatý (ve městě dlážděný) podstavec ve tvaru půdorysu – přední roh podstavce sedí na
# předním rohu políček. Originály ze Scenario se do hry nekopírují.
import os, sys, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

SRC = sys.argv[1]
ART = sys.argv[2] if len(sys.argv) > 2 else None
ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'public', 'img')
made = {}

def load(key):
    for ext in ('webp', 'png'):
        p = os.path.join(SRC, key.replace('/', '__') + '.' + ext)
        if os.path.exists(p): return Image.open(p).convert('RGBA')
    raise SystemExit('chybí ' + key)

def clean(im, haze=True):
    """Průhledné pozadí: pryč skoro průhledné pixely, bělavý opar kolem objektu a drobné ostrůvky."""
    a = np.array(im).astype(np.int16)
    al = a[:, :, 3]
    if haze:   # poloprůhledný světlý opar (záře kolem objektu) – plné pixely (ovce, vejce) zůstávají
        rgb = a[:, :, :3]; mx = rgb.max(2); mn = rgb.min(2)
        al[(al < 150) & (mn > 150) & (mx - mn < 40)] = 0
    al[al <= 24] = 0
    m = al > 0
    lab, n = ndimage.label(m)
    if n > 1:
        sz = ndimage.sum(m, lab, range(1, n + 1))
        small = np.concatenate([[False], sz < sz.max() * 0.002])
        al[small[lab]] = 0
    a[:, :, 3] = al
    return Image.fromarray(a.astype(np.uint8))

def trim(im):
    bb = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    return im.crop(bb) if bb else im

def dehaze(im, T=245, sat=50, lum=140, pockets=0):
    """Bělavý opar/pozadí pryč: bělavé poloprůhledné pixely spojené s okrajem nebo průhlednou plochou.
    pockets>0: navíc uzavřené čistě bílé plochy větší než pockets px (bílé pozadí mezi rostlinami a větvemi)."""
    a = np.array(im).astype(np.int16); al = a[:, :, 3]
    rgb = a[:, :, :3]; mx = rgb.max(2); mn = rgb.min(2)
    whitish = (mn > lum) & (mx - mn < sat)
    cand = (al <= 24) | (whitish & (al < T))
    lab, n = ndimage.label(cand)
    edge = np.zeros_like(cand); edge[0] = edge[-1] = True; edge[:, 0] = edge[:, -1] = True
    seeds = np.unique(lab[(edge | (al <= 24)) & cand]); seeds = seeds[seeds > 0]
    bg = np.isin(lab, seeds)
    if pockets:
        pw = (mn > 215) & (mx - mn < 28) & ~bg
        pl, pn = ndimage.label(pw)
        if pn:
            sz = ndimage.sum(pw, pl, range(1, pn + 1))
            big = np.concatenate([[False], sz > pockets])
            pk = big[pl]
            bg |= ndimage.binary_dilation(pk, iterations=1) & whitish
    ring = ndimage.binary_dilation(bg, iterations=2) & ~bg & whitish & (al < 252)
    al[bg | ring] = 0
    a[:, :, 3] = al
    return Image.fromarray(a.astype(np.uint8))

def glow(im, T=200, lum=140):
    """Poloprůhledná světlá záře u okraje (i nažloutlá): pryč, pokud souvisí s průhledným pozadím."""
    a = np.array(im).astype(np.int16); al = a[:, :, 3]; mn = a[:, :, :3].min(2)
    cand = (al <= 24) | ((al < T) & (mn > lum))
    lab, n = ndimage.label(cand)
    seeds = np.unique(lab[(al <= 24) & cand]); seeds = seeds[seeds > 0]
    al[np.isin(lab, seeds)] = 0
    a[:, :, 3] = al
    return Image.fromarray(a.astype(np.uint8))

def base_geom(im):
    """Kosočtvercový podstavec pod stromem: boční rohy (yL), střed (xc), poloosy (rx, hh), spodek (yb)."""
    m = np.array(im)[:, :, 3] > 24
    H, W = m.shape
    ys = np.where(m.any(1))[0]; y0, yb = ys[0], ys[-1]
    left = np.array([np.argmax(r) if r.any() else W for r in m]); right = np.array([W - 1 - np.argmax(r[::-1]) if r.any() else -1 for r in m])
    width = np.where(right >= left, right - left, 0).astype(float)
    ws = np.convolve(width, np.ones(9) / 9, mode='same')
    y = yb - 12
    while y > y0 + 12 and not (ws[y] - ws[y + 8] < 6 and ws[y] > 60): y -= 1
    ylow = y
    while y > y0 and ws[y - 1] > ws[ylow] - 6: y -= 1
    yL = (y + ylow) // 2
    xL, xR = left[yL], right[yL]
    return dict(yL=int(yL), yb=int(yb), xc=(xL + xR) / 2, rx=(xR - xL) / 2, hh=float(yb - ylow), W=W, H=H)

def soft_base(im, g, d0=0.30, d1=0.80):
    """Podstavec rozplynout do měkkého trsu trávy kolem kmene (bez hran a boků podstavce)."""
    a = np.array(im).astype(np.float32); al = a[:, :, 3]; m = al > 24
    H, W = m.shape
    xc, yL, rx, hh = g['xc'], g['yL'], g['rx'], g['hh']
    yB = yL - hh
    r = m[max(0, int(yB) - 6)]; xi = int(round(xc)); a0 = b0 = xi
    if r[xi]:
        while a0 > 0 and r[a0 - 1]: a0 -= 1
        while b0 < W - 1 and r[b0 + 1]: b0 += 1
    band = min(rx * 0.32, max(xi - a0, b0 - xi) + rx * 0.04)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dx = np.maximum(0, np.abs(xx - xc) - band * 0.5) / rx
    dy = (yy - yL) / hh
    back = yy < yL
    d = np.sqrt(dx ** 2 + np.where(back & (np.abs(xx - xc) <= band), 0, dy) ** 2)
    f = np.clip((d1 - d) / (d1 - d0), 0, 1)
    above = yy < yL - hh * (1 - np.abs(xx - xc) / rx)      # nad zadními hranami kosočtverce = koruna
    f[above] = 1
    a[:, :, 3] = al * f
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))

def soft_bases(parts):
    """Stejná geometrie podstavců pro celou trojici (vzdálenost spodku od bočních rohů a velikost podle mediánu)."""
    gs = [base_geom(p) for p in parts]
    rx = float(np.median([g['rx'] for g in gs])); hh = float(np.median([g['hh'] for g in gs])); dyL = float(np.median([g['yb'] - g['yL'] for g in gs]))
    out = []
    for p, g in zip(parts, gs):
        if abs(g['rx'] - rx) > rx * 0.08 or abs((g['yb'] - g['yL']) - dyL) > hh * 0.15:
            m = np.array(p)[:, :, 3] > 24; xs = np.where(m[g['yb'] - 3])[0]
            g = dict(g, rx=rx, hh=hh, yL=g['yb'] - dyL, xc=(xs[0] + xs[-1]) / 2 if len(xs) else g['xc'])
        else:
            g = dict(g, hh=min(max(g['hh'], rx * 0.5), rx * 0.7))
        out.append(soft_base(p, g))
    return out, gs

def save(im, kind, name):
    os.makedirs(os.path.join(OUT, kind), exist_ok=True)
    im.save(os.path.join(OUT, kind, name + '.webp'), 'WEBP', quality=84, method=4)
    made.setdefault(kind, []).append(name)

def fit_w(im, w):
    return im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)

def canvas(im, w, h):
    """Budova s podstavcem na plátno šablony (2×: šířka (w+h)*96, výška 1,25×, přední roh 24 px nad spodkem)."""
    W = (w + h) * 96; H = round(W * 1.25); bottom = H - 24
    im = trim(im)
    s = min(W * 0.98 / im.width, (bottom - 2) / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    c.alpha_composite(im, (W // 2 - im.width // 2, bottom - im.height + round(im.height * 0.012)))
    return c

def parts(im, n):
    """Objekty vedle sebe v jedné řadě (3 stromy, 3 fáze plodiny): řez v nejprázdnějším sloupci poblíž třetin."""
    a = np.array(im); col = (a[:, :, 3] > 24).sum(0).astype(float)
    xs = np.where(col > 0)[0]; x0, x1 = xs[0], xs[-1] + 1; span = x1 - x0
    cuts = [x0]
    for k in range(1, n):
        lo = int(x0 + span * (k / n - 0.15)); hi = int(x0 + span * (k / n + 0.15))
        w = col[lo:hi]; best = w.min()
        zs = np.where(w <= best)[0]
        runs = np.split(zs, np.where(np.diff(zs) > 1)[0] + 1)      # nejdelší úsek s minimem, řez uprostřed
        r = max(runs, key=len)
        cuts.append(lo + int(r[len(r) // 2]))
    cuts.append(x1)
    return [trim(im.crop((cuts[k], 0, cuts[k + 1], im.height))) for k in range(n)]

def grid(im, cols, rows):
    """Arch v mřížce: každý ostrůvek patří do buňky podle svého středu."""
    a = np.array(im); m = a[:, :, 3] > 24
    lab, n = ndimage.label(m)
    H, W = m.shape; cw, ch = W / cols, H / rows
    cells = [np.zeros_like(m) for _ in range(cols * rows)]
    sz = ndimage.sum(m, lab, range(1, n + 1))
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        if sz[k - 1] < 60: continue
        cy = (sl[0].start + sl[0].stop) / 2; cx = (sl[1].start + sl[1].stop) / 2
        idx = min(rows - 1, int(cy // ch)) * cols + min(cols - 1, int(cx // cw))
        cells[idx] |= lab == k
    out = []
    for c in cells:
        b = a.copy(); b[~c, 3] = 0
        out.append(trim(Image.fromarray(b)) if c.any() else None)
    return out

SIZES = json.load(open(os.path.join(os.path.dirname(__file__), 'building_sizes.json')))

# ---------- budovy, ohrady, ozdoby (vlastní podstavec) ----------
BUILD = ['statek_%d' % i for i in range(1, 11)] + ['sklad_%d' % i for i in range(1, 11)] + [
    'semenarna', 'pekarna', 'krmivarna', 'mlyn', 'skolka', 'dzusarna', 'mlekarna', 'konzervarna', 'olejna', 'marmeladarna',
    'cukrovar', 'uzenarstvi', 'textilka', 'kurnik', 'kravin', 'prasecak', 'ovcin', 'stodola', 'rybnik', 'vcelin', 'rybarna',
    'medarna', 'prodejna', 'stanek', 'trziste', 'domek_a', 'domek_b', 'domek_c', 'chatrc', 'chata', 'dum', 'nastenka',
    'ker', 'kvetiny', 'lavicka', 'jablon', 'fontana']
# Podstavce ze Scenario jsou kreslené strměji (šířka : výška ≈ 1,65 : 1) než mřížka hry (2 : 1) – budovu proto svisle
# stlačíme podle jejího podstavce, aby boční rohy seděly na rozích políček.
for name in BUILD:
    kind = name.split('_')[0] if name.startswith(('statek_', 'sklad_')) else name
    w, h = (2, 2) if name.startswith('domek_') else SIZES[kind][:2]
    im = trim(glow(dehaze(load('b/' + name), T=230)))
    g = base_geom(im); r = g['rx'] / max(1, g['hh'])
    if not 1.5 <= r <= 1.95: r = 1.67      # podstavec nejde změřit (zakrytý) – běžný poměr
    im = im.resize((im.width, round(im.height * r / 2)), Image.LANCZOS)
    save(canvas(im, w, h), 'b', name)

# ---------- dlaždice země: čtvercová bezešvá textura → kosočtverec 192×96 ----------
def seamless(tex, ref=None):
    """Textura bez švů: prolnutí s kopií posunutou o půl (střed původní, okraje z posunuté) + barva podle vzoru."""
    a = np.array(tex.convert('RGB').resize((512, 512), Image.LANCZOS)).astype(np.float32)
    if ref is not None:   # varianta b ve stejném tónu jako a (průměr a rozptyl po kanálech)
        r = np.array(ref.convert('RGB').resize((512, 512), Image.LANCZOS)).astype(np.float32)
        a = (a - a.mean((0, 1))) / (a.std((0, 1)) + 1e-3) * r.std((0, 1)) + r.mean((0, 1))
    rolled = np.roll(a, (256, 256), (0, 1))
    u = np.abs(np.linspace(-1, 1, 512))
    m = np.clip((1 - np.maximum(u[:, None], u[None, :])) / 0.35, 0, 1)[..., None]
    return Image.fromarray((a * m + rolled * (1 - m)).clip(0, 255).astype(np.uint8))
def iso_tile(tex, W=192):
    t = tex.convert('RGB').resize((512, 512), Image.LANCZOS)
    big = Image.new('RGB', (1536, 1536))
    for y in range(3):
        for x in range(3): big.paste(t, (x * 512, y * 512))
    # otočit o 45° a stlačit na polovinu výšky: jeden čtverec textury = jedno políčko
    r = big.rotate(45, resample=Image.BICUBIC)
    d = 512 * math.sqrt(2); cx = cy = 768
    r = r.crop((round(cx - d / 2), round(cy - d / 2), round(cx + d / 2), round(cy + d / 2)))
    r = r.resize((W * 2, W), Image.LANCZOS).resize((W, W // 2), Image.LANCZOS)
    mask = Image.new('L', (W * 4, W * 2), 0)
    ImageDraw.Draw(mask).polygon([(W * 2, 0), (W * 4, W), (W * 2, W * 2), (0, W)], fill=255)
    mask = mask.resize((W, W // 2), Image.LANCZOS)
    out = r.convert('RGBA'); out.putalpha(mask)
    return out
# trávník a louka: varianta b ve stejném tónu jako a; cesta: obě varianty z textury a (v b vedly koleje napříč cestou)
for name in ['trava_a', 'trava_b', 'louka_a', 'louka_b', 'cesta_a', 'cesta_b', 'dlazba', 'pole', 'pole_osete']:
    src = 'cesta_a' if name == 'cesta_b' else name
    ref = load('tex/' + name[:-2] + '_a') if name in ('trava_b', 'louka_b') else None
    tex = seamless(load('tex/' + src), ref)
    if name == 'cesta_b': tex = tex.transpose(Image.FLIP_LEFT_RIGHT)
    save(iso_tile(tex), 't', name)
save(fit_w(trim(clean(load('t/plot_se'))), 120), 't', 'plot_se')
save(fit_w(trim(clean(load('t/plot_ne'))), 120), 't', 'plot_ne')
save(fit_w(trim(soft_bases([trim(glow(dehaze(load('t/cedule'))))])[0][0]), 128), 't', 'cedule')   # podstavec → trs květin u kůlu

# ---------- plodiny: 3 fáze z jednoho obrázku, plátno 173×173, rostliny stojí na y 158 ----------
CROPS = ['wheat', 'redkvicka', 'salat', 'corn', 'rajce', 'carrot', 'okurka', 'potato', 'jahody', 'cibule',
         'soy', 'cesnek', 'repka', 'paprika', 'sun', 'zeli', 'beet', 'hrach', 'meloun', 'dyne']
# střed záhonu je u všech fází na stejném místě (menší klíčky nestojí na předním okraji políčka)
for crop in CROPS:
    ims = parts(glow(dehaze(load('c3/' + crop), pockets=400)), 3)
    s = min(150 / ims[2].width, 150 / max(x.height for x in ims))
    gc = 160 - ims[2].width * s * 0.3
    for st, im in enumerate(ims):
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        c = Image.new('RGBA', (173, 173), (0, 0, 0, 0))
        c.alpha_composite(im, (86 - im.width // 2, round(min(166, gc + im.width * 0.3)) - im.height))
        save(c, 'c', f'{crop}_{st}')

# ---------- stromy a keře do sadu i do lesa ----------
# Plátno 192×256, pata kmene (střed podstavce) na x 96, y 210 = střed políčka; podstavec se rozplyne do trsu trávy.
TREES = ['jablon', 'hrusen', 'svestka', 'tresen', 'visen', 'merunka', 'broskev', 'orech', 'maliny', 'rybiz', 'angrest', 'boruvky', 'reva']
BUSH = dict(maliny=0.82, rybiz=0.82, angrest=0.82, boruvky=0.82, reva=0.94)
TW_, TH_, FOOT = 192, 256, 210
def tree_set(sheet, names, kind, k=1.0):
    ims, gs = soft_bases(parts(glow(dehaze(load(sheet), pockets=400)), 3))
    fit = []
    for im, g in zip(ims, gs):
        bb = im.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
        fit.append(min((FOOT - 4) / max(1, g['yL'] - bb[1]), 184 / max(1, 2 * max(g['xc'] - bb[0], bb[2] - g['xc']))))
    s = k * min(fit)
    for im, g, name in zip(ims, gs, names):
        im2 = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        c = Image.new('RGBA', (TW_, TH_), (0, 0, 0, 0))
        c.alpha_composite(im2, (round(96 - g['xc'] * s), round(FOOT - g['yL'] * s)))
        save(c, kind, name)
for t in TREES:
    tree_set('s3/' + t, [f'{t}_grow', f'{t}_ready', f'{t}_dead'], 's', BUSH.get(t, 1.0))
tree_set('les3/les', ['les_a', 'les_b', 'les_c'], 's')

# ---------- zvířata, stroje, lidé (obrázek jede doleva dolů = _l, zrcadlo = _r) ----------
for name, w in [('slepice', 52), ('krava', 140), ('prase', 104), ('ovce', 104)]:
    save(fit_w(trim(clean(load('z/' + name))), w), 'z', name)
for m in ['brazda60', 'brazda120', 'klas4', 'klas8', 'pluh', 'secka', 'lis']:
    im = fit_w(trim(clean(load('m/' + m))), 144 if m.startswith(('brazda', 'klas')) else 112)
    save(im, 'm', m + '_l'); save(im.transpose(Image.FLIP_LEFT_RIGHT), 'm', m + '_r')
for who in ['farmar', 'pomocnik']:
    im = trim(clean(load('p/' + who)))
    im = im.resize((round(im.width * 68 / im.height), 68), Image.LANCZOS)
    save(im, 'p', who + '_l'); save(im.transpose(Image.FLIP_LEFT_RIGHT), 'p', who + '_r')

# ---------- ikony předmětů 128×128 ----------
ICONS = {
    1: 'wheat corn soy repka sun hrach redkvicka salat carrot rajce potato okurka',
    2: 'cibule cesnek paprika beet zeli dyne jahody meloun jablko hruska svestka tresne',
    3: 'merunka visne broskev orech maliny rybiz angrest boruvky hrozny krmivo_slepice krmivo_kravy krmivo_prasata',
    4: 'krmivo_ovce vejce mleko maso vlna chleb kolac tresnovy_kolac muffiny buchty orechovy_kolac mouka',
    5: 'smetana syr maslo olej sl_olej cukr salat_mix okurky kecup lecho kysane_zeli kompot',
    6: 'hrachovka dynovka broskve_sklo dzus_mrkev dzus_jablko dzus_hruska dzus_visne most napoj povidla dzem_malina dzem_jahoda',
    7: 'marmelada dzem_merunka klobasa uzene klubko svetr deka slama seminkovy_chleb prazena_seminka dynovy_olej navnada',
    8: 'plast med svicka medovnik pernik rybi_polevka smazeny_kapr peceny_lin rybi_prsty uzeny_pstruh candat_maslo stika_cibule',
    9: 'sumcovy_gulas plotice kapr lin okoun pstruh candat stika sumec karas cejn amur',
    10: 'uhor bolen jeseter rybi_karbanatky amur_gril bolen_bylinky udice udice2 kolecko motyka',
}
def icon(im, fill=0.92):
    im = trim(im)
    s = 128 * fill / max(im.width, im.height)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    c = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    c.alpha_composite(im, ((128 - im.width) // 2, (128 - im.height) // 2))
    return c
icons = {}
for k, names in ICONS.items():
    cells = grid(glow(dehaze(load(f'ikony/{k}'))), 4, 3)
    for name, im in zip(names.split(), cells):
        if im is None: raise SystemExit(f'ikony {k}: chybí {name}')
        icons[name] = icon(im); save(icons[name], 'i', name)
# ikony budov, zvířat a strojů z herní grafiky (aby UI vypadalo stejně jako mapa)
P = lambda k, n: os.path.join(OUT, k, n + '.webp')
for key, path in [('house', P('b', 'statek_1')), ('barn', P('b', 'sklad_1')), ('garage', P('b', 'stodola')), ('shop', P('b', 'prodejna')),
                  ('stall', P('b', 'stanek')), ('market', P('b', 'trziste')), ('pond', P('b', 'rybnik')), ('hive', P('b', 'vcelin')),
                  ('tree', P('s', 'jablon_ready')), ('blossom', P('b', 'jablon')), ('bush', P('b', 'ker')), ('flowers', P('b', 'kvetiny')),
                  ('bench', P('b', 'lavicka')), ('fountain', P('b', 'fontana')), ('hen', P('z', 'slepice')), ('cow', P('z', 'krava')),
                  ('pig', P('z', 'prase')), ('sheep', P('z', 'ovce')), ('tractor', P('m', 'brazda60_l')), ('combine', P('m', 'klas4_l')),
                  ('pluh', P('m', 'pluh_l')), ('secka', P('m', 'secka_l')), ('lis', P('m', 'lis_l')), ('farmer', P('p', 'farmar_l')),
                  ('helper', P('p', 'pomocnik_l')), ('plot', P('t', 'pole'))]:
    save(icon(Image.open(path).convert('RGBA'), 0.96), 'i', key)
# semena (pytlík s plodinou) a sazenice (květináč s ovocem)
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

# ---------- portréty pracovníků (zatím mimo hru – do složky art) ----------
if ART:
    os.makedirs(ART, exist_ok=True)
    k = 0
    for sheet_no in (1, 2):
        for im in grid(glow(dehaze(load(f'portrety/{sheet_no}'))), 3, 2):
            k += 1
            if im is not None: icon(im, 0.96).resize((256, 256), Image.LANCZOS).save(os.path.join(ART, f'portret_{k:02d}.webp'), 'WEBP', quality=88)

# ---------- seznam pro hru ----------
js = '// Vygenerováno nástrojem tools/assets.py / tools/fantasy.py – seznam grafiky ve hře (public/img/<druh>/<jméno>.webp).\n'
allf = {k: sorted(f[:-5] for f in os.listdir(os.path.join(OUT, k)) if f.endswith('.webp')) for k in sorted(os.listdir(OUT)) if os.path.isdir(os.path.join(OUT, k))}
js += 'export const ASSETS = ' + json.dumps(allf, ensure_ascii=False) + ';\n'
open(os.path.join(ROOT, 'public', 'js', 'assets.js'), 'w', encoding='utf8').write(js)
tot = sum(os.path.getsize(os.path.join(OUT, k, n + '.webp')) for k, v in allf.items() for n in v)
print({k: len(v) for k, v in made.items()}, 'celkem ve hře', tot // 1024, 'kB')
