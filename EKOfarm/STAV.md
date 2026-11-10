# EKOfarm – stav projektu a mapa kódu

Mobilní farma ve stylu Hay Day pro kamarády. Hraje se v prohlížeči (dá se přidat na plochu), později se zabalí do aplikace pro Android a iOS přes Capacitor. Server: Cloudflare Worker + D1, stejně jako u Areny.

## Verze
- **v1 (10. 11. 2026)**: registrace a přihlášení, farma 14×14, 6 polí, 4 plodiny, setí a sklizeň tažením prstu, sklad (50 míst), prodej, úrovně 1–15, nákup dalších polí, posouvání a přibližování prsty.
- **v2 (10. 11. 2026)**: farma 16×16. Obchod se 4 záložkami (Budovy, Zvířata, Ozdoby, Farma). Stavění a přesouvání přes „ducha“ s potvrzením ✓. Výrobní budovy Krmivárna, Pekárna a Mlékárna s frontou 3 výrobků. Ohrady Kurník (slepice → vejce) a Kravín (krávy → mléko). 5 ozdob, rozšíření skladu. Klepnutí na budovu vybere hotové a nakrmí zvířata, jinak otevře panel.
- **v3 (10. 11. 2026) – první nasazení**: mřížka 17×17, **Statek** 3×3 pevně uprostřed (7,7), **Sklad** zdarma k umístění (`farm.pending`), tlačítko **Stavět** se všemi budovami (zamčené podle úrovně), Obchod = Zvířata / Stroje / Farma, **Traktor** (`sowAll`) a **Kombajn** (`harvestAll`), **přihlášení přes Google** (registrace, přihlášení, propojení účtu), přehled licencí `AUTORSKA_PRAVA.md`.

- **v4 (10. 11. 2026)**: nová farma začíná bez polí – **6 polí zdarma** kamkoliv (úvod: sklad → 6 polí), pak **+6 polí za úroveň** (od 7. pole 15 🪙, každé další +5). **Sady** od úrovně 3 (2 za úroveň nad 2, cena 30 + 20 × počet) s **5 stromy** (jabloň, hrušeň, švestka, třešeň, meruňka) – plodí opakovaně, pak doslouží a vykope se. **Zakázky** ve Statku (6 míst, platí o 30–70 % víc než výkup, zrušení = nová za 3 min, deterministický generátor `farm.seed`). Bublina 📦 nad statkem, když jde něco doručit.

## Ekonomika (v4)
- **Utrácení:** osivo při setí, sazenice stromů, budovy, zvířata, stroje, pole od 7. kusu, sady, rozšíření skladu.
- **Příjem:** výkup ve skladu (základní cena `price`) a zakázky (1,3–1,7× hodnota + XP).
- Plodiny (osivo → 2 kusy): pšenice 1 → 2×3, kukuřice 3 → 2×8, mrkev 5 → 2×12, sója 8 → 2×18.
- Stromy (sazenice → úrody): jabloň 40 → 4×3 🍎 à 10, hrušeň 60 → 4×3 à 14, švestka 80 → 4×4 à 12, třešeň 120 → 4×4 à 18, meruňka 160 → 5×4 à 20.

## Mapa kódu
| Soubor | Co dělá |
|---|---|
| `public/js/rules.js` | Herní pravidla, sdílí je server i prohlížeč: `CROPS`, `PRODUCTS`, `FRUITS`, `TREES`, zakázky (`genOrder`, `orderableItems`, akce `deliver`/`discard`), sady (`plantTree`/`harvestTree`/`clearTree`), `ITEMS`, `RECIPES`, `BUILDINGS` (factory/pen/deco), `ANIMALS`, `LEVEL_XP`; `applyAction()` (plant, harvest, buyPlot, sell, place, move, produce, collect, feed, buyAnimal, upgradeSilo); `normalize()` doplní staré farmy |
| `src/worker.js` | API: `/api/register`, `/api/login`, `/api/logout`, `GET /api/config`, `POST /api/google` (mode login/link), `GET /api/state`, `POST /api/actions` (dávka akcí, max 50). Čas a výsledek určuje server. |
| `src/google.js` | Ověření Google ID tokenu (RS256, klíče Googlu, aud/iss/exp); `GOOGLE_CLIENT_ID` je ve `wrangler.toml` [vars] |
| `schema.sql` | Tabulky D1: `users` (heslo nebo `google_sub`), `sessions`, `farms` (stav farmy jako JSON + `version` proti souběhu) |
| `public/js/api.js` | Spojení se serverem, plus lokální režim pro testovací verzi (`window.EKO_LOCAL`) |
| `public/js/render.js` | Izometrické kreslení na canvas: tráva, plot, stromy, pole, rostliny, řazení podle hloubky, bublina s časem, plovoucí texty |
| `public/js/objects.js` | Kreslení budov (dům se střechou, kouř), ohrad se zvířaty, ozdob a „ducha“ při stavění |
| `public/js/panels.js` | HTML panelů: obchod, výrobní budova, ohrada, ozdoba, sklad (tlačítka `data-act`) |
| `public/js/main.js` | Herní smyčka, dotyk (tah, pinch, setí/sklizeň tažením, posun ducha), režim stavby, obsluha panelů, fronta akcí a synchronizace |
| `public/index.html`, `public/css/style.css` | Obrazovky a vzhled UI |
| `tools/build-artifact.mjs` | Sestaví testovací verzi do jednoho souboru `build/ekofarm-artifact.html` |
| `tools/dev-server.mjs` | Lokální server s SQLite v paměti (pro vývoj) |
| `test/` | `npm test`: pravidla, API nad SQLite, Google přihlášení s testovacími klíči |

## Jak to funguje
- Klient provede akci hned u sebe (okamžitá odezva). Akce posílá po dávkách každých ~350 ms, server je přepočítá a vrátí skutečný stav. Neodeslané akce se pak znovu použijí nad stavem ze serveru.
- Růst se počítá z času zasazení (ms) a času serveru, takže plodiny rostou i se zavřenou hrou a posunutí hodin v telefonu nepomůže.
- U sklizně má server toleranci 2 s kvůli rozdílu hodin.

## Server
https://ekofarm.xxarenaxx.workers.dev (Codespace repo `dracek2020/Ekofarm`, složka `EKOfarm`; Google přihlášení zatím nenastaveno – uživatel ho odložil)

## Testovací verze
https://claude.ai/artifact/YSqsiMDRFJ1iyfj4KzKrsh (aktualizuje se publikováním `build/ekofarm-artifact.html` na stejnou adresu)

## Další kroky (návrh)
- Kamarádi – návštěvy farem a stánek pro obchod mezi hráči.
- Před vydáním: vlastní ikony místo emoji (viz `AUTORSKA_PRAVA.md`), zvuky, push notifikace, aplikace přes Capacitor.
- Licence: vše vlastní, každý nový asset zapsat do `AUTORSKA_PRAVA.md`.
