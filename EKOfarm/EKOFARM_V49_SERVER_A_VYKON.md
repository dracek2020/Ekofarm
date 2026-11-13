# EKOfarm v49 – kontrola serveru, data hráčů a výkon na iPhonu, Androidu a v prohlížeči

13. 11. 2026 · větev `budovy` · `CLIENT_MIN` 49, verze aplikace 49, `RULES_VERSION` beze změny (23) · záloha: tag `v48` + `ZALOHA_EKOfarm_v48.zip`.

## 1. Data hráčů – nikdo o nic nepřišel
Ostrá databáze D1 `ekofarm` (jen čtecí dotazy, nic se nezapisovalo; jména hráčů se nevypisují):

| Co | Výsledek |
|---|---|
| Účty / farmy | 11 / 11 – každý účet má farmu |
| Farmy ze staré sezóny (`v` < `RESET_V` 20) | 0 |
| Verze farem | všechny `v` = 23 |
| Úroveň a XP | u všech sedí (XP odpovídá úrovni) |
| Největší uložená farma | 11 kB (D1 bez problémů) |
| Přihlášení (sessions) | 18, prošlých 0 |

Kontrola každé farmy proti pravidlům v49 – `node tools/farm-check.mjs farms.json`:
1. všechna ID (budovy, předměty, osivo, plodiny, stroje, recepty ve frontách, stromy) existují,
2. načtení farmy (`normalize`) nic neubere – budovy a jejich úrovně, políčka, plodiny na nich, stromy, zvířata, stroje, pracovníci, sklad, osivo, mince, úroveň, XP, dovednosti, Městečko, pozemky, fronty výroben,
3. dopočet práce týmu do „teď“ nesmaže budovy, políčka ani pracovníky, nesníží úroveň ani XP a sklad nejde pod nulu.

| Hráč | Úroveň | Budov | Políček | Pracovníků | Výsledek |
|---|---|---|---|---|---|
| #1 | 13 | 17 | 24 | 2 | OK |
| #2 | 16 | 23 | 24 | 6 | OK |
| #3 | 1 | 2 | 9 | 0 | OK (viz pozn. 1) |
| #4 | 9 | 12 | 18 | 1 | OK |
| #5 | 15 | 19 | 24 | 3 | OK |
| #6 | 7 | 9 | 12 | 0 | OK |
| #7 | 1 | 2 | 10 | 0 | OK (viz pozn. 2) |
| #8 | 1 | 2 | 8 | 0 | OK |
| #9 | 1 | 3 | 8 | 0 | OK |
| #10 | 1 | 2 | 6 | 0 | OK |
| #11 | 1 | 2 | 10 | 0 | OK |

**Farem 11, s problémem 0.** Dopočet týmu trvá nejvýš 5 ms na farmu.

Poznámky:
1. Hráč #3 má farmu od začátku – to je **plánovaný reset sezóny z v34** (proběhne jednou při prvním přihlášení po změně sezóny), ne ztráta dat.
2. Hráč #7 dostane při příštím přihlášení **plánovaný přepočet dovedností z v44** (nové tempo XP dovedností). XP Farmaření 42 → 13, úroveň dovednosti zůstává stejná (1), nic odemčeného se nezamkne.

Kontrolu jde kdykoli zopakovat (jen čte):
```bash
npx wrangler d1 execute ekofarm --remote --json --command "SELECT user_id, state FROM farms" > farms.json
node tools/farm-check.mjs farms.json && rm farms.json
```

## 2. Server
| Oblast | Stav před v49 | Co se změnilo |
|---|---|---|
| D1 | zdravá, dotaz 1,5 ms, 155 kB | beze změny |
| Časovač (cron každých 10 min) | jen upozornění (0 přihlášených zařízení) | navíc jednou za hodinu `cleanup` – smaže prošlá přihlášení (teď 0, tabulka by jinak rostla) |
| **Ztracená odpověď na mobilu** | když telefon odeslal akce a odpověď nedostal (výtah, tunel, přepnutí Wi-Fi → data), poslal je znovu a server je **provedl podruhé** (u nákupu, prodeje, výroby) | **klíč dávky `b`**: klient posílá s každou dávkou náhodný klíč a při opakování stejný; server si pamatuje posledních 8 klíčů (`farm.bk`) a opakovanou dávku neprovede – vrátí aktuální stav s `dup: true`. Samotný `tick` klíč nemá (nic neukládá). Starší klient bez klíče funguje jako dřív. |
| Hlavičky statických souborů | vše `max-age=0, must-revalidate` → každé otevření hry ověřovalo každý skript a styl | `public/_headers`: `/js/*`, `/css/*`, `/fonts/*` na rok `immutable` (adresy mají `?v=49` – každé vydání má nové); `/img/*` hodina (+ den `stale-while-revalidate`); `/`, `/index.html`, `/sw.js` vždy ověřit (`no-cache`); manifest hodina; všude `nosniff` a `Referrer-Policy: same-origin` |
| Service worker | při chybějícím obrázku mohl dostat starou kopii z mezipaměti prohlížeče | `fetch(…, { cache: 'no-cache' })` – po zvýšení `IMG_CACHE` vždy čerstvá grafika (ověří se jen ETag) |

## 3. Telefon a prohlížeč – výkon
Měřeno v Chromiu (Playwright + CDP `Performance.getMetrics`), telefony se **4× zpomaleným procesorem** (simulace slabšího telefonu), 20 s, farma s budovami a pracovníky. Číslo = podíl času, kdy procesor pracuje na hře.

| Zařízení | Hra jen běží (v48 → v49) | Otevřené okno výrobny (v48 → v49) |
|---|---|---|
| Android (Pixel 7) | 94 % → **39 %** | 92 % → **37 %** |
| iPhone 13 | 79 % → **32 %** | – |
| PC (prohlížeč) | 41 % → **11 %** | – |

Posouvání a přibližování farmy dál běží plnou rychlostí (60 snímků/s).

Co to dělá:
- **Snímková frekvence podle potřeby** (`frameGap` v `main.js`): 60 snímků/s při dotyku, posouvání, stavění, létajících číslech a návštěvě; 30 snímků/s, když někdo na farmě chodí nebo prší; jinak asi 15 snímků/s; při rybaření (vlastní okno) 4 snímky/s. Každý dotek, kolečko myši nebo klávesa zapne plnou rychlost na 1,5 s.
- **Okno se nepřekresluje zbytečně**: odpočty se obnovují každou sekundu, ale HTML okna se přepíše jen tehdy, když se opravdu změnilo.
- **Na pozadí nic neběží**: zamčený telefon nebo skrytá karta = žádné dotazy na chat, žádný výpočet týmu, žádné překreslování okna ani tečky Centra. Po návratu se hned načte stav ze serveru a chat.
- **Odeslání před zamčením**: když hráč něco udělá a hned zamkne telefon nebo přepne aplikaci, akce odejdou okamžitě (`visibilitychange` / `pagehide`) a s `keepalive`, takže doběhnou, i když systém stránku uspí nebo zavře. Dřív čekaly 350 ms a iOS je mohl uspat.

## 4. iPhone, Android a PC – drobnosti
- **iPhone**: `apple-mobile-web-app-status-bar-style` (průhledný horní pruh po přidání na plochu), `apple-mobile-web-app-title` „EKOfarm“, `format-detection` (čísla se neberou jako telefon), `color-scheme: light`.
- **Android**: manifest s `id`, popisem, jazykem `cs`, `scope`, kategorií a **ikonami „maskable“** (192 a 512 px) – ikona na ploše už se neořízne do kolečka s bílým okrajem.
- **PC**: klávesnice – šipky nebo WASD posouvají farmu, `+` / `-` přibližují. Nefunguje při psaní do políček, v otevřeném okně, při rybaření a na přihlášení.

## 5. Testy
| Test | Výsledek |
|---|---|
| `npm test` | 277/277 (nové `test/v49.test.js`, V01–V08) |
| V01–V02 klíč dávky | opakovaná dávka se neprovede podruhé; pamatuje se posledních 8; samotný tick se neukládá; bez klíče jako dřív |
| V03 úklid | smaže jen prošlá přihlášení |
| V04 hlavičky | kód na rok, obrázky hodina, stránka a sw.js vždy čerstvé; všechny skripty a importy mají `?v=` |
| V05 manifest | maskable ikony existují a mají uvedenou velikost |
| V06 pozadí | odeslání při `pagehide` a skrytí, chat jen na popředí, `keepalive` |
| V07 `farm-check` | správná farma OK, chybějící ID se pozná (kód 1) |
| v48 kontrola v prohlížeči (`tools/ui-check-v48.cjs`) | 32/32 – okno výrobny po změnách vykreslování funguje dál |
| Online hra v iPhonu 13 (dev-server, Playwright) | ztracená odpověď → druhý pokus se **stejným klíčem**, na serveru 1 nové políčko (ne 2); akce při zamčení odešla do 150 ms; 25 s na pozadí 0 dotazů na chat; žádná chyba v konzoli |

## 6. Co ověřeno není
- Fyzický iPhone a Android telefon (měřeno v emulaci se zpomaleným procesorem).
- Hlavičky `_headers` začnou platit až po nasazení (`npx wrangler deploy`).
- Při posouvání se farma kreslí celá každý snímek – další zrychlení (předkreslení terénu) by bylo větší zásah, zatím nebylo potřeba.
