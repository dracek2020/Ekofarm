# EKOfarm – právní a assetový soupis rozšíření (v46)

Stav k 13. 11. 2026, větev `rozsireni`. Interní dokument (nejde do hry). Celkový soupis hry: `AUTORSKA_PRAVA.md`, `EKOFARM_LEGAL_CHECKLIST.md`.

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
