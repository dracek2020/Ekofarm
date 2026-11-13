# EKOfarm v47 – kontrola grafiky rybaření a pečiva (test T28): soubor existuje, rozměr, skutečná průhlednost,
# žádný neprůhledný rámeček ani černé obrysy; pózy farmáře průhledné, scéna minihry neprůhledná.
#   python3 tools/v47check.py  → JSON na stdout (seznam ikon se bere přímo z tools/v47art.py, aby se nerozešel)
import os, json, sys, ast
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', 'public', 'img')
src = open(os.path.join(HERE, 'v47art.py'), encoding='utf8').read()
tree = ast.parse(src)
SHEETS = next(ast.literal_eval(n.value) for n in tree.body if isinstance(n, ast.Assign) and getattr(n.targets[0], 'id', '') == 'SHEETS')
CROPS = next(ast.literal_eval(n.value) for n in tree.body if isinstance(n, ast.Assign) and getattr(n.targets[0], 'id', '') == 'CROPS')
icons = [n for (_, _, names) in SHEETS.values() for n in names.split()]
files = [('i', n, (128, 128)) for n in icons] + [('i', 's_' + c, (128, 128)) for c in CROPS] + \
        [('c', f'{c}_{s}', (120, 150)) for c in CROPS for s in range(3)]
bad = []

def alpha_ok(kind, name, im, seed=False, trimmed=False):
    a = im.getchannel('A'); w, h = im.size; px = a.load()
    border = [px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)] + [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)]
    # ořezaná postava se okraje dotýká (boty, prut), ale nesmí mít neprůhledný rám: max. 25 % okrajových pixelů
    if trimmed:
        if sum(1 for v in border if v > 40) / len(border) > 0.25: bad.append(f'{kind}/{name}: neprůhledný rám')
    elif max(border) > 40 and not seed: bad.append(f'{kind}/{name}: neprůhledný okraj')
    clear = sum(1 for v in a.getdata() if v == 0) / (w * h)
    if clear < 0.15: bad.append(f'{kind}/{name}: skoro bez průhlednosti ({clear:.0%})')
    rgb = im.convert('RGB').getdata(); al = list(a.getdata())
    dark = sum(1 for (r, g, b), v in zip(rgb, al) if v > 200 and r + g + b < 40) / max(1, sum(1 for v in al if v > 200))
    if dark > 0.08: bad.append(f'{kind}/{name}: černé obrysy {dark:.0%}')

def load(kind, name):
    p = os.path.join(ROOT, kind, name + '.webp')
    if not os.path.exists(p): bad.append(f'{kind}/{name}: chybí'); return None
    return Image.open(p)

for kind, name, size in files:
    im = load(kind, name)
    if im is None: continue
    if im.mode != 'RGBA': bad.append(f'{kind}/{name}: bez alfa kanálu ({im.mode})'); continue
    if im.size != size: bad.append(f'{kind}/{name}: rozměr {im.size}')
    alpha_ok(kind, name, im, seed=name.startswith('s_'))
# farmář s prutem: 5 póz, stejné měřítko (výška ≤ 480), metadata špičky prutu uvnitř obrázku
meta = json.load(open(os.path.join(ROOT, 'r', 'rybar.json')))
if len(meta) != 5: bad.append(f'r/rybar.json: {len(meta)} póz místo 5')
for i in range(5):
    im = load('r', f'rybar_{i}')
    if im is None: continue
    if im.mode != 'RGBA': bad.append(f'r/rybar_{i}: bez alfa kanálu'); continue
    if im.height > 480: bad.append(f'r/rybar_{i}: výška {im.height}')
    m = meta[i] if i < len(meta) else None
    if not m or m['w'] != im.width or m['h'] != im.height or not (0 <= m['tip'][0] < im.width and 0 <= m['tip'][1] < im.height):
        bad.append(f'r/rybar_{i}: metadata nesedí s obrázkem')
    alpha_ok('r', f'rybar_{i}', im, trimmed=True)
im = load('r', 'scena')
if im is not None:
    if im.width != 900 or im.height < im.width: bad.append(f'r/scena: rozměr {im.size} (čekám 900 × výška na výšku)')
    if im.mode == 'RGBA' and min(im.getchannel('A').getdata()) < 255: bad.append('r/scena: průhledné pixely v pozadí')
print(json.dumps({'checked': len(files) + 6, 'bad': bad}, ensure_ascii=False))
sys.exit(1 if bad else 0)
