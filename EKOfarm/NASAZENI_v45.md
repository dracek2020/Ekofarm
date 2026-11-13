# EKOfarm v45 – nasazení (ovoce: Sušárna, Cukrárna, 20 nových výrobků)

Navazuje na **v44**. Zip obsahuje jen soubory změněné od v44: kód, 20 ikon a 2 budovy. `wrangler.toml` v zipu není.

Nic se neresetuje a migrace databáze **není potřeba**. Zálohu `EKOfarm_v45_priprava.zip` už nepoužívej, tenhle zip ji nahrazuje.

## Postup v Codespace
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`

**1. Rozbalit a otestovat**
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v45.zip && cd EKOfarm && rm -f NASAZENI_v44.md
```
```bash
npm test
```
Musí skončit `pass 168` a `fail 0`.

**2. Nasadit**
```bash
npx wrangler deploy
```

### Aktualizace u všech hráčů
- Server po nasazení přijímá jen aplikaci v45.
- Kdo má otevřenou starší verzi (od v38), tomu se hra **sama načte znovu**.

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v45" && git push && cd EKOfarm
```

## Co je nového
| Budova | Od Statku | Výrobky (potřebné Vaření) |
|---|---|---|
| **Sušárna ovoce** (nová, 80 mincí) | 2 | Křížaly, Sušené hrušky, Malinový čaj (1) · Sušené švestky (3, Statek 3) · Ovocný čaj (4, Statek 3) · Sušené borůvky (4, Statek 4) · Sušené meruňky (7, Statek 4) · Rozinky (10, Statek 5) |
| Pekárna | 3 | Jablečný závin, Švestkové knedlíky, Třešňová bublanina, Angreštový koláč (4) |
| Džusárna | 4 | Malinový sirup (1) · Třešňový džus (3) · Broskvový sirup (7, Statek 5) |
| Mlékárna | 5 | Ovocný jogurt (3) |
| **Cukrárna** (nová, 320 mincí) | 6 | Ovocný salát, Jahodové knedlíky (1) · Ovocná zmrzlina (3) · Ovocný dort (4) |

- Každé ovoce do Statku 5 se teď dá zpracovat **hned se Statkem, který ho odemkne**. Dřív šly jablka a hrušky zpracovat až se Statkem 4, ostatní ovoce až se Statkem 7–8.
- Ceny výrobků se spočítají samy z receptů (dražší než suroviny).
- Zakázky, Stánek, dárky a plán týmu nové výrobky používají samy, až je hráč může mít.

## Grafika
- 4 obrázky ze Scenario, 48 kreditů: 2 archy s 20 ikonami a budovy Sušárna a Cukrárna.
- Prompty a ID jsou v `art/PROMPTY_scenario.json` (`v45`) a zapsané v `AUTORSKA_PRAVA.md` a `EKOFARM_LEGAL_CHECKLIST.md`.

## Co jsem ověřil a co ne
- **Testy:** 168 ze 168. Z toho 2 nové (`test/v45.test.js`):
  - budovy, výrobky a ceny;
  - každé ovoce do Statku 5 má výrobek hned se svým Statkem.
- **V testovací verzi v prohlížeči (iPhone 13):**
  - Sušárna a Cukrárna na mapě;
  - jejich okna s recepty a zámky „Vaření N“;
  - obě budovy ve Stavět → Výrobny.
- **Neověřeno:** nasazený server a skutečný telefon.
