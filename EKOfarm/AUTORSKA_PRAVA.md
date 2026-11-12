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

Tohle je technický přehled, ne právní rada.
