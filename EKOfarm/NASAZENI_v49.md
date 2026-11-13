# EKOfarm v49 – nasazení (kontrola serveru, data hráčů, výkon na iPhonu, Androidu a v prohlížeči)

Navazuje na **v48**. Zip obsahuje jen soubory změněné od v48: kód, testy, nástroj `farm-check`, nový soubor `public/_headers`, dvě ikony pro Android a dokumenty. `wrangler.toml` v zipu není.

Nic se neresetuje a migrace databáze **není potřeba**. Farmy, pole, budovy, sklad, pracovníci i fronty zůstávají. Kontrola ostrých dat: **11 farem, 0 problémů** (podrobně `EKOFARM_V49_SERVER_A_VYKON.md`).

## Postup v Codespace
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`

**1. Rozbalit a otestovat**
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v49.zip && cd EKOfarm && rm -f NASAZENI_v48.md
```
```bash
npm test
```
Musí skončit `pass 277` a `fail 0`.

**2. Nasadit**
```bash
npx wrangler deploy
```
Soubor `public/_headers` se nasadí spolu se hrou (není potřeba nic nastavovat).

### Aktualizace u všech hráčů
- Server po nasazení přijímá jen aplikaci v49.
- Kdo má otevřenou starší verzi (od v38), tomu se hra **sama načte znovu**.

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v49: server, data hráčů, výkon na telefonech" && git push && cd EKOfarm
```

### Nepovinné: kontrola farem kdykoli později (jen čte)
```bash
npx wrangler d1 execute ekofarm --remote --json --command "SELECT user_id, state FROM farms" > farms.json
node tools/farm-check.mjs farms.json && rm farms.json
```
Na konci musí být `s problémem: 0`. Soubor `farms.json` obsahuje uložené farmy – po kontrole ho smaž (příkaz výše to udělá) a nenahrávej ho na GitHub.

## Co je nového
| Kde | Novinka |
|---|---|
| Telefon (iPhone i Android) | Hra zatěžuje procesor o 55–60 % méně (snímky podle potřeby, okno se nepřekresluje zbytečně, na pozadí nic neběží) |
| Zamčení telefonu hned po akci | Akce odejde okamžitě a doběhne i po uspání stránky |
| Výpadek signálu | Opakované odeslání se na serveru neprovede podruhé (klíč dávky) |
| Načítání | Skripty a styly si prohlížeč pamatuje do dalšího vydání |
| Android | Ikona na ploše se neořízne (maskable) |
| iPhone | Průhledná horní lišta a název po přidání na plochu |
| PC | Šipky / WASD posouvají, + / − přibližují |
| Server | Jednou za hodinu se smažou prošlá přihlášení |
