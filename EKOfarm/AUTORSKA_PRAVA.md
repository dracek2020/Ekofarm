# EKOfarm – autorská práva a licence

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

Tohle je technický přehled, ne právní rada.
