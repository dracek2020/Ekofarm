# EKOfarm v46 – nasazení (rozšíření: nové recepty, plán výroby, vedlejší produkty, oves/len/petržel/kopr, mistrovské recepty)

Navazuje na **v45**. Zip obsahuje jen soubory změněné od v45: kód, testy, nástroje, dokumenty a 52 nových obrázků. `wrangler.toml` v zipu není.

Nic se neresetuje a migrace databáze **není potřeba** (nová pole farmy jsou volitelná). Původní obrázky se nemění.

## Postup v Codespace
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`

**1. Rozbalit a otestovat**
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v46.zip && cd EKOfarm && rm -f NASAZENI_v45.md
```
```bash
npm test
```
Musí skončit `pass 221` a `fail 0`. (Test E12 pouští zátěž týmu 30 lidí – trvá pár sekund.)

**2. Nasadit**
```bash
npx wrangler deploy
```

### Aktualizace u všech hráčů
- Server po nasazení přijímá jen aplikaci v46.
- Kdo má otevřenou starší verzi (od v38), tomu se hra **sama načte znovu**.

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v46: rozšíření ekonomiky" && git push && cd EKOfarm
```

## Co je nového
| Kde | Novinka | Statek / Vaření |
|---|---|---|
| Pekárna | Farmářský sendvič · Sójový chléb · Višňový koláč · Bramboráky · Dýňové placičky · Ovesné sušenky · Třešňový ovesný koláč | 2/1 · 4/6 · 4/8 · 7/7 · 7/8 · 4/7 · 4/9 |
| Mlýn | Sójová mouka · Ovesné vločky | 3/2 · 3/2 |
| Mlékárna | Zeleninová pomazánka | 5/3 |
| Medárna | Medové ořechy | 6/3 |
| Konzervárna | Hrachová pomazánka · Zelenina v oleji · Koprové okurky | 6/5 · 7/7 · 6/6 |
| Olejna | Sójový olej · Lněný olej | 7/4 · 7/5 |
| Marmeládárna | Višňová marmeláda | 8/6 |
| Cukrárna | Ořechový krém · **Slavnostní ovocný dort** (mistrovský) | 8/8 · 8/30 |
| Textilka | Lněná příze · Lněná tkanina · Lněný ubrus | 10/6 · 10/9 · 10/14 |
| Rybárna | Bylinková rybí polévka · Kapr s petrželí · Bolen s koprem · **Mistrovský rybí talíř** | 6/8 · 6/8 · 6/15 · 7/25 |
| Uzenářství | **Farmářská hostina** (mistrovská) | 8/40 |
| Krmivárna | Ovesná krmná směs (2 krmiva pro slepice) · směsi s otrubami, pokrutinami, řepnými řízky a výlisky | 3/1 · 3/1, 7/4, 8/5, 7/7 |
| Pole | **Oves** (St3, kombajn) · **Petržel**, **Kopr** (St6, traktor) · **Len** (St7, kombajn) | osivo v Semenárně |

- **Plán výroby** (Řídicí centrum → Plán výroby, nebo tlačítko ve výrobně): výrobek + počet → celý řetězec až na suroviny, co je ve skladu, co chybí, odhad času. Potvrzení nastaví cílové zásoby výroben.
- **Vedlejší produkty**: otruby (z mouky), pokrutiny (z olejů), řepné řízky (z cukru), ovocné výlisky (z džusů) – pro levnější krmné směsi.
- **Podestýlka ze slámy**: jednorázové dobrovolné vylepšení ohrady (Statek 4, 10× sláma + 40 mincí, cyklus o 3 % kratší).
- **Ocenění Mistr údolní kuchyně** na Vaření 50 (jen kosmetické).
- Skladník nově neprodá zboží, které výrobny drží jako cílové zásoby.
- Dosavadní recepty, ceny, Vaření i ceny vylepšení budov se nemění.

## Kdyby bylo potřeba něco vypnout
V `public/js/eco-config.js` přepni skupinu v `ECO_FLAGS_DEFAULT` na `false` a znovu nasaď (se zvednutým `CLIENT_MIN` a `node tools/version.mjs`). Hráčům se nic nesmaže – věci z vypnuté skupiny se uloží stranou a po zapnutí se vrátí.
