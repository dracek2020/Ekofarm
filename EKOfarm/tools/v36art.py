# EKOfarm v36 – grafika ze Scenario do hry: rostliny po jedné, nové stroje, udice, pes, ilustrace událostí.
#   python3 tools/v36art.py <složka s obrázky ze Scenario>
# Vstup (klíč s / nahrazeným __): c1__<plodina>.webp (3 fáze jedné rostliny vedle sebe), m__<stroj>.webp (jede doleva dolů),
#   ikony__rod.webp (arch 4×3: 10 udic, pes, rybářský deník), p__pes.webp, e__<událost>.webp.
#   Rybníky (b__rybnik2..4) převádí tools/budovy.py.
# Výstup: public/img/c/<plodina>_0..2 (jedna rostlina na plátně 120×150, spodek hrudky dole uprostřed; všechny tři fáze
#   ve stejném měřítku), public/img/m/<stroj>_l/_r, public/img/i (ikony strojů m_<id>, udice, pes, deník),
#   public/img/p/pes_l/_r, public/img/e/<událost> (640×427) a znovu public/js/assets.js.
import os, sys, json
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from imgtools import clean, trim, dehaze, glow, dehalo, parts, grid, icon, fit_w

SRC = sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'public', 'img')
made = {}

def load(key):
    p = os.path.join(SRC, key.replace('/', '__') + '.webp')
    return Image.open(p).convert('RGBA') if os.path.exists(p) else None

def save(im, kind, name, q=84):
    os.makedirs(os.path.join(OUT, kind), exist_ok=True)
    im.save(os.path.join(OUT, kind, name + '.webp'), 'WEBP', quality=q, method=4)
    made.setdefault(kind, []).append(name)

# ---------- rostliny: jedna rostlina s hrudkou hlíny, 3 fáze ve stejném měřítku ----------
CROPS = ['wheat', 'corn', 'soy', 'repka', 'sun', 'hrach', 'redkvicka', 'salat', 'carrot', 'rajce', 'potato', 'okurka',
         'cibule', 'cesnek', 'paprika', 'beet', 'zeli', 'dyne', 'jahody', 'meloun']
CW, CH = 120, 150
for crop in CROPS:
    sheet = load('c1/' + crop)
    if sheet is None: continue
    ims = [trim(x) for x in parts(dehalo(glow(dehaze(sheet, T=230))), 3)]
    s = min((CW - 4) / max(x.width for x in ims), (CH - 4) / ims[2].height)
    for st, im in enumerate(ims):
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        c = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
        c.alpha_composite(im, (CW // 2 - im.width // 2, CH - 2 - im.height))
        save(c, 'c', f'{crop}_{st}')

# ---------- stroje: větší řada = o kousek větší obrázek ----------
TIER = {}
for line in [['brazda60', 'brazda80', 'brazda120', 'hrouda150', 'hrouda180', 'orba220', 'orba260', 'titan300', 'titan360', 'obr450'],
             ['klas4', 'klas6', 'klas8', 'snop10', 'snop12', 'zatva15', 'zatva18', 'sypka22', 'sypka26', 'zklas30'],
             ['secka', 'secka_zrnko', 'secka_radek', 'secka_presna', 'secka_hvezda'],
             ['pluh', 'pluh2', 'pluh3', 'pluh_otoc', 'pluh_velky'],
             ['lis', 'lis_snopek', 'lis_kostka', 'lis_valec', 'lis_velky']]:
    for i, m in enumerate(line): TIER[m] = i
VEHICLE = lambda m: m.startswith(('brazda', 'hrouda', 'orba', 'titan', 'obr', 'klas', 'snop', 'zatva', 'sypka', 'zklas'))
for m in TIER:
    src = load('m/' + m + 'b')                            # m__brazda80b = opravená verze (bez přívěsu)
    if src is None: src = load('m/' + m)
    if src is None: continue
    w = round((144 if VEHICLE(m) else 112) * (1 + 0.03 * TIER[m]))
    im = fit_w(trim(clean(dehalo(src))), w)
    save(im, 'm', m + '_l'); save(im.transpose(Image.FLIP_LEFT_RIGHT), 'm', m + '_r')
# ikony strojů (i staré stroje z v32) z obrázku ve hře
for m in TIER:
    p = os.path.join(OUT, 'm', m + '_l.webp')
    if os.path.exists(p): save(icon(Image.open(p).convert('RGBA'), 0.96), 'i', 'm_' + m)

# ---------- udice, pes, deník (arch 4×3) ----------
sheet = load('ikony/rod')
if sheet is not None:
    names = 'udice udice_bambus udice_jasan udice_sklo udice2 udice_tele prut_kapr prut_mistr prut_stribro prut_zlato pes denik_ryb'.split()
    for name, im in zip(names, grid(dehalo(glow(dehaze(sheet, T=200))), 4, 3)):
        if im is None: raise SystemExit('ikony rod: chybí ' + name)
        save(icon(im), 'i', name)

# ---------- pes (chodí s farmářem; obrázek jde doleva dolů) ----------
dog = load('p/pes')
if dog is not None:
    im = trim(clean(dehalo(dog)))
    im = im.resize((round(im.width * 40 / im.height), 40), Image.LANCZOS)
    save(im, 'p', 'pes_l'); save(im.transpose(Image.FLIP_LEFT_RIGHT), 'p', 'pes_r')

# ---------- ilustrace událostí 640×427 ----------
for f in sorted(os.listdir(SRC)):
    if f.startswith('e__') and f.endswith('.webp'):
        im = Image.open(os.path.join(SRC, f)).convert('RGB')
        W, H = im.size; t = 640 / 427
        if W / H > t: nw = round(H * t); im = im.crop(((W - nw) // 2, 0, (W - nw) // 2 + nw, H))
        else: nh = round(W / t); im = im.crop((0, (H - nh) // 2, W, (H - nh) // 2 + nh))
        save(im.resize((640, 427), Image.LANCZOS), 'e', f[3:-5], q=78)

js = '// Vygenerováno nástrojem tools/assets.py / tools/fantasy.py / tools/ui.py – seznam grafiky ve hře (public/img/<druh>/<jméno>.webp).\n'
allf = {k: sorted(f[:-5] for f in os.listdir(os.path.join(OUT, k)) if f.endswith('.webp')) for k in sorted(os.listdir(OUT)) if os.path.isdir(os.path.join(OUT, k)) and k != 'u'}
js += 'export const ASSETS = ' + json.dumps(allf, ensure_ascii=False) + ';\n'
open(os.path.join(ROOT, 'public', 'js', 'assets.js'), 'w', encoding='utf8').write(js)
for k, v in made.items(): print(k, len(v))
