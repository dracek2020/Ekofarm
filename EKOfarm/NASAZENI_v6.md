# EKOfarm v6 – oprava načítání

Ve v5 omylem vypadly tři části kódu (panely výroby, ohrady a ozdoby). Kvůli tomu se hra v prohlížeči vůbec nenačetla. v6 je vrací a přidává kontroly, aby se to nemohlo stát znovu. Farmy hráčů nebyly nijak dotčené.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v6.zip && cd EKOfarm
```
```bash
npm test
```
Musí skončit `pass 34` a `fail 0`.
```bash
npx wrangler deploy
```
```bash
cd /workspaces/Ekofarm && git add . && git commit -m "EKOfarm v6" && git push && cd EKOfarm
```

## Potom v mobilu nebo na iPadu
Otevři https://ekofarm.xxarenaxx.workers.dev a jednou stránku obnov. Od této verze mají soubory hry v adrese číslo verze, takže prohlížeč po dalších aktualizacích sám stáhne nové.

Kdyby se hra někdy nenačetla, místo věčného „Načítám farmu…“ uvidíš hlášku s popisem chyby a tlačítkem **Načíst znovu**. Tu hlášku mi pak pošli.
