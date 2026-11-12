# EKOfarm v40 – nasazení (příběh Kronika údolí, denní série, férovější suroviny na vylepšení)

**v39 se nenasazuje.** Zip v40 obsahuje všechno od v38: příběh, denní sérii, vzácné ozdoby a opravy. Rozbal ho přímo na nasazenou v38.

Nic se neresetuje. Migrace databáze **není potřeba**: příběh se farmě doplní sám při prvním načtení.

Zip obsahuje jen soubory změněné od v38: kód, 20 ilustrací příběhu a 10 ozdob s ikonami. `wrangler.toml` v zipu není.

## Postup v Codespace
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`

**1. Rozbalit a otestovat**
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v40.zip && cd EKOfarm && rm -f NASAZENI_v38.md
```
```bash
npm test
```
Musí skončit `pass 150` a `fail 0`.

**2. Nasadit**
```bash
npx wrangler deploy
```

### Aktualizace u všech hráčů
- Po nasazení server přijímá jen aplikaci v40.
- Kdo má otevřenou v38, tomu se hra **sama načte znovu** v nové verzi. Postup zůstane.
- Kdo by měl ještě v37 nebo starší, uvidí hlášku *„Je tu nová verze hry. Zavři ji a otevři znovu.“*

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v40" && git push && cd EKOfarm
```

## Co je nového
### Příběh „Kronika údolí“
- Jednou denně přijde místo jedné ze dvou událostí **díl příběhu**. Hráč našel na půdě kroniku dědy Matouše.
- Postavy:
  - sousedka Hedvika;
  - malý Kryštof z městečka;
  - starostka Ludmila;
  - podnikatel Rudolf Hladík.
- **Všichni začínají od 1. kapitoly**, i hráči s vysokým Statkem, a díly jdou po sobě. Nikdo nic nepřeskočí ani neztratí.
- **Každou další kapitolu odemkne vylepšení Statku**, ne úroveň hráče:

  | Kapitola | Od Statku | Odměna (vzácná ozdoba) | Mince | XP |
  |---|---|---|---|---|
  | 1. Dědova kronika | 1 | Dědova studna | 150 | 30 |
  | 2. Starý sad | 2 | Dědova jabloň | 250 | 40 |
  | 3. Velká voda | 3 | Vodní mlýnek | 400 | 60 |
  | 4. Muž z města | 4 | Lípa svornosti (2×2) | 600 | 80 |
  | 5. Dožínky | 5 | Dožínkový věnec | 1000 | 120 |

- Příběh chodí hned od začátku hry. Náhodné události dál začínají od úrovně 3.
- Díl na hráče počká, dokud ho nezahraje. Další díl přijde nejdřív další den.
- **Hra si pamatuje volby:**
  - Některé odpovědi se ukážou jen po dřívější volbě nebo s dobrým vztahem.
  - Do textu dalších dílů přibudou věty podle toho, co hráč udělal.
- Vztahy s Hedvikou, Kryštofem a městečkem zvýší odměnu za kapitolu: +5 % mincí za bod, nejvýš +50 %.
- Přehled dílů, voleb a vztahů: okno Událost → **Kronika údolí**.
- Po vylepšení Statku okno ukáže i novou kapitolu.

### Denní série
- Odměna roste s každým **dalším dnem po sobě**: 20, 25, 30… mincí, až na 200. Každý 7. den je dvojnásobná a dá i zkušenosti.
- **Když hráč den vynechá, série začne znovu od 1.**
- **Milníky** (dny po sobě) dají vzácné ozdoby. Každou dostane hráč jen jednou.

  | Den | Ozdoba |
  |---|---|
  | 7. | Strašák |
  | 14. | Vozík s květinami |
  | 30. | Holubník |
  | 50. | Větrník |
  | 100. | Altán s růžemi (2×2) |

### Vzácné ozdoby
- Ve Stavět → Ozdoby mají kartu „odměna“, u které je napsáno, za co se získají. Koupit nejdou.
- Získaná ozdoba je tam zdarma a nahoře.

### Suroviny na vylepšení budov a Statku
- Vylepšení chce **jen suroviny, které hráč už může mít**: plodiny, zvířata, ovoce a výrobky, které už odemkl Statek. Příklad: krmivo pro krávy se objeví až se Statkem 4, kdy jde postavit Kravín.
- Výrobky jsou jen ze základních receptů (bez potřeby vyšší dovednosti Vaření). Ryby jen ty, které berou hned.
- Mince za vylepšení a zásluhy Statku zůstaly stejné.

## Grafika
- 30 nových obrázků ze Scenario (GPT Image 2.5 Flare), spotřeba 360 kreditů:
  - 20 ilustrací dílů;
  - 10 ozdob.
- Prompty a ID obrázků jsou v `art/PROMPTY_scenario.json` (`v39`) a zapsané v `AUTORSKA_PRAVA.md` a `EKOFARM_LEGAL_CHECKLIST.md`.

## Co jsem ověřil a co ne
- **Testy:** 150 ze 150. Z toho 6 nových v `test/v39.test.js`:
  - data příběhu;
  - kapitoly podle Statku a start od 1. kapitoly pro každého;
  - díly i pod úrovní 3;
  - paměť voleb;
  - odměna za kapitolu;
  - denní série s nulováním a milníky;
  - suroviny na vylepšení všech úrovní Statku a budov jen z odemčeného, cena se nemění.
- **V testovací verzi v prohlížeči (iPhone 13):**
  - nová farma na úrovni 1 dostane hned 1. díl;
  - Kronika ukazuje „od Statku N“;
  - vylepšení Statku 1 chce pšenici a kukuřici;
  - denní série po vynechaném dni začíná od 1;
  - z v39 ještě konec kapitoly, ozdoby ve Stavět a na mapě.
- **Neověřeno:** nasazený server a skutečný telefon.
