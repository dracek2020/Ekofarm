# EKOfarm v8 – nasazení (jen změněné soubory)

Databáze se nemění a farmy hráčů zůstanou. `wrangler.toml` v zipu není.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v8.zip && cd EKOfarm
```
```bash
npm test
```
Musí skončit `pass 41` a `fail 0`.
```bash
npx wrangler deploy
```
```bash
cd /workspaces/Ekofarm && git add . && git commit -m "EKOfarm v8" && git push && cd EKOfarm
```
Pak hru v prohlížeči jednou obnov.

## Co je nového: dokupování pozemků
- Kolem farmy je **8 pozemků na prodej**: 4 po stranách a 4 v rozích. Nekoupená země je divoká louka se stromy a s cedulí **NA PRODEJ**.
- Pozemek koupíš klepnutím na cizí louku nebo přes **Stavět → Pozemky**. Panel má malou mapku, na které je vidět, co už máš.
- Každý další pozemek je dražší a potřebuje vyšší úroveň:

| Kolikátý pozemek | 1. | 2. | 3. | 4. | 5. | 6. | 7. | 8. |
|---|---|---|---|---|---|---|---|---|
| Cena (mincí) | 1 500 | 3 000 | 5 000 | 8 000 | 12 000 | 16 000 | 20 000 | 25 000 |
| Od úrovně | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |

- Rohový pozemek jde koupit, až máš některý pozemek vedle něj.
- Po koupi se plot posune, stromy z pozemku zmizí a můžeš tam stavět, třeba další velké pole.
