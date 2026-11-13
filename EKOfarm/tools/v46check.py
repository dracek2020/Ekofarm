# EKOfarm v46 – kontrola nové grafiky (test D10): skutečná průhlednost, žádný černý/bílý rámeček, správné rozměry.
#   python3 tools/v46check.py  → JSON na stdout
import os, json, sys
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'img')
ICONS = ('farmarsky_sendvic sojova_mouka sojovy_chleb zeleninova_pomazanka medove_orechy hrachova_pomazanka bramboraky zelenina_v_oleji sojovy_olej '
         'visnovy_kolac visnova_marmelada orechovy_krem dynove_placicky otruby pokrutiny repne_rizky ovocne_vylisky ovesne_vlocky ovesne_susenky '
         'tresnovy_ovesny_kolac lneny_olej lnena_prize lnena_tkanina lneny_ubrus koprove_okurky bylinkova_polevka kapr_petrzel bolen_kopr rybi_talir '
         'slavnostni_dort hostina mistr_kuchyne oves len petrzel kopr s_oves s_len s_petrzel s_kopr').split()
files = [('i', n, (128, 128)) for n in ICONS] + [('c', f'{c}_{s}', (120, 150)) for c in ('oves', 'len', 'petrzel', 'kopr') for s in range(3)]
bad = []
for kind, name, size in files:
    p = os.path.join(ROOT, kind, name + '.webp')
    if not os.path.exists(p): bad.append(f'{kind}/{name}: chybí'); continue
    im = Image.open(p)
    if im.mode != 'RGBA': bad.append(f'{kind}/{name}: bez alfa kanálu ({im.mode})'); continue
    if im.size != size: bad.append(f'{kind}/{name}: rozměr {im.size}')
    a = im.getchannel('A'); w, h = im.size; px = a.load()
    border = [px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)] + [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)]
    if max(border) > 40 and not name.startswith('s_'): bad.append(f'{kind}/{name}: neprůhledný okraj')
    clear = sum(1 for v in a.getdata() if v == 0) / (w * h)
    if clear < 0.15: bad.append(f'{kind}/{name}: skoro bez průhlednosti ({clear:.0%})')
    rgb = im.convert('RGB').getdata(); al = list(a.getdata())
    dark = sum(1 for (r, g, b), v in zip(rgb, al) if v > 200 and r + g + b < 40) / max(1, sum(1 for v in al if v > 200))
    if dark > 0.08: bad.append(f'{kind}/{name}: černé obrysy {dark:.0%}')
print(json.dumps({'checked': len(files), 'bad': bad}, ensure_ascii=False))
sys.exit(1 if bad else 0)
