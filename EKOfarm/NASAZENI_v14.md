# EKOfarm v14 – nasazení (jen změněné soubory)

Ohrady zase se zvířaty jako dřív. Databáze ani nastavení se nemění. `wrangler.toml` v zipu není.

## Postup v Codespace (po jednom)
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v14.zip && cd EKOfarm
```
```bash
npm test
```
Musí skončit `pass 60` a `fail 0`.
```bash
npx wrangler deploy
```
```bash
cd /workspaces/Ekofarm && git add . && git commit -m "EKOfarm v14" && git push && cd EKOfarm
```
Pak hru v prohlížeči jednou obnov.

## Co je nového
- Ohrady (kurník, kravín, prasečák, ovčín) mají zpátky původní vzhled. Zvířata chodí po výběhu a je jich vidět přesně tolik, kolik jich máš.
- Statek, Sklad a výrobny mají dál tvoji grafiku.
- Unzip nemaže soubory: v Codespace zůstanou staré obrázky ohrad v public/img/b/ (kurnik.webp, kravin.webp, prasecak.webp, ovcin.webp). Hra je nepoužívá, ale můžeš je smazat:
```bash
rm -f public/img/b/kurnik.webp public/img/b/kravin.webp public/img/b/prasecak.webp public/img/b/ovcin.webp
```
