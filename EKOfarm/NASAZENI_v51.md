# EKOfarm v51 – nasazení (pole a domy při oddalování nemizí)

Navazuje na **v50**. Zip obsahuje jen soubory změněné od v50. `wrangler.toml` v zipu není.

**Hlášení:** při přibližování a oddalování (iPhone z plochy) mizí pole a některé domy a po puštění se vrátí.

**Příčina:** stejná chyba jako „kreslení: … ITEMS[first.r].icon“ (opravená ve v50). Když byla v obraze Krmivárna s hotovou krmnou směsí z ovsa, otrub, pokrutin, řízků nebo výlisků, kreslení u ní spadlo a **všechno, co se kreslí po ní** (pole, stromy a domy blíž k hráči), se nenakreslilo. Chybová hláška se ukáže jen jednou za spuštění, takže pak to vypadalo jen jako mizení při oddalování/posouvání. Ověřeno na skutečné farmě hráče, který má v Krmivárně 3 hotové dávky ovesné směsi: s v49 pole chybí, s v50/v51 jsou vidět.

**Pojistka ve v51:** kdyby jakákoli věc na farmě v budoucnu při kreslení spadla, zbytek farmy se nakreslí normálně a hláška se ukáže jednou.

Nic se neresetuje, migrace databáze **není potřeba**. Data hráčů jsou v pořádku.

## Postup v Codespace
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`

**1. Rozbalit a otestovat**
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v51.zip && cd EKOfarm && rm -f NASAZENI_v50.md
```
```bash
npm test
```
Musí skončit `pass 282` a `fail 0`.

**2. Nasadit**
```bash
npx wrangler deploy
```

### Aktualizace u všech hráčů
- Server po nasazení přijímá jen aplikaci v51.
- Kdo má otevřenou starší verzi (od v38), tomu se hra **sama načte znovu**. U hry přidané na plochu iPhonu stačí ji zavřít a znovu otevřít.

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v51: pole a domy při oddalování nemizí" && git push && cd EKOfarm
```

## Pokud ještě nejsou nasazené v49 a v50
Rozbal postupně `EKOfarm_v49.zip`, `EKOfarm_v50.zip` a `EKOfarm_v51.zip` (každá navazuje na předchozí), pak jednou `npm test` a `npx wrangler deploy`.
