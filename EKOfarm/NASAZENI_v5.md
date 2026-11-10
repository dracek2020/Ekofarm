# EKOfarm v5 – nasazení (jen změněné soubory)

Zip obsahuje jen soubory změněné od v4. `wrangler.toml` v něm není a databáze se nemění. Farmy hráčů zůstanou a traktor nebo kombajn postavený na mapě se sám přesune do garáže.

## Postup v Codespace (po jednom)
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v5.zip && cd EKOfarm
```
```bash
npm test
```
```bash
npx wrangler deploy
```
```bash
cd /workspaces/Ekofarm && git add . && git commit -m "EKOfarm v5" && git push && cd EKOfarm
```

## Co je nového
- **🚜 Stroje vlevo nahoře:** prodejna se 2 traktory a 2 kombajny. Koupené stroje jsou v garáži. Pro malá pole tu jsou tlačítka „Zasít vše“ a „Sklidit vše“.
- **Velké pole od úrovně 5:** Stavět → Velké pole. Velikost nastavíš tlačítky ↔ a ↕ (3×3 až 6×6), každé políčko stojí 8 🪙.
- **Práce strojů:** klepni na velké pole a vyber plodinu. Traktor zaseje a uvidíš ho jezdit po řádcích. Až plodina dozraje, sklidí ji kombajn (obilí, kukuřice, sója) nebo traktor (mrkev). Úrodu pak klepnutím odvezeš do skladu.
