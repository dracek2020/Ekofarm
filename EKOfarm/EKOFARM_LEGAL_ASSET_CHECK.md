# EKOfarm – právní a assetový soupis rozšíření (v46, v47)

Stav k 13. 11. 2026. Interní dokument (nejde do hry). Celkový soupis hry: `AUTORSKA_PRAVA.md`, `EKOFARM_LEGAL_CHECKLIST.md`.

# v47 – rybaření, návnady a pečivo (větev `rybareni`)

## Nové obrazové assety (70 souborů, seznam po jednom v `RYBARENI_GRAFIKA.md`)

| Soubory ve hře | Zdroj | Jak vznikly | Licence / práva | Nejistoty |
|---|---|---|---|---|
| `public/img/i/` – 62 ikon: 10 ryb, červ, třpytka, masová návnada, 16 rybích jídel, rohlík a 18 pečiv, žitná mouka, mletý mák, tvaroh, žito, mák, neutrální ryba (`ryba_obecna`), cívka (`vlasec`), rybářská bedna | Scenario, model GPT Image 2.5 Flare, účet autora hry (tarif Max) | 5 archů (`ikony/ryby1..3`, `ikony/pecivo1..2`, asset ID v `art/PROMPTY_scenario.json` → `v47`), vlastní textová zadání v angličtině (obecné popisy ryb a jídel, bez názvů her, studií, značek a autorů). Rozřezání a zmenšení `tools/v47art.py` | stejné podmínky jako veškerá grafika hry od v32 (výstupy Scenario v placeném tarifu) | obecná nejistota AI výstupů – stejná jako u dosavadní grafiky; vizuálně zkontrolováno |
| `public/img/i/s_zito, s_mak` | ikona plodiny + balíček nakreslený skriptem | `packet()` v `tools/v47art.py` (stejný kód jako `tools/fantasy.py`) | vlastní kód | – |
| `public/img/c/zito_0..2, mak_0..2` | Scenario, dtto | 2 archy po 3 fázích (`c1/zito`, `c1/mak`), plátno 120 × 150; u žita ztlumená bílá záře (`unwhite`) | dtto | dtto |
| `public/img/r/rybar_0..4` + `rybar.json` | Scenario, dtto | 1 arch s 5 pózami **vlastní postavy farmáře EKOfarm** (`p/rybar`), rozdělení na postavy podle souvislých oblastí, společné měřítko; bod špičky prutu spočítaný skriptem | dtto | dtto |
| `public/img/r/scena` | Scenario, dtto | 1 obrázek břehu rybníka na výšku (`s/rybareni`), zmenšený na 900 px | dtto | dtto |
| Vlasec, splávek, vlnky, cákanec, cedulka „Záběr!“, ukazatel se šipkou a zónou, panely postupu a napětí, okénko návnad | vlastní kód (canvas, CSS) | `public/js/main.js`, `public/css/style.css` | vlastní | – |

Kontroly (test T28, `tools/v47check.py`): ikony 128 × 128 a fáze 120 × 150 s alfa kanálem a průhledným okrajem, pózy farmáře průhledné (ořezané, bez rámu), scéna neprůhledná 900 px; žádné černé obrysy. Ručně: bez textu, písmen, log, značek a vodoznaků.

Původní assety: žádný se nezměnil – `git status` v `public/img` ukazuje jen nové soubory (proti tagu `zaloha-pred-rybarenim` = v46). `tools/v47art.py` odmítne přepsat existující obrázek, který sám nevytvořil.

Zdrojové obrázky ze Scenario (2048 px) zůstávají mimo hru: v účtu Scenario (asset ID výše) a v archivu `EKOfarm_v47_obrazky.zip` (Stažené soubory autora).

## Referenční náhledy od autora hry
Dva obrázky z balíčku (`04_UI_A_GRAFIKA/reference_rybareni_8_navnad.png` a náhled minihry) jsou **jen předloha rozvržení UI**. Ve hře ani v repozitáři nejsou, nic se z nich nevyřezávalo ani neobkreslovalo. Prvky rozvržení (cedulka nahoře, vodorovný ukazatel se šipkou a zelenou zónou, dolní panely postupu a napětí, okénko 4 × 2 karet) jsou obecné herní konvence; provedení je vlastní (CSS, vlastní ikony, vlastní postava).

## Obsah a názvy
- Ryby jsou skutečné druhy středoevropských vod s českými jmény (perlín ostrobřichý, ouklej obecná, cejnek malý, ježdík obecný, jelec tloušť, jelec jesen, tolstolobik bílý, siven americký, síh maréna, mník jednovousý).
- Jídla a pečivo jsou obecná česká jména (rohlík, preclík, vánočka, šáteček, závin…). Žádné značky, žádné názvy z jiných her.
- **Žádný alkohol** – kontrola názvů, surovin i promptů.
- Žádná nová měna, budova ani rybník; mince jsou jediná měna.
- Kód: vlastní, bez nových knihoven (Node, PIL, numpy, scipy jako dosud; Playwright jen na test v prohlížeči, není součást hry).

## Data od uživatele
Návrhová data (`audit/v47_navrh_receptu.json`, `audit/v47_navrh_rybareni.json`) jsou kopie z balíčku autora hry. Slouží jen jako zadání; skutečné hodnoty v `public/js/eco-config.js`, porovnání v `RYBARENI_ANALYZA.md`.

# v46 – rozšíření ekonomiky (větev `rozsireni`)

## Nové obrazové assety

| Soubory ve hře | Zdroj | Jak vznikly | Licence / práva | Nejistoty |
|---|---|---|---|---|
| `public/img/i/` – 32 ikon: 13 výrobků etapy B, 11 výrobků etapy E, 4 vedlejší produkty, 3 mistrovské výrobky, odznak `mistr_kuchyne` | Scenario, model GPT Image 2.5 Flare, účet autora hry (tarif Max) | 3 archy 4 × 3 (`ikony/eco1..3`, asset ID v `art/PROMPTY_scenario.json` → `v46`), vlastní textová zadání; reference jen styl vlastního obrázku Statku z v32 (`asset_Xp2WokXQTmir7dL1J5oGLfnT`). Rozřezání a zmenšení `tools/v46art.py` | stejné podmínky jako veškerá grafika hry od v32 (výstupy Scenario v placeném tarifu) | obecná nejistota AI výstupů (autorskoprávní ochrana výstupu, podobnost s cizími díly) – stejná jako u dosavadní grafiky; výstupy byly vizuálně zkontrolovány |
| `public/img/i/oves, len, petrzel, kopr` | dtto (arch `ikony/eco3`, řada 3) | dtto | dtto | dtto |
| `public/img/i/s_oves, s_len, s_petrzel, s_kopr` | ikona plodiny + balíček nakreslený skriptem | `packet()` v `tools/v46art.py` (stejný kód jako `tools/fantasy.py`) | vlastní kód | – |
| `public/img/c/oves_0..2, len_0..2, petrzel_0..2, kopr_0..2` | Scenario, dtto | 4 archy po 3 fázích (`c1/<plodina>`), převod jako `tools/v36art.py` (plátno 120 × 150, hrudka dole uprostřed); u ovsa ztlumená bílá záře (`unwhite`) | dtto | dtto |

Kontroly (test D10, `tools/v46check.py`): všechny soubory mají alfa kanál, průhledné okraje, správné rozměry (ikony 128 × 128, fáze 120 × 150), žádné černé obrysy. Ručně zkontrolováno: bez textu, písmen, log, značek, vodoznaků, známých postav a motivů cizích her. Odznak „Mistr údolní kuchyně“ je vlastní motiv (zlatá medaile s vařečkou a klasem na červené stuze, bez nápisu).

Původní assety: žádný se nezměnil ani nezmenšil (test D12 – `git diff` proti záloze `zaloha-pred-rozsirenim` ukazuje v `public/img` jen nové soubory). `tools/v46art.py` odmítne přepsat existující obrázek, který sám nevytvořil.

Zdrojové obrázky ze Scenario v plném rozlišení (2048 px) zůstávají mimo hru: v účtu Scenario (asset ID výše) a v archivu `EKOfarm_v46_obrazky.zip` (Stažené soubory autora). Do hry jdou jen zmenšené kopie WEBP.

## Obsah a názvy

- Všechny nové názvy jsou obecná česká jména jídel, plodin a surovin (sendvič, pomazánka, bramboráky, otruby, pokrutiny, len…), žádné značky ani názvy z jiných her.
- Žádný alkohol (zadání i pravidlo hry): nové výrobky jsou jídla, oleje, krmiva a textil.
- Odznak a ocenění „Mistr údolní kuchyně“ – vlastní název (údolí je prostředí příběhu EKOfarm).
- Kód: vlastní, bez nových knihoven (Node, PIL, numpy, scipy jako dosud).

## Data od uživatele

Návrhová data (`audit/navrh_receptu.csv`, `audit/navrh_plodin.csv`) jsou kopie z balíčku, který dodal autor hry (návrh vytvořený s jiným asistentem). Slouží jen jako zadání; skutečné hodnoty jsou v `public/js/eco-config.js` a odchylky v `EKOFARM_CONTENT_MAP.md`.
