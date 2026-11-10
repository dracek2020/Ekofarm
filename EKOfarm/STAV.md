# EKOfarm – stav projektu a mapa kódu

Mobilní farma ve stylu Hay Day pro kamarády. Hraje se v prohlížeči (dá se přidat na plochu), později se zabalí do aplikace pro Android a iOS přes Capacitor. Server: Cloudflare Worker + D1, stejně jako u Areny.

## Verze
- **v1 (10. 11. 2026)**: registrace a přihlášení, farma 14×14, 6 polí, 4 plodiny, setí a sklizeň tažením prstu, sklad (50 míst), prodej, úrovně 1–15, nákup dalších polí, posouvání a přibližování prsty.
- **v2 (10. 11. 2026)**: farma 16×16. Obchod se 4 záložkami (Budovy, Zvířata, Ozdoby, Farma). Stavění a přesouvání přes „ducha“ s potvrzením ✓. Výrobní budovy Krmivárna, Pekárna a Mlékárna s frontou 3 výrobků. Ohrady Kurník (slepice → vejce) a Kravín (krávy → mléko). 5 ozdob, rozšíření skladu. Klepnutí na budovu vybere hotové a nakrmí zvířata, jinak otevře panel.
- **v3 (10. 11. 2026) – první nasazení**: mřížka 17×17, **Statek** 3×3 pevně uprostřed (7,7), **Sklad** zdarma k umístění (`farm.pending`), tlačítko **Stavět** se všemi budovami (zamčené podle úrovně), Obchod = Zvířata / Stroje / Farma, **Traktor** (`sowAll`) a **Kombajn** (`harvestAll`), **přihlášení přes Google** (registrace, přihlášení, propojení účtu), přehled licencí `AUTORSKA_PRAVA.md`.

- **v4 (10. 11. 2026)**: nová farma začíná bez polí – **6 polí zdarma** kamkoliv (úvod: sklad → 6 polí), pak **+6 polí za úroveň** (od 7. pole 15 🪙, každé další +5). **Sady** od úrovně 3 (2 za úroveň nad 2, cena 30 + 20 × počet) s **5 stromy** (jabloň, hrušeň, švestka, třešeň, meruňka) – plodí opakovaně, pak doslouží a vykope se. **Zakázky** ve Statku (6 míst, platí o 30–70 % víc než výkup, zrušení = nová za 3 min, deterministický generátor `farm.seed`). Bublina 📦 nad statkem, když jde něco doručit.

- **v5 (10. 11. 2026)**: **Prodejna strojů** (tlačítko 🚜 Stroje vlevo nahoře): Traktor Brázda 60 (úr. 3, 250 🪙, 6 políček/min), Brázda 120 (úr. 7, 900, 12/min), Kombajn Klas 4 (úr. 5, 600, 6/min), Klas 8 (úr. 9, 1800, 12/min). Stroje jsou v garáži (`farm.machines`), staré traktory/kombajny z mapy se převedou. **Velké pole** od úrovně 5 (Stavět): velikost 3×3 až 6×6 si hráč zvolí ↔/↕, 8 🪙 za políčko, počet 1 + 1 za každé 3 úrovně nad 5. Setí traktorem a sklizeň (obilí, kukuřice, sója = kombajn; mrkev = traktor) trvají podle rychlosti stroje; stroj je vidět, jak jezdí po řádcích s prachem. Úroda čeká na poli a odveze se do skladu klepnutím (po částech, když je sklad plný). Malá pole stroje obslouží z prodejny (Zasít vše / Sklidit vše).

- **v6 (10. 11. 2026) – oprava**: ve v5 omylem zmizely panely výroby, ohrady a ozdoby (`factoryHtml`, `penHtml`, `decoHtml`) → hra se v prohlížeči nenačetla. Vráceno. Přidány testy `imports.test.js` (každý import existuje) a `panels.test.js` (každý panel se vykreslí), čísla verzí v adresách skriptů (`?v=N`, proti staré kopii v prohlížeči) a hláška „Hra se nenačetla“ s tlačítkem místo věčného načítání.

- **v7 (10. 11. 2026)**: plodiny brambory (4), řepka (6), slunečnice (7), cukrová řepa (8); budovy Mlýn (mouka), Olejna (olej), Cukrovar (cukr), recept Buchty; nářadí v prodejně: **Pluh** (zorané pole +50 % úrody), **Secí stroj** (setí 2× rychleji), **Lis** (po obilí sláma → balíky); stavy velkého pole `raw/stubble/plowed/sown`, úlohy `plow/sow/harvest/bale`, úroda a balíky čekají v `o.load`. **Denní odměna** (7 dní, `claimDaily`), **úkoly** se 3 stupni (`ACHIEVEMENTS`, statistiky `farm.stats`), **žebříček** (`GET /api/leaderboard`), **tržní ceny** výkupu 0,7–1,4× měněné po 4 h (`marketMult`, stejné na serveru i v prohlížeči). **Vlastní SVG ikony** (`icons.js`, v textu `:klic:` → `iconize()`), **zvuky** přes WebAudio (`sfx.js`), **den a noc** podle hodin (vypínatelné v Menu). Tlačítko Úkoly s červenou tečkou.

- **v8 (10. 11. 2026)**: **dokupování pozemků**. Základ 17×17 (0..16), kolem něj 8 pozemků (`LAND_PARCELS`: 4 boční 17×8/8×17, 4 rohové 8×8; svět `WORLD` −8..24). Cena a úroveň podle pořadí (`LAND_PRICES` 1500…25000, `LAND_LEVELS` 5…12), rohový jde koupit, až je koupený některý sousední (`needs`). `farm.land` = koupené id; `landOwned()` hlídá stavění ve `fits()`. Nekoupená země je tmavší louka se stromy a cedulí „Na prodej“, plot se kreslí jen po hranici vlastní země. Klepnutí na cizí pozemek nebo Stavět → Pozemky otevře panel s mapkou 3×3.

- **v9 (10. 11. 2026) – velká aktualizace**: 20 plodin (13 zelenin + jahody, meloun; `look` = tvar kreslení), sad se 13 stromy a keři (`TREES.kind` tree/bush), 15 ovocí, zvířata prase a ovce, výrobny Konzervárna, Džusárna, Marmeládárna, Uzenářství, Textilka (celkem 43 receptů; **ceny výrobků se dopočítají z receptů**, test hlídá, že se každá plodina někde použije). **Úrovně budov 1–10** (`upgradeCost` = mince + 2–3 suroviny deterministicky, `upgradeEffect`), Statek odemyká budovy (`BUILDINGS.st`, `STATEK_LEVELS`), ostatní budovy max. úroveň Statku. **Stodola** (`garage`, místa 1+úroveň, prodej strojů za 50 %), **Prodejna strojů** a **Stánek** jsou budovy (automaticky umístěné, `placeNear`), tlačítko Stroje nahradily **Novinky** (`news.js`). **Stánek**: nabídka z `stallOffers` po 2 h. **Pomocník** (`hire`, `runHelper` – pravidelná kola každých 20 s / 10 s s motykou, 2 políčka + kolečko + traktor). **Farmář a pomocník** chodí po farmě (`drawPerson`, jen vizuálně). Bohatá úroda 8 %, výkup ve skladu 50 %. Úrovně hráče do 20. Přehled cen: `EKONOMIKA.md` (`node tools/economy.mjs`).

- **v10 (10. 11. 2026) – městečko a obchod mezi hráči**: **prašná cesta** (`isRoad`: |x−y| ≤ 1 od rohu farmy 17,17 až na kraj mapy, na cestě se nestaví – `fits`) vede do **městečka** (`TOWN` 20..40, náměstí `PLAZA`, ozdobné domky `TOWN_HOUSES`). Budovy městečka mají pevné místo (`TOWN_BUILDINGS`, 3×3): **Stánek**, **Prodejna strojů**, nové **Tržiště hráčů** (typ `market`). Nejsou ve `farm.objects`; jejich úroveň je ve `farm.town` (staré prodejny/stánky z farmy se převedou v `normalize`), objekt pro kreslení/panel dává `townObject()`, vylepšení akcí `upgrade` s `town`. Tlačítko **Městečko** vpravo nahoře přesune kameru. **Tržiště hráčů**: zboží nebo stroj se vystaví za 1–3× běžné ceny (`marketTake`, max `MARKET_SLOTS` = 8), je v úschově v tabulce `market`; koupě `marketGive` + záznam v `market_sales`; prodávající dostane mince při dalším `GET /api/state` nebo `/api/actions` (`paySales`, `res.sales` → hláška). Vše v jedné D1 transakci (`saveFarm` + `env.DB.batch`, podmínka `farm.tx`). **Semena** `s_<plodina>` (Semenárna: 2 plodiny → 3 balíčky, `recipe.qty`) a **sazenice** `z_<strom>` (Školka: 3 plody → 1); sázení (`payCrop`) bere nejdřív semena, pak mince (i pomocník a velké pole). Nové výrobky chléb se semínky, pražená semínka, dýňový olej. **8 denních úkolů** (`dailyQuests`, `farm.quests` = den, výchozí statistiky, seznam; `claimQuest` i bonus), nové statistiky `plant` a `feed`. **Úroveň hráče** roste do 200 (`LEVEL_XP` generované) a budovy **odemyká jen Statek** (`BUILDINGS.st` 1–7, `STATEK_LEVELS` zrušeno); limity podle statku: pole 6 + 6×st, sady 2×st, velká pole od st 3. **Žebříček podle úrovně** s tlačítkem **Navštívit** (`GET /api/visit?name=`, režim `game.visit` jen na koukání).

## Postup vydání nové verze
1. `node tools/version.mjs N` (N = číslo balíčku), 2. `npm test`, 3. `npm run build:artifact` + test v prohlížeči **online přes `tools/dev-server.mjs`** (nejen testovací verzi), 4. zip jen změněných souborů + `NASAZENI_vN.md`.

## Ekonomika (v4)
- **Utrácení:** osivo při setí, sazenice stromů, budovy, zvířata, stroje, pole od 7. kusu, sady, rozšíření skladu.
- **Příjem:** výkup ve skladu (základní cena `price`) a zakázky (1,3–1,7× hodnota + XP).
- Plodiny (osivo → 2 kusy): pšenice 1 → 2×3, kukuřice 3 → 2×8, mrkev 5 → 2×12, sója 8 → 2×18.
- Stromy (sazenice → úrody): jabloň 40 → 4×3 🍎 à 10, hrušeň 60 → 4×3 à 14, švestka 80 → 4×4 à 12, třešeň 120 → 4×4 à 18, meruňka 160 → 5×4 à 20.

## Mapa kódu
| Soubor | Co dělá |
|---|---|
| `public/js/rules.js` | Herní pravidla, sdílí je server i prohlížeč: `CROPS`, `PRODUCTS`, `FRUITS`, `TREES`, zakázky (`genOrder`, `orderableItems`, akce `deliver`/`discard`), sady (`plantTree`/`harvestTree`/`clearTree`), `ITEMS`, `RECIPES`, `BUILDINGS` (factory/pen/deco), `ANIMALS`, `LEVEL_XP`; `applyAction()` (plant, harvest, buyPlot, sell, place, move, produce, collect, feed, buyAnimal, upgradeSilo); `normalize()` doplní staré farmy |
| `src/worker.js` | API: `/api/register`, `/api/login`, `/api/logout`, `GET /api/config`, `POST /api/google` (mode login/link), `GET /api/state`, `POST /api/actions` (dávka akcí, max 50), `GET /api/leaderboard`, `GET /api/visit`, `GET /api/market`, `POST /api/market/list|cancel|buy`. Čas a výsledek určuje server; `saveFarm` ukládá farmu a další příkazy v jedné transakci. |
| `src/google.js` | Ověření Google ID tokenu (RS256, klíče Googlu, aud/iss/exp); `GOOGLE_CLIENT_ID` je ve `wrangler.toml` [vars] |
| `schema.sql` | Tabulky D1: `users` (heslo nebo `google_sub`), `sessions`, `farms` (stav farmy jako JSON + `version` proti souběhu), `market` (nabídky tržiště), `market_sales` (prodeje, `paid`) |
| `public/js/api.js` | Spojení se serverem, plus lokální režim pro testovací verzi (`window.EKO_LOCAL`) |
| `public/js/render.js` | Izometrické kreslení na canvas: tráva, plot, stromy, pole, rostliny, řazení podle hloubky, bublina s časem, plovoucí texty |
| `public/js/objects.js` | Kreslení budov, ohrad se zvířaty, ozdob, sadů, velkého pole se stroji (`drawVehicle`, `drawBigField`) a „ducha“ při stavění |
| `public/js/icons.js` | Vlastní SVG ikony (`ICONS`), `ic()`, `iconize()` pro text s `:klic:`, `drawIcon`/`drawIconText` pro canvas |
| `public/js/news.js` | Novinky pro hráče (`NEWS`, nejnovější nahoře) |
| `public/js/sfx.js` | Zvuky skládané v prohlížeči (WebAudio), zapnutí/vypnutí |
| `public/js/panels.js` | HTML panelů: Stavět, obchod, prodejna strojů (`dealerHtml`), velké pole (`bigfieldHtml`), statek se zakázkami, sad, výroba, ohrada, sklad (tlačítka `data-act`) |
| `public/js/main.js` | Herní smyčka, dotyk (tah, pinch, setí/sklizeň tažením, posun ducha), režim stavby, obsluha panelů, fronta akcí a synchronizace |
| `public/index.html`, `public/css/style.css` | Obrazovky a vzhled UI |
| `tools/build-artifact.mjs` | Sestaví testovací verzi do jednoho souboru `build/ekofarm-artifact.html` |
| `tools/dev-server.mjs` | Lokální server s SQLite v paměti (pro vývoj); náhrada D1 je v `tools/fake-d1.mjs` (i pro testy) |
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
- Kamarádi: seznam přátel, pomoc na cizí farmě při návštěvě, zprávy.
- Push notifikace (potřebují server s časovačem a klíče VAPID), kamarádi a stánek, aplikace přes Capacitor.
- Licence: vše vlastní, každý nový asset zapsat do `AUTORSKA_PRAVA.md`.
