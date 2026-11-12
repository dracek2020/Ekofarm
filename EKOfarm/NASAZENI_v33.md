# EKOfarm v33 – nasazení (rozhraní „lesní pohádková kniha“)

Mění se jen vzhled rozhraní. Pravidla, ekonomika, databáze ani uložené hry se nemění (`RULES_VERSION` zůstává 19). `wrangler.toml` v zipu není.

Zip obsahuje jen soubory změněné od v32:
- nové složky `public/img/u` (rámy, tlačítka, ozdoby, znak, úvodní obrázek) a `public/fonts` (písmo Grandstander + licence OFL);
- 30 nových malovaných ikon v `public/img/i` a nová ikona aplikace (`icon-192/512.png`);
- `public/css/style.css` (nový vzhled je oddíl „v33“ na konci), `public/index.html`, `public/sw.js`, `public/js/*.js` (číslo verze 33, novinky, seznam obrázků);
- `tools/ui.py`, `tools/imgtools.py`, `tools/fantasy.py`, `tools/build-artifact.mjs`, `art/PROMPTY_scenario.json`, `.gitignore`;
- dokumenty.

**Nasazuješ víc verzí najednou?** Rozbal po sobě zipy v28 až v33 a nasaď jednou.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v33.zip && cd EKOfarm && rm -f NASAZENI_v32.md
```
```bash
npm test
```
Musí skončit `pass 98` a `fail 0`.
```bash
npx wrangler deploy
```

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v33" && git push && cd EKOfarm
```

## Co je nového
- **Okna:** dřevěný rám s mechem, břečťanem a kvítím, pergamen uvnitř. Nadpis je na zelené stužce, ikona okna na kolečku kmene a zavírá se muchomůrkou.
- **Tlačítka:**
  - hlavní jsou mechově zelená;
  - vedlejší ze světlého dřeva;
  - varovná muchomůrkově červená.
- **Záložky** jsou dřevěné dlaždice, vybraná je medová.
- **Horní lišta:** ukazatele z březového dřeva a úroveň ve věnečku. Zkušenosti ukazuje čtyřlístek a zelený proužek.
- **Spodní lišta:** prkno s mechem a muchomůrkami, vybrané tlačítko je zelené.
- **Ikony:** 30 nově malovaných ikon místo kreslených (mince, novinky, deník, tým, počasí, úkoly, nastavení…).
- **Písmo:** nadpisy, tlačítka a čísla mají písmo Grandstander. Ostatní text zůstává systémovým písmem kvůli čitelnosti.
- **Úvodní obrazovka a načítání:** lesní mýtina se statkem a znak farmy. Nová ikona aplikace je ze znaku.
- **Nová úroveň:** věneček místo hvězdy a k tomu motýlek.
- **Zprávy a lišta stavění:** tmavě zelené.

## Co jsem ověřil a co ne
- Testy: 98 z 98 (pravidla se neměnila).
- V prohlížeči:
  - telefon (iPhone 13 a malý iPhone SE) i široké okno, testovací verze i lokální server;
  - přihlášení, načítání, nová farma s lištou stavění;
  - okna Stavět, Obchod, Úkoly, Menu, Tým, Deník, Novinky, Sklad, Statek, Pekárna;
  - okno nové úrovně.
- Bez chyb v konzoli a bez chybějících souborů. Písmo se načetlo, česká diakritika je v pořádku.
- Nezkoušel jsem skutečný telefon a nasazený server.
- Hra je zhruba o 600 kB větší: rozhraní asi 510 kB a písmo 76 kB. Načte se jednou a pak je v mezipaměti.
