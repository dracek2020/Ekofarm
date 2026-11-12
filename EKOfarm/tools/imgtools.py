# EKOfarm – společné úpravy obrázků ze Scenario (fantasy.py pro herní grafiku, ui.py pro rozhraní).
import numpy as np
from PIL import Image
from scipy import ndimage

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

def icon(im, fill=0.92):
    im = trim(im)
    s = 128 * fill / max(im.width, im.height)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    c = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    c.alpha_composite(im, ((128 - im.width) // 2, (128 - im.height) // 2))
    return c
