# EKOfarm v4 – nasazení (jen změněné soubory)

Zip obsahuje jen soubory, které se od v3 změnily. `wrangler.toml` (s tvým ID databáze) v něm **není**, takže se nepřepíše. Databáze se nemění a farmy hráčů zůstanou.

## Postup v Codespace
1. Nahraj `EKOfarm_v4.zip` do kořene Codespace, tedy vedle `EKOfarm_v3.zip`.
2. V terminálu spouštěj **po jednom**:
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v4.zip && cd EKOfarm
```
```bash
npm test
```
```bash
npx wrangler deploy
```
```bash
cd .. && git add . && git commit -m "EKOfarm v4" && git push && cd EKOfarm
```
`npm test` musí skončit `fail 0`.

## Co je nového
- **Nová farma:** po skladu si postavíš **6 polí zdarma**, kamkoliv chceš. S každou další úrovní můžeš postavit **6 dalších polí** (Stavět → Pole).
- **Sady od úrovně 3:** Stavět → Sad. Klepni na sad a vyber strom: jabloň (3), hrušeň (4), švestka (5), třešeň (6) nebo meruňka (8). Strom plodí 4–5×. Zralé ovoce sklidíš klepnutím nebo tažením prstu, stejně jako pole. Když strom doslouží, klepnutím ho vykopeš a zasadíš nový.
- **Zakázky:** klepni na Statek. Je tam 6 objednávek, které platí víc než výkup ve skladu a dávají XP. Když jde něco doručit, ukáže se nad statkem bublina 📦. Zakázku, která se ti nehodí, zrušíš ✕ a za 3 minuty přijde nová.

Farmy založené ve v3 si ponechají svých 6 polí a zakázky dostanou automaticky.
