# EKOfarm v15 – nasazení (jen změněné soubory)

**Pozor:** přibyla tabulka `chat` v databázi, proto je potřeba znovu spustit `schema.sql`. Je to bezpečné, farmy hráčů se nezmění. `wrangler.toml` v zipu není.

## Postup v Codespace (po jednom)
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v15.zip && cd EKOfarm
```
```bash
npm test
```
Musí skončit `pass 63` a `fail 0`.
```bash
npx wrangler d1 execute ekofarm --remote --file=schema.sql
```
```bash
npx wrangler deploy
```
```bash
cd /workspaces/Ekofarm && git add . && git commit -m "EKOfarm v15" && git push && cd EKOfarm
```
Pak hru v prohlížeči jednou obnov.

## Co je nového
- **Počasí:** je stejné pro všechny hráče a mění se každé 2 hodiny. Vidíš ho vlevo nahoře, klepnutím zjistíš, co dělá a kdy se změní.
  - **Jasno:** běžný den.
  - **Polojasno:** ryby berou o něco lépe.
  - **Déšť:** co zasadíš, roste o 20 % rychleji. Ryby berou a častěji zabere velká. Ve hře prší.
  - **Horko a sucho:** co zasadíš, roste o 15 % pomaleji a ryby moc neberou.
- **Ryby:**
  - 6 nových druhů (karas, cejn, amur, úhoř, bolen a jeseter), celkem jich je 14.
  - Každá ryba má váhu: velká dá do skladu 2 kusy, obří 3 a hůř se udrží.
  - U každého druhu se ukazuje tvůj rekord.
  - Nová jídla: rybí karbanátky, amur na grilu, uzený úhoř, bolen na bylinkách a kaviár.
- **Chat pro všechny hráče:**
  - Najdeš ho vpravo nahoře, červená tečka znamená nové zprávy.
  - Klepnutím na jméno navštívíš jeho farmu.
  - Zprávy se po 7 dnech mažou a jde poslat nejvýš 1 zpráva za 3 sekundy.
- **Zavírání oken:** všechno jde kdykoli zavřít.
  - Křížek panelu zůstává nahoře i při posouvání.
  - Průvodce i rybaření mají křížek.
  - Hlášku zavřeš klepnutím.
  - Na klávesnici funguje i Esc.
