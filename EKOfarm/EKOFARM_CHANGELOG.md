# EKOfarm – changelog rozšíření ekonomiky (v46)

13. 11. 2026 · větev `rozsireni` · záloha: tag `zaloha-pred-rozsirenim` + větev `zaloha-v45` (= v45, commit 6f1034d), zip `ZALOHA_EKOfarm_v45.zip` · `CLIENT_MIN` 46, verze aplikace 46, `RULES_VERSION` beze změny (23 – nová pole farmy jsou volitelná).

Zadání: balíček `EKOfarm_kompletni_rozsireni_pro_Claude` (MASTER_PROMPT_PRO_CLAUDE.md, etapy A–G). Mapa ID a odchylky: `EKOFARM_CONTENT_MAP.md`. Testy: `EKOFARM_TEST_REPORT.md`. Ekonomika: `EKOFARM_ECONOMY_AUDIT.md/.csv`, `EKOFARM_PRICE_PROPOSAL.csv`. Grafika a práva: `EKOFARM_LEGAL_ASSET_CHECK.md`.

## Přepínače (feature flags)

Soubor `public/js/eco-config.js` – jediné místo pro přepínače i všechna nová čísla (recepty, časy, Statek, Vaření, výnosy vedlejších produktů, sláma, ocenění, limity plánovače). Server i prohlížeč čtou stejný soubor, změna = nové vydání. Vypnutá skupina v pravidlech vůbec není (hra je přesně jako v45 – test E11 porovnává obsah se snímkem `test/fixtures/v45-obsah.json`).

| Skupina | Etapa | Ve v46 | Co zapíná |
|---|---|---|---|
| `eco_recipes` | B | zapnuto | 13 receptů pro současné plodiny |
| `eco_planner` | C | zapnuto | Plán výroby (Řídicí centrum + tlačítko ve výrobně), akce `planApply`, skladník nesahá na zboží pro cílové zásoby |
| `eco_byproducts` | D | zapnuto | 4 vedlejší produkty + 4 alternativní krmné směsi; platí pro dávky od `ECO_FROM` (13. 11. 2026 00:00 UTC) |
| `eco_straw` | D | zapnuto | Podestýlka ze slámy (jednorázové dobrovolné vylepšení ohrady) |
| `eco_crops` | E | zapnuto | Oves, len, petržel, kopr + 11 receptů a ovesná krmná směs |
| `eco_mastery` | F | zapnuto | 3 mistrovské recepty (Vaření 25/30/40) a ocenění Mistr údolní kuchyně (Vaření 50) |

Všechny skupiny jsou zapnuté, protože testy bilance a skladu jsou zelené a grafika je hotová (test D11 hlídá, že zapnutá skupina má všechny obrázky). **Bezpečné zapínání po skupinách** (když by se něco pokazilo): v `ECO_FLAGS_DEFAULT` nechat zapnuté jen `eco_recipes` + `eco_planner`, po ověření přidat `eco_byproducts` + `eco_straw`, pak `eco_crops`, nakonec `eco_mastery`. Vypnutí je zpětně bezpečné: předměty, dávky a osivo neznámých položek se přesunou do `farm.hold` a po zapnutí se vrátí (test B08).

## Etapa A – audit

- `tools/eco-audit.mjs` → `EKOFARM_ECONOMY_AUDIT.csv` (všechny recepty a suroviny, strojově) a `.md` (souhrn, před/po). Snímek „před“ z v45: `audit/pred.json`, „po“: `audit/po.json`.
- Potvrzené slabé vazby ve v45: sója od Statku 3, první recept Statek 9 (krmivo pro ovce); ředkvička a salát od Statku 1, první recept Statek 6; ořechy Statek 6 → 8; sláma bez využití; Bolen na bylinkách bez bylinek (recept nezměněn).
- Graf receptů bez cyklů, cena výrobku vždy ze vzorce `(Σ suroviny × 1,2 + minuty + 2) / kusů`.

## Etapa B – recepty pro současné plodiny

Farmářský sendvič (Pekárna, St2), Sójová mouka (Mlýn, St3), Sójový chléb (Pekárna, St4), Zeleninová pomazánka (Mlékárna, St5), Medové ořechy (Medárna, St6), Hrachová pomazánka (Konzervárna, St6), Bramboráky, Dýňové placičky (Pekárna, St7), Zelenina v oleji (Konzervárna, St7), Sójový olej (Olejna, St7), Višňový koláč (Pekárna, St4), Višňová marmeláda (Marmeládárna, St8), Ořechový krém (Cukrárna, St8). Statek a Vaření podle návrhu (kód hlídá, že recept nikdy není dřív než jeho budova a suroviny), ceny ze vzorce, XP ve stejném poměru k ceně jako dosavadní recepty. Výsledek: sója Statek 3 → 3 (dřív 9), ředkvička a salát 1 → 2 (dřív 6), ořechy bez čekání.

## Etapa C – plán výroby

- `planChain(farm, výrobek, počet, { pref, pick, orders })` v `rules.js` – čistý výpočet: rozbalí recepty, odečte zásoby nad rezervou (volitelně i zboží pro zakázky), rozpracovanou výrobu a rostoucí úrodu, zbytek vyrobí nebo hlásí jako chybějící; každý kus jen jednou; cyklus a hloubka > 12 = bezpečná chyba; volba receptu se stejným výsledkem (hráč, nebo deterministicky cena / čas / rezervy); odhad času podle obsluhy a vylepšení budovy, s vysvětlením předpokladů.
- UI: Řídicí centrum → záložka **Plán výroby**, tlačítko „Plán výroby“ v každé výrobně. Potvrzení (`planApply`) atomicky nastaví cílové zásoby výroben; vyšší dosavadní cíl zůstane.
- Skladník (`tradeRound` + `planHeld`) neprodá zboží, které výrobny drží pro cílové zásoby, ani suroviny na dávky do cíle (**změna chování týmu** – i u cílů nastavených dřív ručně).

## Etapa D – vedlejší produkty a sláma

- Otruby (1 za 5 dávek mouky), pokrutiny (1 za 4 dávky olejů – řepkový, slunečnicový, sójový, lněný), řepné řízky (1 za 4 dávky cukru), ovocné výlisky (1 za 6 dávek džusu z jablek, hrušek, višní, třešní a moštu). Počítadlo `farm.byc`, jen hotové a odnesené dávky, jen celé kusy, když se nevejdou, počkají; dávky začaté před `ECO_FROM` nebo před prvním načtením farmy ve v46 (`farm.byFrom`) se nepočítají – ani dopočet týmu za nepřítomnost před aktualizací (test E08).
- Cena = 80 % suroviny, kterou nahradí ve směsi (otruby 2, pokrutiny 16, řízky 6, výlisky 16 mincí). Do zakázek se nechtějí.
- Alternativní recepty (`recipe.out`) vyrábí existující krmivo: slepice s otrubami, prasata s pokrutinami, krávy s řepnými řízky, ovocná směs pro prasata.
- Recept ≠ výrobek: nové `recipeOut`, `recipeName`, `recipesFor`, `RECIPES_BY_OUT`; upravena fronta, odnášení, zásoby výrobny, tým, dostupnost, UI.
- Podestýlka ze slámy (`penStraw`, `o.pod`): od Statku 4, 10× sláma + 40 mincí, jednou na ohradu, krmný cyklus × 0,97. Staré ohrady se samy nemění, sláma se jinde nespotřebuje.

## Etapa E – oves, len, petržel, kopr

- Plodiny (Statek 3 / 7 / 6 / 6, růst 22 / 35 / 16 / 18 min, výnos 2, kombajn / kombajn / traktor / traktor), osivo v Semenárně (2 → 3), Stánek a zakázky až po odemčení.
- Recepty: Ovesné vločky (Mlýn), Ovesné sušenky a Třešňový ovesný koláč (Pekárna), Ovesná krmná směs (Krmivárna → krmivo pro slepice), Lněný olej (Olejna), Lněná příze, tkanina a ubrus (Textilka), Koprové okurky (Konzervárna), Bylinková rybí polévka, Kapr s petrželí a Bolen s koprem (Rybárna). Žádná nová budova (test A02: 17 výroben jako ve v45).
- Grafika: originální ikony, 3 fáze růstu a balíčky osiva (`tools/v46art.py`).

## Etapa F – mistrovské cíle

Mistrovský rybí talíř (Rybárna, Vaření 25), Slavnostní ovocný dort (Cukrárna, 30), Farmářská hostina (Uzenářství, 40); cena ze stejného vzorce (test F10). Ocenění Mistr údolní kuchyně na Vaření 50 (`farm.aw`, jen kosmetické, v Dovednostech; dosavadní hráč s Vařením 50 ho dostane při načtení). Farmaření (stroje do 38) a Rybaření (ryby do 24, udice do 30) beze změny – nové mechaniky nebyly potřeba.

## Odchylky od návrhu (zdůvodněné auditem)

- Ovesná krmná směs: návrh 2× oves + 1× kukuřice → 1 krmivo byl ztrátový (suroviny 48 mincí, krmivo 21) → **1× oves + 1× kukuřice → 2 krmiva**.
- Ovocná krmná směs pro prasata: návrh Statek 8 → **Statek 7** (prasata a jejich krmivo jsou od Statku 7, výlisky vznikají od Statku 4).
- Alternativní krmné směsi mají vlastní Vaření (4, 5, 7) – hlavní recept krmiva zůstává na Vaření 1, krmení se nikdy nezablokuje.
- Ceny nových plodin nejsou ručně: interpolace podle doby růstu mezi plodinami se stejným strojem (len mimo rozsah úměrně času).

## Data farmy (migrace, idempotentní)

Nová volitelná pole: `farm.byc` (počitadla vedlejších produktů), `farm.byFrom` (od kdy farma vedlejší produkty dostává), `farm.aw` (ocenění), `farm.hold` (odložené neznámé položky při vypnuté skupině), `o.pod` (podestýlka). `normalize` je idempotentní (test A01); starší farmy nic nepotřebují.

## Před a po (ekonomika)

| | v45 | v46 |
|---|---|---|
| Recepty / výrobky | 83 / 83 | 115 / 110 |
| Plodiny | 20 | 24 |
| Nejvyšší zisk jedné fronty za hodinu (zakázky) | 464 | 464 (beze změny) |
| Medián zisku za hodinu (zakázky) | 192 | 210 |
| Suroviny bez využití | sláma | sláma jen dobrovolně (podestýlka) |
| Cykly v grafu | 0 | 0 |

Inflace: strop příjmu se nezvýšil (nejlepší recept na každém Statku je stejný), offline se dál dopočítá nejvýš 24 h (test F06), vedlejší produkty mají hodnotu do 10 % výrobku, ze kterého vznikají (test B12).

## Změněné soubory

Kód: `public/js/eco-config.js` (nový), `public/js/rules.js`, `public/js/panels.js`, `public/js/main.js`, `public/js/news.js`, `public/css/style.css`, `public/js/assets.js` (seznam obrázků); `api.js`, `icons.js`, `objects.js`, `render.js`, `sprites.js`, `index.html` jen číslo verze `?v=46`.
Testy: `test/v46.test.js` (nový), `test/fixtures/flags-off.mjs`, `test/fixtures/v45-obsah.json` (nové), `test/rules.test.js` a `test/v38.test.js` (alternativní recepty).
Nástroje: `tools/eco-audit.mjs`, `tools/eco-docs.mjs`, `tools/test-report.mjs`, `tools/v46art.py`, `tools/v46check.py` (nové), `tools/economy.mjs`, `tools/build-artifact.mjs`.
Grafika: 52 nových souborů v `public/img/i` a `public/img/c`.
Dokumenty: tento soubor, `EKOFARM_*`, `audit/*`, `EKONOMIKA.md`, `STAV.md`, `AUTORSKA_PRAVA.md`, `EKOFARM_LEGAL_CHECKLIST.md`, `art/PROMPTY_scenario.json`.
