# EKOfarm v39 – ilustrace dílů příběhu a vzácné ozdoby ze Scenario do hry.
#   python3 tools/v39art.py <složka s obrázky ze Scenario>
# Vstup: e__<díl>.webp (ilustrace dílů k1a…k5d), b__<ozdoba>.webp (studna, dedova_jablon, mlynek, lipa, venec, strasak, vozik, holubnik, vetrnik, altan).
# Ozdoby převede tools/budovy.py (velikost z building_sizes.json), ilustrace tools/v36art.py (640×427), ikony ozdob vzniknou z obrázku ve hře.
import os, sys, subprocess
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from imgtools import icon

SRC = sys.argv[1]
OUT = os.path.join(HERE, '..', 'public', 'img')
DECO = ['studna', 'dedova_jablon', 'mlynek', 'lipa', 'venec', 'strasak', 'vozik', 'holubnik', 'vetrnik', 'altan']
if any(f.startswith('b__') for f in os.listdir(SRC)):
    subprocess.run([sys.executable, os.path.join(HERE, 'budovy.py'), SRC], check=True)
for d in DECO:   # ikona ozdoby (texty, odměny) = zmenšený obrázek ve hře
    p = os.path.join(OUT, 'b', d + '.webp')
    if os.path.exists(p):
        icon(Image.open(p).convert('RGBA'), 0.96).save(os.path.join(OUT, 'i', d + '.webp'), 'WEBP', quality=84, method=4)
subprocess.run([sys.executable, os.path.join(HERE, 'v36art.py'), SRC], check=True)   # ilustrace e__ a znovu assets.js
