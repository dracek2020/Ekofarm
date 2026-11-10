# EKOfarm – autorská práva a licence

Cíl: hru půjde vydat veřejně (web, Google Play, App Store) bez cizích autorských práv.

## Co je ve hře teď (v3)
| Část | Původ | Stav |
|---|---|---|
| Veškerý kód (`public/js`, `src`, `tools`, `test`) | napsáno pro EKOfarm | ✅ vlastní |
| Grafika farmy (tráva, pole, plodiny, budovy, zvířata, stroje, stromy, plot) | kreslená kódem na canvas (`render.js`, `objects.js`) | ✅ vlastní, žádné obrázky |
| Ikona aplikace (`public/img/icon-*.png`) | vygenerovaná skriptem pro tento projekt | ✅ vlastní |
| Písmo | systémové písmo zařízení (`system-ui`) | ✅ nic se nedistribuuje |
| Knihovny třetích stran | žádné | ✅ |
| Přihlášení přes Google | skript Google Identity Services se načítá přímo od Googlu | ✅ služba Googlu, platí jeho podmínky pro vývojáře |
| Názvy a texty | vlastní (české názvy plodin, budov a zvířat) | ✅ |

## ⚠️ Emoji ikony – vyměnit před vydáním
Ikonky v menu a bublinách (🌾 🥚 🐔 🪙 …) jsou emoji. Kreslí je **písmo emoji v zařízení hráče** (Apple, Google, Microsoft), hra žádné obrázky emoji nedistribuuje.

Při hraní je to v pořádku. Na **screenshotech do obchodů a v propagaci** by ale byla vidět kresba Applu nebo Googlu. Proto je před veřejným vydáním nahradíme:
- **vlastními ikonami** (např. z tvého ComfyUI s komerční licencí), nebo
- sadou s otevřenou licencí, např. Twemoji (CC BY 4.0, vyžaduje uvést autory v aplikaci).

## Pravidla pro další vývoj
- Žádné obrázky, zvuky, písma ani modely bez licence, která dovoluje komerční použití. Každý nový asset zapsat sem (zdroj + licence).
- Názvy, loga ani vzhled jiných her nepoužívat. Hra je inspirovaná žánrem, ne konkrétní hrou.
- Před vydáním ověřit, že název **EKOfarm** není registrovaná ochranná známka pro hry/aplikace (rejstříky ÚPV, EUIPO a obchody s aplikacemi).

Tohle je technický přehled, ne právní rada.
