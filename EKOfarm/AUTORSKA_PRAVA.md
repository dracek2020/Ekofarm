# EKOfarm – autorská práva a licence

> **Od v28 se evidence vede v `EKOFARM_LEGAL_CHECKLIST.md`.** Tabulka níže popisuje stav z v7 (grafika tehdy byla kreslená kódem) a je zastaralá; od v16 je grafika z ChatGPT, viz checklist.

Cíl: hru půjde vydat veřejně (web, Google Play, App Store) bez cizích autorských práv.

## Co je ve hře teď (v7)
| Část | Původ | Stav |
|---|---|---|
| Veškerý kód (`public/js`, `src`, `tools`, `test`) | napsáno pro EKOfarm | ✅ vlastní |
| Grafika farmy (tráva, pole, plodiny, budovy, zvířata, stroje, stromy, plot) | kreslená kódem na canvas (`render.js`, `objects.js`) | ✅ vlastní, žádné obrázky |
| Ikona aplikace (`public/img/icon-*.png`) | vygenerovaná skriptem pro tento projekt | ✅ vlastní |
| Písmo | systémové písmo zařízení (`system-ui`) | ✅ nic se nedistribuuje |
| Knihovny třetích stran | žádné | ✅ |
| Přihlášení přes Google | skript Google Identity Services se načítá přímo od Googlu | ✅ služba Googlu, platí jeho podmínky pro vývojáře |
| Názvy a texty | vlastní (české názvy plodin, budov a zvířat) | ✅ |

## Ikony a zvuky (od v7)
- Ikony jsou **vlastní SVG** nakreslené kódem pro tuto hru (`public/js/icons.js`). Emoji se už nepoužívají.
- Zvuky se skládají v prohlížeči z tónů (WebAudio, `public/js/sfx.js`). Hra nemá žádné zvukové soubory.
- Názvy strojů (Brázda, Klas) jsou vymyšlené, ne skutečné značky.

## Pravidla pro další vývoj
- Žádné obrázky, zvuky, písma ani modely bez licence, která dovoluje komerční použití. Každý nový asset zapsat sem (zdroj + licence).
- Názvy, loga ani vzhled jiných her nepoužívat. Hra je inspirovaná žánrem, ne konkrétní hrou.
- Před vydáním ověřit, že název **EKOfarm** není registrovaná ochranná známka pro hry/aplikace (rejstříky ÚPV, EUIPO a obchody s aplikacemi).
- **v10**: ikony semen (balíček s plodinou), sazenic, tržiště, nových výrobků; kreslení městečka, cesty, domků a tržiště – vše vlastní kód, bez cizích obrázků.
- **v11**: ikony ryb, medu, rybníka, včelína, udic a jídel; kreslení rybníka, včelína a minihry rybaření – vše vlastní kód.
- **v12 – grafika budov** (`public/img/b/`: statek 1–10, sklad 1–10, 4 ohrady, 13 výroben): dodal autor hry (vojtech). **Doplnit, čím byla vytvořená a za jakých podmínek** (u AI generátoru ověřit, že podmínky dovolují komerční použití).
- **v16 – grafika celé hry** (`public/img/t, c, s, b, z, m, p, i`): vygenerovaná autorem hry v ChatGPT (OpenAI) podle zadání `ZADANI_PRO_CHATGPT.md`, upravená (ořez, zmenšení) nástrojem `tools/assets.py`. Podle podmínek OpenAI patří výstupy uživateli; před vydáním ověřit aktuální podmínky.
- **v32 – nová grafika celé hry** (`public/img/t, c, s, b, z, m, p, i` + ikona aplikace): vygenerovaná 12. 11. 2026 ve **Scenario** (model GPT Image 2.5 Flare) z textových zadání napsaných pro EKOfarm, upravená nástrojem `tools/fantasy.py`. Grafika z v16 už ve hře není. Podrobnosti a stav ověření licence v `EKOFARM_LEGAL_CHECKLIST.md`.
- **v33 – rozhraní** (`public/img/u`, ikony UI v `public/img/i`, ikona aplikace): 13 obrázků ze Scenario (GPT Image 2.5 Flare) 12. 11. 2026, prompty v `art/PROMPTY_scenario.json`. **Písmo Grandstander** (`public/fonts`): Copyright 2020 The Grandstander Project Authors, licence SIL Open Font License 1.1 (text v `public/fonts/OFL-grandstander.txt`, staženo z Google Fonts).
- **v35 – nové budovy** (`public/img/b`: Statek 1–10, Sklad 1–10, výrobny, ohrady, Stodola, Rybník, Včelín, Rybárna, Medárna, domky týmu; ikony `house`, `barn`, `garage`, `pond`, `hive` v `public/img/i`): 45 obrázků ze Scenario (GPT Image 2.5 Flare) 12. 11. 2026 z textových zadání napsaných pro EKOfarm, upravené nástrojem `tools/budovy.py`. Prompty celé v `art/PROMPTY_scenario.json` (`v35_budovy`). Grafika budov z v32 ve hře už není (zůstává jen v gitu).
- **v36 – rostliny, stroje, udice, pes, rybníky, události** (`public/img/c` – nové rostliny po jedné, `public/img/m` – 28 nových strojů, `public/img/i` – ikony strojů, udic, psa a deníku, `public/img/p/pes_*`, `public/img/b/rybnik2–4`, `public/img/e` – 24 ilustrací událostí): 77 obrázků ze Scenario (GPT Image 2.5 Flare) 12. 11. 2026 z textových zadání napsaných pro EKOfarm, upravené nástroji `tools/v36art.py` a `tools/budovy.py`. Prompty celé v `art/PROMPTY_scenario.json` (`v36`). Texty událostí napsal Claude pro EKOfarm.
- **v39 – příběh a vzácné ozdoby** (`public/img/e/k1a–k5d` – 20 ilustrací dílů příběhu, `public/img/b` a `public/img/i` – 10 ozdob: studna, dedova_jablon, mlynek, lipa, venec, strasak, vozik, holubnik, vetrnik, altan): 30 obrázků ze Scenario (GPT Image 2.5 Flare) 13. 11. 2026 z textových zadání napsaných pro EKOfarm, upravené nástrojem `tools/v39art.py`. Prompty celé v `art/PROMPTY_scenario.json` (`v39`). Příběh (`public/js/story.js`) napsal Claude pro EKOfarm; postavy a místa jsou vymyšlené.
- **v47 – rybaření, návnady a pečivo** (`public/img/i` – 62 ikon: 10 ryb, červ, třpytka, masová návnada, 16 rybích jídel, rohlík a 18 pečiv, žitná mouka, mletý mák, tvaroh, žito, mák, neutrální ryba, cívka, rybářská bedna, + 2 balíčky osiva; `public/img/c` – žito a mák po 3 fázích; `public/img/r` – 5 póz farmáře s prutem a scéna rybníka pro minihru): 9 obrázků ze Scenario (GPT Image 2.5 Flare) 13. 11. 2026 z textových zadání napsaných pro EKOfarm, upravené nástrojem `tools/v47art.py`. Prompty celé v `art/PROMPTY_scenario.json` (`v47`), seznam souborů v `RYBARENI_GRAFIKA.md`. Vlasec, splávek, vlnky, ukazatel a panely minihry kreslí vlastní kód (canvas, CSS).
- **v46 – rozšíření ekonomiky** (`public/img/i` – 32 ikon výrobků, vedlejších produktů a odznaku, 4 ikony plodin, 4 balíčky osiva; `public/img/c` – oves, len, petržel, kopr po 3 fázích): 7 obrázků ze Scenario (GPT Image 2.5 Flare) 13. 11. 2026 z textových zadání napsaných pro EKOfarm, upravené nástrojem `tools/v46art.py` (balíček osiva kreslí skript stejně jako `tools/fantasy.py`). Prompty celé v `art/PROMPTY_scenario.json` (`v46`). Odznak Mistr údolní kuchyně je vlastní motiv (medaile s vařečkou a klasem, bez textu a cizích znaků).
- **v45 – ovoce** (`public/img/i` – 20 ikon ovocných výrobků, `public/img/b/susarna`, `public/img/b/cukrarna`): 4 obrázky ze Scenario (GPT Image 2.5 Flare) 13. 11. 2026 z textových zadání napsaných pro EKOfarm, upravené nástrojem `tools/v45art.py`. Prompty celé v `art/PROMPTY_scenario.json` (`v45`).

Tohle je technický přehled, ne právní rada.
