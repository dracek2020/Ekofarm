# EKOfarm v31 – nasazení (víc lidí ve výrobnách a ohradách, přehled chovu, výkon výpočtu)

Databáze ani nastavení se nemění. `wrangler.toml` v zipu není. Obrázky ani knihovny se nemění.

Zip obsahuje jen soubory změněné od v30.

**Nasazuješ víc verzí najednou?** Rozbal po sobě zipy v28, v29, v30 a v31 a nasaď jednou. Uložené hry se převedou postupně:
- v29: reset týmu;
- v30: plány se přenesou k pracovištím;
- v31: nic se neztratí, kapacita se jen zvětší.

Záloha v30 je v gitu (značka `v30`, větev `zaloha-v30`) a jako `EKOfarm_v30_zaloha_cela.zip`.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v31.zip && cd EKOfarm && rm -f NASAZENI_v30.md
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
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v31" && git push && cd EKOfarm
```

## Co je nového
- **Kolik lidí kam** (`team-config.js`, `cap`):

  | Budova | úr. 1–3 | úr. 4 | úr. 5–6 | úr. 7–9 | úr. 10 |
  |---|---|---|---|---|---|
  | Výrobna | 1 | 2 | 2 | 3 | 4 |
  | Ohrada | 1 | 1 | 2 | 2 | 2 |
  | Včelín, sklad | 1 | 1 | 1 | 1 | 1 |
  | Pole a sady | 1 na 4 pole | | | | |

- **Síla obsluhy** (`team-config.js`, `crew`):
  - Pracovníci se seřadí podle výkonu. Ve výrobně přispívají 100 %, 60 %, 40 % a 30 % – tolik kusů jde do jedné dávky. Výroba trvá stejně a suroviny se odečtou přesně.
  - V ohradě druhý chovatel přidá čtvrtinu svého výnosu z krmení.
  - Kdo na věc nemá praxi, nepočítá se. Zkušenosti se dělí podle podílu.
  - Příklad: dva řemeslníci na úrovni 5 udělají 3,95 kusu na dávku místo 2,47. Čtyři na úrovni 12 udělají 27,6 kusu místo 12.
- **Přehled chovu:**
  - V okně ohrady a ve Statku na záložce „Chov“.
  - Ukazuje krmivo a rezervu, spotřebu a produkci za hodinu, na jak dlouho krmivo vydrží, kolik dělá Krmivárna a počet chovatelů.
  - Upozorní, když krmivo došlo, je celé v rezervě nebo vydrží méně než 2 hodiny.
  - Včelíny jsou v přehledu taky.
- **V okně budovy:**
  - síla obsluhy a kdo kolik přidává;
  - „Další místo od N. úrovně budovy“;
  - vylepšení napíše, že přidá místo pro dalšího pracovníka.
- **Na mapě** stojí před budovou až 4 pracovníci.
- **Výkon:**
  - Pracovník na poli, v sadu a u zvířat dělá víc kusů jedním úkonem (nejvýš 12 nebo 30 s práce).
  - Čekající se budí po jednom.
  - Jeden požadavek na server má pevný rozpočet 1 500 událostí.
- **Rezervy:** chovatel teď krmí jen z krmiva nad rezervou.

## Co jsem ověřil a co ne
- Testy: 98 z 98. Nové hlídají:
  - kapacity podle úrovně;
  - sílu obsluhy;
  - tři řemeslníky v mlýně (hotové odnáší jen jeden, přesná bilance pšenice, zkušenosti 100 : 60 : 40);
  - dva chovatele (nikdy stejné zvíře, krmivo přesně, 3,75 vejce z krmení);
  - přehled chovu;
  - slučování práce (stejná sklizeň, méně výpočtů);
  - 30 pracovníků a den nepřítomnosti;
  - uložení uprostřed práce a jiné dělení času (stejný výsledek);
  - 6 souběžných požadavků na server (zboží ani mince se nezdvojí, vše se uloží).
- V prohlížeči (telefonní rozměr), testovací verze: převod hry z v30, druhý řemeslník v pekárně, druhý chovatel, přehled v ohradě a ve Statku, mapa.
- Zátěž (tento stroj): farma s 23–30 pracovníky, den nepřítomnosti – požadavek v mediánu 4 ms, nejhůř kolem 10 ms. Pole, kde nestíhají lidé, potřebují 3–7× méně výpočtů.
- Nezkoušel jsem: skutečný telefon a nasazený server.
