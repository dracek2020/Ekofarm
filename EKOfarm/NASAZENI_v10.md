# EKOfarm v10 – nasazení (jen změněné soubory)

**Pozor, tentokrát se mění databáze:** přibyly dvě tabulky pro tržiště hráčů (`market` a `market_sales`). Stávající tabulky ani farmy hráčů se nemění. `schema.sql` jde spustit bezpečně znovu, protože všechno je `CREATE … IF NOT EXISTS`. `wrangler.toml` v zipu není.

Starým farmám hra sama přesune Prodejnu strojů a Stánek do městečka a jejich úroveň zůstane.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v10.zip && cd EKOfarm
```
```bash
npm test
```
Musí skončit `pass 54` a `fail 0`.
```bash
npx wrangler d1 execute ekofarm --remote --file=schema.sql
```
Kontrola, že tabulky jsou v databázi:
```bash
npx wrangler d1 execute ekofarm --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
```
Ve výpisu musí být `market` a `market_sales`.
```bash
npx wrangler deploy
```
```bash
cd /workspaces/Ekofarm && git add . && git commit -m "EKOfarm v10" && git push && cd EKOfarm
```
Pak hru v prohlížeči jednou obnov.

## Co je nového
- **Městečko:**
  - Ze spodního rohu farmy vede hnědá prašná cesta dolů až na kraj mapy.
  - Na cestě se nedá stavět ani tam dát pole.
  - Dole je městečko s náměstím a domky. Najdeš tam **Prodejnu strojů**, **Stánek** a nové **Tržiště hráčů**.
  - Tlačítko **Městečko** vpravo nahoře tě tam přenese, druhým klepnutím se vrátíš na farmu.
- **Tržiště hráčů** (jen online):
  - Vystavíš úrodu, výrobky, semena i stroje za vlastní cenu, nejvýš za trojnásobek běžné ceny.
  - Můžeš mít najednou 8 nabídek. Zboží je do prodeje uložené na tržišti. Když nabídku stáhneš, vrátí se ti.
  - Peníze za prodané zboží ti přijdou samy a hra ti ukáže, kdo nakoupil.
- **Semena:**
  - V **Semenárně** uděláš ze 2 plodin 3 balíčky semen. Ze 6 pšenic tak oseješ 9 polí.
  - Sázení bere nejdřív semena ze skladu a teprve potom mince. Platí to i pro pomocníka a velké pole.
  - Semena jdou prodat a dělají se z nich nové výrobky: chléb se semínky, pražená semínka a dýňový olej.
- **Školka stromků:** ze 3 plodů udělá sazenici a sad pak sazenici použije místo mincí.
- **Denní úkoly:** každý den 8 nových úkolů s odměnou v mincích a XP a bonus za splnění všech. Najdeš je v Úkoly → Denní úkoly.
- **Úroveň hráče a Statek:**
  - Úroveň hráče roste pořád, až do 200.
  - Co můžeš stavět, určuje jen **úroveň Statku**. Každá úroveň Statku odemkne nové budovy, další pole a sady:

    | Statek | Odemkne |
    |---|---|
    | 1 | semenárna, krmivárna, pekárna, kurník, sady, ozdoby |
    | 2 | mlýn, kravín, konzervárna, školka |
    | 3 | stodola, velké pole, džusárna |
    | 4 | mlékárna, olejna, marmeládárna |
    | 5 | prasečák, cukrovar |
    | 6 | uzenářství |
    | 7 | ovčín, textilka |
    | 8–10 | další pole, sady a velká pole |

  - Plodiny, zvířata, stromy, stroje a recepty dál odemyká úroveň hráče.
- **Žebříček:** řadí se podle úrovně. U každého hráče je tlačítko **Navštívit**, kterým se podíváš na jeho farmu. **Zpět domů** tě vrátí.
- Přehled cen je v **EKONOMIKA.md**.
