# EKOfarm – test report rozšíření (v46)

Vygenerováno `node tools/test-report.mjs` · 2026-11-13 · commit `f045a06` · větev rozsireni

## Souhrn
- Celá sada testů (`npm test`): **221 PASS / 0 FAIL** z 221.
- Akceptační body A01–F10: **71 PASS, 0 FAIL, 0 BLOCKED, 0 NOT_RUN** (z 71).
- Kontrola grafiky: 52 nových obrázků, chyb 0. Původní obrázky změněné: 0.

Testy pouštějí pravidla se všemi skupinami zapnutými; vypnuté skupiny ověřuje samostatný proces (test/fixtures/flags-off.mjs). Číslo u bodu = kód ze zadání (04_TESTY/AKCEPTACNI_TESTY.md).

| Bod | Stav | Co se ověřilo | Kde |
|---|---|---|---|
| A01 | **PASS** | nová id nekolidují se starými ani mezi sebou; opakovaná migrace nic nezdvojí | test/v46.test.js |
| A02 | **PASS** | nové recepty jen v existujících výrobnách, nikdy dřív než budova; bez budovy se nevyrábí | test/v46.test.js |
| A03 | **PASS** | každý vstup je dosažitelný na Statku a Vaření receptu; o úroveň níž recept není | test/v46.test.js |
| A04 | **PASS** | zakázky, Stánek a pohoštění nikdy nechtějí nezpřístupněnou novinku; dostupné novinky se objevují | test/v46.test.js |
| A05 | **PASS** | Farmářský sendvič: chléb + salát + ředkvička, spotřebuje existující chléb | test/v46.test.js |
| A06 | **PASS** | Sójová mouka v Mlýně od St3, sójový chléb od St4 podle Vaření, sójový olej od St7 | test/v46.test.js |
| A07 | **PASS** | bramboráky a zelenina v oleji nepoužijí olej před Olejnou (St7) | test/v46.test.js |
| A08 | **PASS** | višňová marmeláda až s cukrem (St8), višňový koláč bez cukru | test/v46.test.js |
| A09 | **PASS** | oves, len, petržel a kopr se sejí a sklízejí stejně jako ostatní plodiny (malé i velké pole) | test/v46.test.js |
| A10 | **PASS** | staré recepty, ceny, plodiny a budovy jsou beze změny (v45) | test/v46.test.js |
| A11 | **PASS** | Bolen na bylinkách beze změny, Bolen s koprem je samostatný recept | test/v46.test.js |
| A12 | **PASS** | Vaření 25/30/40 odemyká mistrovské recepty, Vaření 50 kosmetické ocenění; nic předem | test/v46.test.js |
| B01 | **PASS** | vstupy se odečtou přesně jednou, zásoby nikdy záporné | test/v46.test.js |
| B02 | **PASS** | počet kusů podle receptu (qty), ne vždy 1 | test/v46.test.js |
| B03 | **PASS** | výrobek i vedlejší produkt se vejdou celé, jinak výroba počká a nic se neztratí | test/v46.test.js |
| B04 | **PASS** | otruby jen za hotové dávky mouky (1 za 5), ne při načtení ani náhledu | test/v46.test.js |
| B05 | **PASS** | pokrutiny ze všech olejů dohromady, bez zdvojení | test/v46.test.js |
| B06 | **PASS** | řepné řízky 1 za 4 cukry, výlisky 1 za 6 vybraných džusů (mrkvová šťáva ne) | test/v46.test.js |
| B07 | **PASS** | alternativní směsi vyrábí existující krmivo, ne nový předmět | test/v46.test.js |
| B08 | **PASS** | vypnuté skupiny: hra jede dál, nic se nesmaže, po zapnutí se vše vrátí | test/v46.test.js |
| B09 | **PASS** | sláma a lis beze změny, sláma se spotřebuje jen dobrovolným vylepšením ohrady | test/v46.test.js |
| B10 | **PASS** | opakované načtení v okamžiku dokončení dávky nic nepřidá | test/v46.test.js |
| B11 | **PASS** | rozpracované dávky z doby před zapnutím: původní výrobek, žádné vedlejší produkty zpětně | test/v46.test.js |
| B12 | **PASS** | vedlejší produkty mají malou cenu a nedají se zneužít | test/v46.test.js |
| B13 | **PASS** | skladník neprodá rezervu ani zboží držené pro cílové zásoby (potvrzený plán) | test/v46.test.js |
| C01 | **PASS** | 20 medovníků = 40 mouky + 20 medu + 40 vajec → 120 pšenice + 40 pláství | test/v46.test.js |
| C02 | **PASS** | plán odečte dostupné zásoby, ale ne rezervu | test/v46.test.js |
| C03 | **PASS** | plán odečte dostupné zásoby, ale ne rezervu | test/v46.test.js |
| C04 | **PASS** | náhled nic nezmění; potvrzení jen nastaví cílové zásoby (fronty a sklad beze změny) | test/v46.test.js |
| C05 | **PASS** | náhled nic nezmění; potvrzení jen nastaví cílové zásoby (fronty a sklad beze změny) | test/v46.test.js |
| C06 | **PASS** | stejné poslední kusy se nepřidělí dvakrát (účetní kniha) | test/v46.test.js |
| C07 | **PASS** | dva recepty na stejné krmivo: volba hráče nebo deterministický výběr | test/v46.test.js |
| C08 | **PASS** | cyklický recept skončí bezpečnou chybou | test/v46.test.js |
| C09 | **PASS** | odhad času podle dávek, obsluhy a vylepšení budovy | test/v46.test.js |
| C10 | **PASS** | Playwright, iPhone 13 (390 × 844, dotyk): Řídicí centrum → Plán výroby, výběr výrobku, počet, preference, potvrzení cílových zásob; panel bez vodorovného posunu (scrollWidth 326 = clientWidth 326). Snímky v náhledu v46. | build/ekofarm-artifact.html |
| C11 | **PASS** | plán nedovolí recept ani surovinu z vyšší úrovně | test/v46.test.js |
| C12 | **PASS** | zboží nabídnuté na tržišti ani v zakázkách se jako dostupné nepočítá | test/v46.test.js |
| D01 | **PASS** | Každá ze 4 plodin má 3 fáze (public/img/c/<id>_0..2, 120 × 150 jako ostatní plodiny) a ikonu; ověřeno testem D11 a vizuálně na snímku pole. 52 nových obrázků. | tools/v46art.py, public/img/c, public/img/i |
| D02 | **PASS** | nové plodiny: výnos 2, čas a počasí podle serveru jako u ostatních | test/v46.test.js |
| D03 | **PASS** | Semenárna: 2 plodiny → 3 semena; bez semen a mincí se nezasadí; sklizeň semena nedá | test/v46.test.js |
| D04 | **PASS** | Semenárna: 2 plodiny → 3 semena; bez semen a mincí se nezasadí; sklizeň semena nedá | test/v46.test.js |
| D05 | **PASS** | sklizeň na velkém poli jen správným strojem (oves, len kombajn; petržel, kopr traktor) | test/v46.test.js |
| D06 | **PASS** | Nové plodiny jdou stejnou cestou kódu jako původní: růst growMs (počasí + události), velké pole fieldYield s bonusem stroje (yld) – žádná výjimka pro nové plodiny (testy D02, A09). | public/js/rules.js |
| D07 | **PASS** | nové plodiny: výnos 2, čas a počasí podle serveru jako u ostatních | test/v46.test.js |
| D08 | **PASS** | pěstitelé s novou plodinou: výnos 2 z políčka, žádná produktivita navíc | test/v46.test.js |
| D09 | **PASS** | nové plodiny se nenabízí (Stánek, zakázky, osivo) před odemčením | test/v46.test.js |
| D10 | **PASS** | tools/v46check.py: 52 souborů, průhledné okraje, alfa kanál, bez černých obrysů. Bez chyb. Původ: Scenario (GPT Image 2.5 Flare), vlastní prompty, styl podle vlastního obrázku Statku (viz EKOFARM_LEGAL_ASSET_CHECK.md). | tools/v46check.py |
| D11 | **PASS** | skupina zapnutá jen s hotovou grafikou: každá nová položka má ikonu, plodina 3 fáze růstu a osivo | test/v46.test.js |
| D12 | **PASS** | git diff proti záloze: v public/img jsou jen nové soubory (52), žádný původní obrázek se nezměnil ani nezmenšil. | git diff zaloha-pred-rozsirenim -- public/img |
| E01 | **PASS** | offline 1 h / 24 h / 7 dní: žádné zdvojení, počítadlo pokračuje z uloženého stavu | test/v46.test.js |
| E02 | **PASS** | opakované načtení v okamžiku dokončení dávky nic nepřidá | test/v46.test.js |
| E03 | **PASS** | Server zpracuje akce jedné farmy postupně a uloží celou farmu (stávající test worker.test.js „v31: souběžné požadavky – tým pracuje, zboží se nezdvojí, farma se uloží celá“, v46 beze změny serveru). | test/worker.test.js |
| E04 | **PASS** | dvě výrobny nemůžou odečíst stejnou poslední surovinu | test/v46.test.js |
| E05 | **PASS** | skladník neprodá rezervu ani zboží držené pro cílové zásoby (potvrzený plán) | test/v46.test.js |
| E06 | **PASS** | Tržiště beze změny kódu; stávající test worker.test.js „v10: tržiště hráčů – vystavit, koupit, peníze prodávajícímu, stáhnout“ prošel. Nové předměty jsou běžné ITEMS (cena, strop 3×). | test/worker.test.js |
| E07 | **PASS** | nepovedené odnesení nepřidá XP ani dovednost | test/v46.test.js |
| E08 | **PASS** | po aktualizaci nevzniknou vedlejší produkty za dobu nepřítomnosti před ní (dopočet týmu); rozpracované dávky z doby před zapnutím: původní výrobek, žádné vedlejší produkty zpětně | test/v46.test.js |
| E09 | **PASS** | offline 1 h / 24 h / 7 dní: žádné zdvojení, počítadlo pokračuje z uloženého stavu | test/v46.test.js |
| E10 | **PASS** | stejný stav a stejné akce = stejný výsledek | test/v46.test.js |
| E11 | **PASS** | vypnuté skupiny: hra jede dál, nic se nesmaže, po zapnutí se vše vrátí; se všemi skupinami vypnutými je obsah hry přesně jako ve v45 | test/v46.test.js |
| E12 | **PASS** | tým 30 lidí, den nepřítomnosti: výpočet zůstává rychlý | test/v46.test.js |
| F01 | **PASS** | audit je ze skutečných dat a obsahuje všechny recepty a prodejní kanály | test/v46.test.js |
| F02 | **PASS** | audit je ze skutečných dat a obsahuje všechny recepty a prodejní kanály | test/v46.test.js |
| F03 | **PASS** | Statický výpočet stropu jedné výrobní fronty pro Statek 2/4/6/8/10 a 1/7/30/90 dní před/po (EKOFARM_ECONOMY_AUDIT.md) – NENÍ to simulace chování hráče; nejlepší recept na každém Statku se nezměnil. Zátěžový běh týmu: test E12. | tools/eco-audit.mjs |
| F04 | **PASS** | alternativní směsi nejsou nekonečný cyklus, marže je stejný vzorec v každém kroku | test/v46.test.js |
| F05 | **PASS** | alternativní směsi nejsou nekonečný cyklus, marže je stejný vzorec v každém kroku | test/v46.test.js |
| F06 | **PASS** | výkonnější tým offline: dopočítá se nejvýš den, ne neomezeně | test/v46.test.js |
| F07 | **PASS** | týdenní soutěž, denní úkoly, vylepšení budov a příběh chtějí jen dosažitelné věci; ceny vylepšení beze změny | test/v46.test.js |
| F08 | **PASS** | nové plodiny nepřeválcují výnos na políčko a minutu | test/v46.test.js |
| F09 | **PASS** | vedlejší produkty mají malou cenu a nedají se zneužít | test/v46.test.js |
| F10 | **PASS** | mistrovské výrobky: za jednotku vstupu ne víc než ostatní | test/v46.test.js |
