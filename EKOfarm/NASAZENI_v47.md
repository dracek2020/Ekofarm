# EKOfarm v47 – nasazení (nové rybaření, 8 návnad, 10 ryb, 16 rybích receptů, 19 pečiv)

Navazuje na **v46**. Zip obsahuje jen soubory změněné od v46: kód, testy, nástroje, dokumenty a 70 nových obrázků. `wrangler.toml` v zipu není.

Nic se neresetuje a migrace databáze **není potřeba** (nová pole farmy jsou volitelná). Původní obrázky, ceny a recepty se nemění. Stará „Návnada“ ve skladu zůstává – teď se jmenuje „Těsto na ryby“.

## Postup v Codespace
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`

**1. Rozbalit a otestovat**
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v47.zip && cd EKOfarm && rm -f NASAZENI_v46.md
```
```bash
npm test
```
Musí skončit `pass 245` a `fail 0`. (Test E12 pouští zátěž týmu 30 lidí – trvá pár sekund.)

**2. Nasadit**
```bash
npx wrangler deploy
```

### Aktualizace u všech hráčů
- Server po nasazení přijímá jen aplikaci v47.
- Kdo má otevřenou starší verzi (od v38), tomu se hra **sama načte znovu**.
- Kdo měl zrovna rozehraný nához ve staré verzi, tomu se zruší a ryba se vrátí do rybníku (už použitá návnada se nevrací); dalším náhozem začne nová minihra.

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v47: rybaření, návnady, ryby a pečivo" && git push && cd EKOfarm
```

## Co je nového
| Kde | Novinka | Statek / Rybaření nebo Vaření |
|---|---|---|
| Rybník | **Nová minihra**: nához, čekání na záběr, ťukáním držet šipku v zeleném poli, postup chytání a napětí vlasce. Druh a váhu ryby určuje jen server a ukáže se až po vylovení. | jako dosud (rybník + udice) |
| Rybník | **Okénko „Vyber návnadu“** před náhozem: 8 návnad s počtem kusů ze skladu, výběr nic nestojí | – |
| Návnady | Červ · Kukuřice · Těsto (dřívější Návnada) · Rohlík · Hrášek · Sýr · Masová návnada · Třpytka | St3/R1 · St3/R1 · St3/R1 · St3/R2 · St5/R4 · St5/R8 · St7/R12 · St7/R12 |
| Stánek (Zásoby) | Červ, Třpytka za mince | – |
| Krmivárna | Masová návnada (1 maso → 3) | 7 / V1 |
| Ryby | Perlín ostrobřichý · Ouklej obecná · Cejnek malý · Ježdík obecný (Rybník) · Jelec tloušť · Jelec jesen (Větší rybník) · Tolstolobik bílý (Velký rybník) · Siven americký · Síh maréna · Mník jednovousý (Jezero) | R2 · R4 · R6 · R7 · R8 · R12 · R15 · R20 · R27 · R35 |
| Rybárna | Rybí jednohubky · Perlín na česneku · Cejnek v těstíčku · Polévka z ježdíka · Tloušť na cibuli · Rybí pomazánka · Jesen se zeleninou · Pstruh na másle · Tolstolobik na zelenině · Siven na česneku · Pečená maréna · Mník na másle · **Slavnostní rybí mísa** | St6–10 / V3–40 |
| Uzenářství | Uzený tolstolobik · Uzená maréna | 8/16 · 10/28 |
| Pekárna | Rohlík · Pletýnka · Cibulová placka · Preclík · Žitný bochník · Česneková bulka · Třešňový šáteček · Makový koláček · Sýrová houska · Dýňová bulka · Hroznový koláč · Tvarohový šáteček · Malinový croissant · Ořechové sušenky · Jahodová roláda · Makový závin · Višňová kapsa · Vánočka · **Mistrovský ořechový věnec** · Rybí koláč | St1–10 / V1–30 |
| Mlýn | Žitná mouka · Mletý mák | 3/1 · 4/1 |
| Mlékárna | Tvaroh | 5/1 |
| Pole | **Žito** (St3, kombajn) · **Mák** (St4, kombajn) | osivo v Semenárně |
| Úkoly | Nahodit s návnadou · Uvařit rybích jídel | s rybníkem a udicí |

- Rybářský deník ukáže nové ryby a u každé, na co brala.
- Okno nové úrovně počká, až zavřeš výsledek rybaření.

## Kdyby bylo potřeba něco vypnout
V `public/js/eco-config.js` přepni skupinu v `ECO_FLAGS_DEFAULT` na `false` (`fishing_minigame_v2`, `fishing_baits_v2`, `fishing_fish_pack_v2`, `bakery_extra_v2`) a znovu nasaď (se zvednutým `CLIENT_MIN` a `node tools/version.mjs`). Hráčům se nic nesmaže – věci z vypnuté skupiny se uloží stranou a po zapnutí se vrátí. Vypnutá `fishing_minigame_v2` vrátí původní rybaření.
