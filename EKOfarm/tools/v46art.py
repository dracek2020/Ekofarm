# EKOfarm v46 – grafika rozšíření ze Scenario do hry: 36 ikon (3 archy 4×3), 4 nové plodiny po třech fázích, osivo.
#   python3 tools/v46art.py <složka s obrázky ze Scenario>
# Vstup: ikony__eco1..3.webp (archy 4×3), c1__<plodina>.webp (3 fáze jedné rostliny vedle sebe – oves, len, petrzel, kopr).
# Výstup: public/img/i/<id>.webp (128×128), public/img/c/<plodina>_0..2.webp (120×150 jako tools/v36art.py),
#   public/img/i/s_<plodina>.webp (balíček semínek jako tools/fantasy.py) a znovu public/js/assets.js.
# Původní obrázky se nemění (jen nové soubory); zdrojové PNG/WEBP ze Scenario zůstávají v plném rozlišení mimo hru.
import os, sys, json
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from imgtools import dehaze, glow, dehalo, grid, icon, parts, trim

SRC = sys.argv[1]
OUT = os.path.join(HERE, '..', 'public', 'img')
SHEETS = {
    'ikony__eco1': 'farmarsky_sendvic sojova_mouka sojovy_chleb zeleninova_pomazanka medove_orechy hrachova_pomazanka bramboraky zelenina_v_oleji sojovy_olej visnovy_kolac visnova_marmelada orechovy_krem'.split(),
    'ikony__eco2': 'dynove_placicky otruby pokrutiny repne_rizky ovocne_vylisky ovesne_vlocky ovesne_susenky tresnovy_ovesny_kolac lneny_olej lnena_prize lnena_tkanina lneny_ubrus'.split(),
    'ikony__eco3': 'koprove_okurky bylinkova_polevka kapr_petrzel bolen_kopr rybi_talir slavnostni_dort hostina mistr_kuchyne oves len petrzel kopr'.split(),
}
CROPS = ['oves', 'len', 'petrzel', 'kopr']
HALO = {'oves'}   # oves přišel s bílou září kolem klasů – ztlumí se bělavé málo syté pixely (jinde by vzaly bílý kořen petržele)
made = []

def unwhite(im, lo=150, span=60, sat=70):
    import numpy as np
    a = np.array(im).astype(float); rgb = a[:, :, :3]; mn = rgb.min(2); mx = rgb.max(2)
    w = np.clip((mn - lo) / span, 0, 1) * np.clip(1 - (mx - mn) / sat, 0, 1)
    a[:, :, 3] *= 1 - w
    return Image.fromarray(a.astype('uint8'))

def save(im, kind, name, q=84):
    p = os.path.join(OUT, kind, name + '.webp')
    if os.path.exists(p) and name not in made and not os.environ.get('PREPSAT'):
        raise SystemExit(f'{kind}/{name} už existuje – původní grafiku nepřepisuju (PREPSAT=1 jen pro obrázky v46)')
    im.save(p, 'WEBP', quality=q, method=4)
    made.append(name)

def packet(inner):   # stejný balíček semínek jako v tools/fantasy.py
    c = Image.new('RGBA', (128, 128), (0, 0, 0, 0)); d = ImageDraw.Draw(c)
    d.rounded_rectangle([22, 18, 106, 122], 10, fill=(243, 227, 195, 255), outline=(160, 118, 63, 255), width=4)
    d.polygon([(22, 30), (36, 8), (92, 8), (106, 30)], fill=(217, 196, 160, 255), outline=(160, 118, 63, 255))
    d.line([(36, 108), (92, 108)], fill=(200, 69, 45, 255), width=5)
    c.alpha_composite(inner.resize((76, 76), Image.LANCZOS), (26, 28))
    return c

icons = {}
for key, names in SHEETS.items():
    p = os.path.join(SRC, key + '.webp')
    if not os.path.exists(p): raise SystemExit('chybí ' + key)
    sheet = Image.open(p).convert('RGBA')
    for name, im in zip(names, grid(dehalo(glow(dehaze(sheet, T=200))), 4, 3)):
        if im is None: raise SystemExit(f'{key}: chybí {name}')
        icons[name] = icon(im)
        save(icons[name], 'i', name)

# rostliny: jedna rostlina s hrudkou hlíny, 3 fáze ve stejném měřítku (jako tools/v36art.py)
CW, CH = 120, 150
for crop in CROPS:
    p = os.path.join(SRC, 'c1__' + crop + '.webp')
    if not os.path.exists(p): raise SystemExit('chybí c1__' + crop)
    src = Image.open(p).convert('RGBA')
    if crop in HALO: src = unwhite(src)
    ims = [trim(x) for x in parts(dehalo(glow(dehaze(src, T=230))), 3)]
    s = min((CW - 4) / max(x.width for x in ims), (CH - 4) / ims[2].height)
    for st, im in enumerate(ims):
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        c = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
        c.alpha_composite(im, (CW // 2 - im.width // 2, CH - 2 - im.height))
        save(c, 'c', f'{crop}_{st}')
    save(packet(icons[crop]), 'i', 's_' + crop)

js = '// Vygenerováno nástrojem tools/assets.py / tools/fantasy.py / tools/ui.py – seznam grafiky ve hře (public/img/<druh>/<jméno>.webp).\n'
allf = {k: sorted(f[:-5] for f in os.listdir(os.path.join(OUT, k)) if f.endswith('.webp')) for k in sorted(os.listdir(OUT)) if os.path.isdir(os.path.join(OUT, k)) and k != 'u'}
js += 'export const ASSETS = ' + json.dumps(allf, ensure_ascii=False) + ';\n'
open(os.path.join(HERE, '..', 'public', 'js', 'assets.js'), 'w', encoding='utf8').write(js)
print('obrázků', len(made))
