# EKOfarm v30 – nasazení (plán u pracoviště, kapacity, cílové zásoby, rezervy)

Databáze ani nastavení se nemění. `wrangler.toml` v zipu není. Obrázky se nemění.

Zip obsahuje jen soubory změněné od v29.

**Uložené hry:** tým zůstává. Plány pracovníků se při prvním otevření přenesou na jejich pracoviště:
- strop zásoby ve výrobně se změní na cílovou zásobu;
- rezerva skladníka se změní na rezervu ve Skladu.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v30.zip && cd EKOfarm && rm -f NASAZENI_v29.md
```
```bash
npm test
```
Musí skončit `pass 89` a `fail 0`.
```bash
npx wrangler deploy
```

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v30" && git push && cd EKOfarm
```

## Co je nového
- **Plán patří pracovišti:**
  - Výrobna, sklad a oblast polí mají vlastní plán. Když pracovníka přeřadíš nebo vyměníš, plán zůstane.
  - Plán jde nastavit, i když tam zatím nikdo nepracuje.
- **Kolik lidí kam** (čísla jsou v `team-config.js`):
  - Ve výrobně, ohradě, včelíně a skladu je zatím místo pro jednoho.
  - Oblast polí nebo sadů vezme jednoho pracovníka na každá 4 pole: 6 polí → 1, 8 polí → 2, 12 polí → 3.
  - Víc pěstitelů v jedné oblasti pracuje spolu a nebere si stejná políčka.
  - Na plné místo se jde jen výměnou. V okně Tým je „plno – vyměnit s…“, v okně budovy „Vystřídat“. Vyměněný jde tam, odkud přišel nový.
- **Výroba:**
  - Procenta teď znamenají podíl výrobního času. Nastavují se posuvníkem po 5 % nebo tlačítky −/+.
  - Když procenta nedají 100 %, budova zbytek času stojí. S přepínačem „Přerozdělit nevyužité“ se zbytek rozdělí mezi výrobky v plánu.
  - Cílové zásoby mají přednost a vyrábějí se v pořadí shora (▲▼), dokud jich není dost. Co je na cíli, se nevyrábí.
  - U každého výrobku je odhad „asi N za hodinu“. Dole je přehled, co se vyrobilo za posledních 6 hodin.
- **Rezervy ve Skladu:** pod nastavený počet kusů tým nesáhne. Výroba z rezervy nebere suroviny a skladník ji neprodá. Hráč sám může prodávat dál.
- **Skladník:** v plánu může být až 12 druhů zboží. Prodá jich tolik, kolik zvládne podle úrovně (4 → 12). Zbylé řádky jsou šedé.
- **Oblasti:** přepínač „Znovu sázet“ – vypnutý znamená jen sklízet a nechat ladem.
- Jak hrát a Novinky jsou doplněné.

## Co jsem ověřil a co ne
- Testy: 89 z 89. Nové hlídají:
  - kapacity a výměnu;
  - dva pěstitele v jedné oblasti (každý jiné políčko, žádné semínko navíc);
  - podíl času, nevyužitou kapacitu a přerozdělení;
  - přehled výroby;
  - cílové zásoby v pořadí a přesně do cíle;
  - rezervy;
  - převod uložené hry z v29;
  - vykreslení nových částí oken.
- V prohlížeči (telefonní rozměr):
  - testovací verze: převod hry z v29, plán v pekárně, posuvník (tažení 1,5 s, okno se mezitím nepřekreslí), přerozdělení, cíle, Sklad s rezervami a plánem prodeje, oblast s 8 poli a dvěma pěstiteli, výměna v Týmu;
  - online proti lokálnímu serveru: registrace, rezerva se uloží a po načtení zůstane.
- Zátěž: 19 pracovníků (3 oblasti po 20 polích po 5 lidech + výroba + sklad), den nepřítomnosti: dávka 800 úkonů po zahřátí do 6 ms.
- Nezkoušel jsem: skutečný telefon a nasazený server.
