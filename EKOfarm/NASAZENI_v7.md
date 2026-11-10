# EKOfarm v7 – nasazení (jen změněné soubory)

Databáze se nemění, farmy hráčů zůstanou a nové věci (statistiky, denní odměna) se doplní samy. `wrangler.toml` v zipu není.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v7.zip && cd EKOfarm
```
```bash
npm test
```
Musí skončit `pass 40` a `fail 0`.
```bash
npx wrangler deploy
```
```bash
cd /workspaces/Ekofarm && git add . && git commit -m "EKOfarm v7" && git push && cd EKOfarm
```
Pak hru v prohlížeči jednou obnov.

## Co je nového
- **Plodiny:** brambory (úroveň 4), řepka (6), slunečnice (7), cukrová řepa (8). Brambory a řepu sklízí traktor, řepku a slunečnici kombajn.
- **Budovy:** Mlýn (mouka, s točícím se větrníkem), Olejna (olej z řepky), Cukrovar (cukr z řepy). V Pekárně přibyly buchty.
- **Nářadí ve 🚜 Stroje:**
  - **Pluh:** zoraná půda dá o 50 % větší úrodu.
  - **Secí stroj:** traktor s ním seje 2× rychleji.
  - **Lis na balíky:** po sklizni obilí slisuje slámu do balíků.
  - Na velkém poli je vidět, jak traktor táhne pluh, secí stroj nebo lis.
- **Úkoly** (nové tlačítko s pohárem):
  - denní odměna po 7 dní, sedmý den 200 mincí
  - 7 úkolů po 3 stupních
  - **žebříček** všech farem
  - červená tečka ukáže, že něco čeká na vyzvednutí
- **Sklad:** výkupní ceny se mění každé 4 hodiny (šipky ukazují dobrou a nízkou cenu).
- **Vzhled:** vlastní ikony místo emoji, zvuky a večer a v noci se farma ztmaví podle hodin. Zvuk i den a noc jde vypnout v Menu.
