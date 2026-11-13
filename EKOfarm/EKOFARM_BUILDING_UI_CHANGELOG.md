# EKOfarm v48 – správa budov: okno výrobny, ruční výroba vedle týmu

13. 11. 2026 · větev `budovy` · záloha: tag `zaloha-pred-budovami` + větev `zaloha-v47` (= v47), zip `ZALOHA_EKOfarm_v47.zip` · `CLIENT_MIN` 48, verze aplikace 48, `RULES_VERSION` beze změny (23).

Zadání: balíček `EKOfarm_UI_sprava_budov_pro_Claude` (01_ZADANI/MASTER_PROMPT_PRO_CLAUDE.md, etapy A–F). Testy: `EKOFARM_BUILDING_UI_TEST_REPORT.md`. Grafika a původ: `EKOFARM_BUILDING_UI_ASSET_AUDIT.md`.

## Stav po etapách

| Etapa | HOTOVO | OTESTOVÁNO | ZBÝVÁ |
|---|---|---|---|
| A – průzkum | mapa kódu, dat a akcí níže; rozdíly proti návrhu | – | – |
| B – komponenty UI | hlavička budovy, 4 záložky, karta receptu s posuvníkem a −/+, cílová zásoba, souhrn, upozornění, ruční fronta, pás týmu, suroviny, patní akce; telefon i tablet (2 sloupce od 760 px) | Playwright: 320 / 390 / 412 px a 1180 × 820, bez přetečení, dotykové cíle ≥ 40 px, klávesnice, omezený pohyb | test na fyzickém iPhonu a Androidu |
| C – ruční výroba při zaměstnanci | vlastní místa ruční fronty, jedna výrobní linka, ruční dávka předběhne nezačaté dávky týmu, tým neodnáší ruční výrobky, idempotentní klíč, počet dávek | testy U01–U15, U26, U28–U31 + hlavní akceptace v prohlížeči | – |
| D – plán a data | Automaticky (procenta, cíl, odhad/h nominální i efektivní, stav, Uložit plán s verzí), Vyrobit sám (filtr, suroviny a rezervy, čas, „hotovo asi za“, Zařadit), Suroviny (sklad, rezerva, pro tým, spotřeba/h, výdrž, zdroj, kapacita skladu) | U17, U19–U21, prohlížeč | – |
| E – další budovy | společná hlavička pro ohradu, včelín, rybník, sad, velké pole a domky s vlastním stavem; v ohradě karta „Postarat se sám“; rybník dál otevírá minihru v47; sklad a Statek beze změny (žádná falešná fronta) | U24, U25, prohlížeč (kurník, včelín, rybník, chatrč) | záložky Přehled/Tým i pro ohrady a oblasti polí (zatím jen hlavička + stávající obsah); Strojník na velkém poli není (a není předstírán) |
| F – QA a vydání | testy, report, náhled, dokumenty, nasazení | 269 testů, 32/32 bodů (viz report) | kalibrace s hráči |

## A – co hra skutečně měla (v47) a co z toho plyne

| Oblast | Kde | Skutečnost ve v47 |
|---|---|---|
| Fronta výrobny | `rules.js`: `o.queue`, `queueSize(o)` = 3 + (úroveň − 1) / 3, `queueRecipe`, `queueState`, akce `produce`, `collect` | **Jedna fronta pro hráče i tým.** Dávka týmu má `t: 1` a `n` kusů (síla obsluhy), ruční je bez `t`. Dávky jdou po sobě (jedna linka, konec = konec předchozí + doba). Suroviny se berou **při zařazení**. |
| Tým ve výrobně | `rules.js`: `JOBS.factory`, `factoryPick`, `takeFor`, `finishJob` (`load`, `haul`), `crewPower`, `bldCap` | Řemeslník nakládá do **volných míst téže fronty** → když ji zaplnil, hráč ruční výrobu nezařadil (`queue_full`). Hotové odnášel **všechno** včetně ručních dávek (za ruční pak hráč dostal jen ¼ XP). |
| Plán týmu | akce `plan`, `planTarget`, `planOrder`, `planAuto`; `o.plan` (% času), `o.target` (cíle v pořadí), `o.auto`, `o.used` | Každý krok −/+ byla hned serverová akce, bez verze → dvě zařízení si mohla změny tiše přepsat. |
| Cílové zásoby | `stockOf(farm, o, id)` | Počítá sklad + celou frontu (i ruční dávky) + rozpracované naložení → ruční výstupy se do cíle **už započítávaly** (zachováno). |
| Rezervy | `farm.keep`, `keepOf`, `availFor`, `hasInputsKeep` | Rezerva chrání jen automatiku a skladníka; ruční výroba smí vzít i rezervu (původní chování – zachováno, v UI je to vidět). |
| Offline tým | `runVillagers` (před každou akcí v `applyAction0`), `VILL_BUDGET`, `villLag` | Jedna dopočítávací smyčka na serveru i v prohlížeči; nová druhá smyčka nevznikla. |
| Server | `src/worker.js`: `POST /api/actions` (dávka akcí, optimistické zamykání verze řádku farmy, 3 pokusy), `GET /api/state` | Akce jedné farmy jdou postupně → souběh je serializovaný. Opakovaný požadavek po výpadku sítě se ale znovu provedl (ruční výroba by se zdvojila) → nový klíč `k`. |
| Okno výrobny | `panels.js`: `factoryHtml`, `workerBlock`, `factoryPlan`; `main.js`: `renderPanel` | Sloty + seznam receptů + tým a plán pod sebou v jednom dlouhém okně. |
| Ostatní budovy | `penHtml`, `hiveHtml`, `pondHtml`/`pondHtml2`, `orchardHtml`, `bigfieldHtml`, `houseHtml` | Vlastní akce (krmení, sběr, rybaření, setí); ruční krmení a sběr šly i s chovatelem. |

**Rozdíly proti návrhu (obrázku):** Pekárna na úrovni 1 má místo pro **1** pracovníka (od úrovně 4 pro 2, od 7 pro 3, na 10 pro 4) – obrázek ukazuje 2/3. Chléb = **3× pšenice**, 5 min, 1 kus, 3 XP (obrázek ukazuje mouku). Žádné diamanty, ceny ani „kg“ z obrázku. Čísla v okně jsou vždy z pravidel hry.

**Rizika a jak jsou ošetřená:** zdvojení ruční dávky po výpadku sítě (klíč `k`, posledních 12 klíčů u budovy); tým by odnesl ruční výrobky (nově je nechá hráči); tým by zablokoval ruční frontu (vlastní místa); přepsání plánu z druhého zařízení (verze `pv`); dvojí kapacita budovy (jedna linka – ruční dávka jen předběhne nezačaté dávky týmu, čas se nezdvojí).

## Datový model (žádná migrace databáze)
Farma je JSON v D1 (`farms.state`). Nová nepovinná pole:

| Pole | Význam |
|---|---|
| `o.queue[i].t` | **existující** značka zdroje: `t: 1` = tým (worker), bez `t` = hráč (manual) – staré fronty jsou tím rozlišené přesně, nic se nehádá |
| `o.mk` | posledních 12 klíčů ručního zařazení (idempotence) |
| `o.pv` | verze plánu výrobny (zvyšuje `planSave` i staré akce plánu) |

Nové akce: `produce` přijímá `n` (počet dávek, 1 … velikost fronty) a `k` (klíč); `planSave` { id, pv, plan, target, auto }. Chyba `plan_conflict`.

## Pravidla souběhu (server i prohlížeč – stejný `rules.js`)
1. Ruční fronta má `queueSize(o)` míst jen pro hráčovy dávky; tým má stejný počet míst pro svoje. Výroba je jedna linka (dávky jdou po sobě).
2. Ruční dávka se zařadí za rozpracované dávky a za předchozí ruční, **před dávky týmu, které ještě nezačaly** (ty se posunou). Hráčova dávka tak nečeká na celou frontu týmu a čas linky se nezdvojí.
3. Suroviny se berou při zařazení (jako dřív) – stejný kus nemůže použít tým ani skladník.
4. Tým odnáší jen svoje hotové dávky; hráč vyzvedne všechno hotové (svoje i týmu). XP: ruční dávka plné XP a Vaření, dávka týmu hráči ¼ a pracovníkům profesní XP – za jednu dávku nikdy obojí.
5. Cílová zásoba počítá i ruční dávky ve frontě → tým nevyrábí přes cíl; ruční dávky se nikdy nezruší ani nezmění.
6. Uložení plánu nemá vliv na ruční frontu; procenta jsou jen pracovní čas týmu.

## Zpětná cesta (rollback)
- **Přepínač:** `public/js/eco-config.js` → `building_ui_v2: false` + nové vydání (zvednout `CLIENT_MIN`, `node tools/version.mjs`). Vrátí původní okno výrobny i pravidla (jedna společná fronta, tým odnáší vše) – ověřeno testem U30 a v prohlížeči. Uložené farmy zůstanou platné (nová pole se ignorují).
- **Kód:** tag `zaloha-pred-budovami` / větev `zaloha-v47`.

## Změněné soubory
- `public/js/rules.js` – `BUI_V2`, `manualJobs`, `teamJobs`, `manualFree`, `insertManual`, `manualEta`, `produceManual`, `planSave`, verze plánu, tým odnáší jen své dávky, `CLIENT_MIN` 48.
- `public/js/panels.js` – `factoryHtml2` (hlavička, záložky, Přehled, Tým, Plán – Automaticky / Vyrobit sám, Suroviny), `bldHero` pro ostatní budovy, karta „Postarat se sám“ v ohradě, `workerBlock(…, withPlan)`, nápověda.
- `public/js/main.js` – vykreslení nového okna, koncept plánu `bvDraft`/`bvEdit`, akce `bv*`, posuvník, varování před zavřením s neuloženým plánem.
- `public/css/style.css` – sekce v48.
- `public/js/eco-config.js` – přepínač `building_ui_v2`. `public/js/news.js` – novinky v48.
- Ostatní `public/js/*.js`, `index.html` – jen číslo verze v adresách (`tools/version.mjs 48`).
- Testy: `test/v48.test.js` (U01–U32), `test/fixtures/v47-ceny.json` (ceny a recepty v47), `test/fixtures/flags-off.mjs` (režim `v48`).
- Nástroje: `tools/ui-check-v48.cjs`, `tools/test-report-v48.mjs`.
- Dokumenty: tento soubor, `EKOFARM_BUILDING_UI_TEST_REPORT.md`, `EKOFARM_BUILDING_UI_ASSET_AUDIT.md`, `STAV.md`, `AUTORSKA_PRAVA.md`, `EKOFARM_LEGAL_CHECKLIST.md`, `NASAZENI_v48.md`, `audit/ui48.json`.
