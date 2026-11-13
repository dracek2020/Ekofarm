# EKOfarm v45 – ovoce: ikony 20 nových výrobků a 2 budovy (Sušárna ovoce, Cukrárna) ze Scenario do hry.
#   python3 tools/v45art.py <složka s obrázky ze Scenario>
# Vstup: ikony__ovoce1.webp (arch 4×3), ikony__ovoce2.webp (arch 4×2), b__susarna.webp, b__cukrarna.webp.
# Budovy převede tools/budovy.py (velikost z building_sizes.json), ikony jdou do public/img/i, pak znovu public/js/assets.js.
import os, sys, json, subprocess
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from imgtools import dehaze, glow, dehalo, grid, icon

SRC = sys.argv[1]
OUT = os.path.join(HERE, '..', 'public', 'img')
SHEETS = {
    'ikony__ovoce1': (4, 3, 'krizaly susene_hrusky malinovy_caj susene_svestky ovocny_caj susene_boruvky susene_merunky rozinky zavin svestkove_knedliky bublanina angrestovy_kolac'.split()),
    'ikony__ovoce2': (4, 2, 'malinovy_sirup tresnovy_dzus broskvovy_sirup ovocny_jogurt ovocny_salat jahodove_knedliky zmrzlina ovocny_dort'.split()),
}
if any(f.startswith('b__') for f in os.listdir(SRC)):
    subprocess.run([sys.executable, os.path.join(HERE, 'budovy.py'), SRC], check=True)
made = 0
for key, (cols, rows, names) in SHEETS.items():
    p = os.path.join(SRC, key + '.webp')
    if not os.path.exists(p): print('chybí', key); continue
    sheet = Image.open(p).convert('RGBA')
    for name, im in zip(names, grid(dehalo(glow(dehaze(sheet, T=200))), cols, rows)):
        if im is None: raise SystemExit(f'{key}: chybí {name}')
        icon(im).save(os.path.join(OUT, 'i', name + '.webp'), 'WEBP', quality=84, method=4); made += 1
js = '// Vygenerováno nástrojem tools/assets.py / tools/fantasy.py / tools/ui.py – seznam grafiky ve hře (public/img/<druh>/<jméno>.webp).\n'
allf = {k: sorted(f[:-5] for f in os.listdir(os.path.join(OUT, k)) if f.endswith('.webp')) for k in sorted(os.listdir(OUT)) if os.path.isdir(os.path.join(OUT, k)) and k != 'u'}
js += 'export const ASSETS = ' + json.dumps(allf, ensure_ascii=False) + ';\n'
open(os.path.join(HERE, '..', 'public', 'js', 'assets.js'), 'w', encoding='utf8').write(js)
print('ikon', made)
