# EKOfarm v29 – nasazení (Farmářský tým: hledání, domky, pověst, zásluhy)

Databáze ani nastavení se nemění. `wrangler.toml` v zipu není. Obrázky se nemění: domky a nástěnku zatím zastupují obrázky z Městečka.

Zip obsahuje jen soubory změněné od v28, včetně dokumentů doplněných po v28. Nový je soubor `public/js/team-config.js`.

**Pozor – reset týmu:** při prvním otevření hry po nasazení všem hráčům odejdou dosavadní vesničané a farmáři. Mince se nevracejí. Co měli v rukou, se vrátí do skladu. Placený pomocník, který zrovna běží, doběhne.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v29.zip && cd EKOfarm
```
```bash
npm test
```
Musí skončit `pass 84` a `fail 0`.
```bash
npx wrangler deploy
```

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip EKOfarm/NASAZENI_v28.md
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v29" && git push && cd EKOfarm
```

## Co je nového
- **Pracovníci se hledají, nekupují:**
  - V Městečku je **Nástěnka**. Vyvěsíš inzerát s profesí a zaplatíš pohoštěním z farmy. Na začátku stačí 4 pšenice, s větším týmem to je chléb, koláč, sýr…
  - Za 20 minut (+5 minut za každého člena týmu) přijdou 2–4 uchazeči. Každý má profesi, začínající úroveň a jednu vlastnost: učenlivý, šikovný, pečlivý nebo všestranný.
  - Jednoho přijmeš, ostatní odejdou. Kdo není vybrán do 24 hodin, odejde také.
- **Domky:**
  - Chatrč za 200 mincí má 2 lůžka, Chata za 500 má 3, Dům za 1 000 má 5. Všechny mají plochu 2×2.
  - Chatrč jde přestavět na chatu (300) a chatu na dům (500).
  - Tým má tolik lidí, kolik je lůžek, nejvýš 30.
- **Pověst farmy:**
  - Roste za doručené zakázky (+3) a denní úkoly (+1). Stávající hráči dostali body za zakázky, které už doručili.
  - S lepší pověstí přijde víc a zkušenějších uchazečů a můžou viset dva inzeráty.
  - Od stupně 3 se lidé z domků v Městečku ozvou sami, bez pohoštění. Nad domkem se objeví bublina.
- **Profese a úrovně:**
  - Profese jsou Pěstitel, Chovatel, Řemeslník a Skladník. Každý pracovník má 12 úrovní v každém oboru.
  - Zkušenosti dostává za hotovou práci. Čím hodnotnější věc, tím víc. Mimo profesi dostává polovinu.
  - Úroveň zvyšuje výkon:
    - pěstitel zvládne políčko za 12 s, na úrovni 12 za 1 s;
    - řemeslník naloží do jedné dávky až 12 kusů a dávka trvá stejně dlouho;
    - chovatel dostane z jednoho krmení až 3 produkty;
    - skladník prodá na jednom trhu až 360 kusů za cenu až o 25 % lepší.
  - Za práci týmu dostává hráč čtvrtinu XP, aby úroveň hráče nerostla příliš rychle.
- **Náročnost:** těžší výrobky, plodiny a zvířata zvládne pracovník až s praxí. Třešňový koláč a krávy od úrovně 2, meloun a borůvkové muffiny od úrovně 4. V tabulce jsou takové řádky šedé.
- **Zásluhy a průmysl:**
  - Statek jde vylepšit jen s úrovní hráče a jedním úkolem (sklizeň, zakázky, produkty od zvířat, výroba nebo pověst).
  - Průmysl se odemyká postupně až do Statku 10: Krmivárna a Kurník na 2, Mlékárna na 5, Textilka na 10…
  - Co už hráč má postavené, zůstává a funguje.
  - Velké pole a Stodola jsou od Statku 4.
- **Obrazovka Tým:**
  - Nové tlačítko vpravo pod Deníkem.
  - Seznam pracovníků s úrovní, výkonem a tím, co právě dělají. Lze je filtrovat podle profese.
  - Detail ukazuje dovednosti ve všech oborech a historii povýšení. Odtud jde pracovníka přeřadit nebo propustit.
- **Ostatní:**
  - Záložka Statku „Farmáři“ se jmenuje „Oblasti“.
  - Záložka Pomocník je vidět, jen dokud běží najatý pomocník.
  - Průvodce má dva nové kroky (postav chatrč, vyvěs inzerát).

## Co jsem ověřil a co ne
- Testy: 84 z 84. Nové hlídají:
  - reset uložené hry;
  - domky a přestavbu;
  - nástěnku (pohoštění, stejní uchazeči na serveru i v prohlížeči, lůžka, odchod po 24 h);
  - pověst a zájemce, kteří se ozvou sami;
  - zásluhy;
  - úrovně a zkušenosti;
  - výkon a dávky;
  - náročnost;
  - vykreslení všech nových oken.
- V prohlížeči (telefonní rozměr):
  - testovací verze: reset, nástěnka, přijetí, Tým, přeřazení, Statek se zásluhami a mapa s nástěnkou, domky a bublinou;
  - online proti lokálnímu serveru: registrace a otevření týmu;
  - start hry při 11 druzích poruch.
- Zátěž: den nepřítomnosti s týmem na nejvyšší úrovni se dopočítá na asi 55 požadavků po 5 ms.
- Nezkoušel jsem: skutečný telefon a nasazený server.
