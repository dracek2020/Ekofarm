# EKOfarm – právní checklist (duševní vlastnictví a vydání)

**Povaha dokumentu:** předběžné technické a právně orientované posouzení. Připravil Claude (AI asistent) 12. 11. 2026 nad stavem hry v27. **Není to právní rada ani záruka.** Před komerčním vydáním doporučuju kontrolu českým nebo evropským advokátem se zaměřením na duševní vlastnictví a IT.

**Interní dokument.** Jiné hry tu jmenuju jen kvůli posouzení rizik. Do hry, do veřejných materiálů ani do marketingu nepatří. Server zveřejňuje jen složku `public/`, tento soubor tam není. Repozitář drž soukromý.

Stav položek: **OK** = doložené, **ČÁSTEČNĚ** = něco chybí, **NEPROVĚŘENO** = nevíme, **RIZIKO** = je potřeba jednat.

---

## 1. Právní rámec (stručně)

| Předpis / rozhodnutí | Co z něj plyne pro EKOfarm |
|---|---|
| Autorský zákon č. 121/2000 Sb., § 2 odst. 1 | Dílem je jedinečný výsledek tvůrčí činnosti autora. Chráněné je konkrétní vyjádření: kód, grafika, texty, hudba. |
| tamtéž, § 2 odst. 6 | Myšlenka, postup, princip ani metoda samy o sobě dílem nejsou. Herní mechaniky jako najímání pracovníků, podíly výroby nebo zakázky jsou proto volně použitelné, pokud jejich provedení je vlastní. |
| tamtéž, § 5 odst. 1 | Autorem je jen fyzická osoba. |
| SDEU C-406/10 (SAS Institute) | Funkcionalita programu, programovací jazyk a formát datových souborů nejsou chráněné jako počítačový program. Chráněné je vyjádření (zdrojový a strojový kód). Rozhodnutí neříká, že je bezpečné napodobit cokoli. |
| SDEU C-393/09 (BSA) *(doplněno, ověřit u právníka)* | Grafické uživatelské rozhraní není vyjádřením počítačového programu, ale **může být chráněné jako dílo**, pokud je originální. Podobnost obrazovek se proto posuzuje zvlášť. |
| Městský soud v Praze, 10 C 13/2023 | Obrázek vytvořený AI (DALL·E) nebyl uznán za autorské dílo: autorem musí být fyzická osoba a samotné zadání (prompt) je jen námět. Žaloba byla zamítnuta i proto, že žalobce neprokázal, jak obrázek vznikl. Prvoinstanční rozhodnutí, ne ustálená judikatura. |
| Občanský zákoník č. 89/2012 Sb., § 2976 | Generální klauzule nekalé soutěže (jednání v rozporu s dobrými mravy soutěže, způsobilé přivodit újmu). |
| tamtéž, § 2981 | **Vyvolání nebezpečí záměny:** použití cizího označení, napodobení výrobku, jeho obalu nebo provedení. Neplatí pro prvky dané funkcí, technikou nebo estetikou, pokud napodobitel udělal, co šlo, aby záměně předešel. |
| tamtéž, § 2982 | **Parazitování na pověsti** cizího podniku, výrobku nebo služby. |
| Zákon č. 441/2003 Sb. o ochranných známkách, nařízení (EU) 2017/1001 o ochranné známce EU | Ochrana názvů a log. Hra nesmí používat cizí známky a vlastní název by neměl být zaměnitelný s cizí známkou pro hry a aplikace (třídy 9 a 41). |

## 2. Evidence externích součástí a licencí

| Součást | Původ / autor | Zdroj | Licence / podmínky | Komerční použití | Uvedení autora | Omezení | Ověřeno | Doklad | Stav |
|---|---|---|---|---|---|---|---|---|---|
| Grafika hry `public/img/b, c, i, m, p, s, t, z` (366 souborů, 4,7 MB) | vygeneroval autor hry v ChatGPT (OpenAI) podle archů od Clauda, upraveno skriptem `tools/assets.py` | ChatGPT | OpenAI Terms of Use (EU): uživatel výstup vlastní „v rozsahu povoleném právem“ a OpenAI na něj převádí svá práva, **pokud nějaká má**. Výstup nemusí být jedinečný, jiní uživatelé můžou dostat podobný. | podle podmínek ano | podmínky nevyžadují | výstup nevydávat za lidskou tvorbu; podobné výstupy u jiných | 12. 11. 2026 (podmínky EU, datum účinnosti na stránce neuvedeno) | chybí: datum generování, typ účtu, prompty, vstupní obrázky | **ČÁSTEČNĚ** |
| Ikony aplikace `public/img/icon-192.png`, `icon-512.png` | vytvořené skriptem pro projekt | vlastní | vlastní | ano | ne | – | 12. 11. 2026 | `AUTORSKA_PRAVA.md` | OK |
| Grafika budov z v12 | dodal autor hry, nástroj neuveden | ? | ? | ? | ? | ? | – | – | **NEPROVĚŘENO** – ověřit, jestli ještě nějaký soubor z v12 v `public/img/b` zůstal (v16 měl celou grafiku nahradit) |
| SVG ikony `public/js/icons.js` | napsal Claude (Anthropic) pro projekt | vlastní kód | podmínky Anthropic pro výstupy – **ověřit aktuální znění** | předpoklad ano | ne | – | – | – | **ČÁSTEČNĚ** |
| Zdrojový kód `public/js`, `src`, `tools`, `test` | psaný pro EKOfarm s Claudem | vlastní | jako výše | předpoklad ano | ne | – | – | git historie | **ČÁSTEČNĚ** |
| Zvuky `public/js/sfx.js` | skládané z tónů v prohlížeči (WebAudio) | vlastní kód | – | ano | ne | – | 12. 11. 2026 | kód | OK |
| Písmo | systémové písmo zařízení (`ui-rounded`, `system-ui`), nic se nedistribuuje | – | – | ano | – | – | 12. 11. 2026 | `style.css` | OK |
| Knihovny ve hře | žádné (bez npm závislostí za běhu) | – | – | – | – | – | 12. 11. 2026 | `package.json` | OK |
| Google Identity Services (přihlášení) | Google | `accounts.google.com/gsi/client` (načítá se přímo od Googlu) | podmínky Google pro vývojáře a pravidla pro tlačítko „Sign in with Google“ | ano, za jejich podmínek | ne | vzhled tlačítka podle pravidel Googlu | – | – | **ČÁSTEČNĚ** (přihlášení je odložené, kód je ve hře) |
| Hosting Cloudflare Workers + D1 | Cloudflare | služba | podmínky Cloudflare | ano | ne | limity tarifu | – | – | ČÁSTEČNĚ |
| Vývojové nástroje (Node.js, wrangler, Pillow, Playwright) | třetí strany | npm / PyPI | open source; **přesné licence a verze ověřit** | jen při vývoji, s hrou se nedistribuují | – | – | – | – | NEPROVĚŘENO (nízké riziko) |
| Názvy strojů „Brázda“, „Klas“ | vymyšlené | – | – | – | – | – | – | – | **NEPROVĚŘENO** – ověřit, že nejde o značky výrobců zemědělské techniky |
| Jména pracovníků (Anička, Pepa…) | běžná česká jména | – | – | ano | – | – | – | – | OK |

**Pravidlo pro nové součásti:** každý nový obrázek, zvuk, písmo nebo knihovnu zapsat do této tabulky před vložením do hry. U AI výstupů zapisovat nástroj, datum, typ účtu, prompt a vstupní podklady.

## 3. Neprověřené položky (seznam úkolů)
1. **Původ grafiky z ChatGPT:** sepsat datum, účet (osobní / Plus / Team), prompty a vstupní podklady pro archy 1–19 a pro 4 náhledy UI. Zvlášť zkontrolovat, jestli některý prompt nebo podklad neodkazoval na jinou hru nebo nepoužil cizí screenshot. Pokud ano, týkající se grafiku přegenerovat bez toho.
2. Grafika z v12: ověřit, že už ve hře není, nebo doplnit původ.
3. Podmínky Anthropic pro výstupy (kód, SVG ikony): uložit si znění platné v době tvorby.
4. Názvy „Brázda“ a „Klas“: rychlá rešerše značek zemědělských strojů v ČR a EU.
5. Licence vývojových nástrojů: sepsat verze a licence (nízká priorita, s hrou se nešíří).
6. Pravidla Googlu pro přihlášení: před zapnutím zkontrolovat vzhled tlačítka a texty souhlasu.
7. **Grafika v29 (domky, nástěnka, portréty):** zatím ji ve hře zastupují vlastní obrázky domků z Městečka a cedule. Nová grafika je zadaná (`ZADANI_TYM.md`). Až dorazí, zapsat do tabulky v oddílu 2 nástroj, datum, účet a prompt.

## 4. Možné rizikové podobnosti s jinými hrami

| Hra (vlastník) | V čem je podobnost | Úroveň | Co s tím |
|---|---|---|---|
| **Hay Day** (Supercell) | Žánr a celkové pojetí: izometrická farma, sklizeň tažením prstu, výrobny s frontou, zakázky, stánek u cesty, tržiště hráčů, rybaření, pomocník najímaný na čas, okno nové úrovně. Grafika UI vznikla z náhledů z ChatGPT ve stylu „roztomilé farmy“ (dřevěné rámy, zelená tlačítka, kulaté ukazatele mincí). | **RIZIKO střední** – mechaniky jsou myšlenky, ale **souhrn vzhledu** (obrazovky, rozložení, styl ikon) by mohl být posuzován jako napodobení provedení (§ 2981 odst. 3) nebo jako chráněné GUI (C-393/09). | Grafické ladění s vlastní identitou (barvy, rámy, tvar tlačítek, logo, typografie), žádné rozvržení obrazovek „1:1“, vlastní ikony, nepoužívat název, logo ani podobné postavy. V marketingu nikdy „jako Hay Day“ (§ 2982). Před vydáním porovnat snímky obrazovek obou her vedle sebe a nechat posoudit. |
| **Medieval Dynasty** (Render Cube / Toplitz Productions) | Princip přidělování pracovníků do budov a nastavování podílů výroby v procentech. | **nízká** – jde o princip. Naše provedení (tabulky, výpočty, názvy, obrazovky) je vlastní a ve hře ani v kódu se hra nejmenuje. | Žádné převzaté texty, ikony ani rozvržení. Nepoužívat jejich názvy profesí a obrazovek. |
| **Farming Simulator** (GIANTS Software) | Velké pole, traktory, kombajny, pluh, secí stroj, lis. | **nízká** – obecná zemědělská realita. | Stroje kreslit bez rysů skutečných značek (žádné barvy a tvary typické pro konkrétního výrobce), názvy vymyšlené. |
| Obecně farmářské hry (FarmVille ad.) | Žánrové konvence (mince, úrovně, výroba). | nízká | – |

**Zmínky v projektu:** v souboru `STAV.md` byla věta „ve stylu Hay Day“. Ve v28 je odstraněná. Ve hře, v kódu, v novinkách a v ostatních dokumentech žádné jiné zmínky nejsou (hledáno 12. 11. 2026). Výjimkou je tento checklist.

## 5. Stav kontroly názvu „EKOfarm“

**Stav: NEOVĚŘENO.** Nic z níže uvedeného neznamená, že je název volný.

- **Předběžná rešerše na webu 12. 11. 2026:** hru ani aplikaci se jménem přesně „EKOfarm“ výsledky nenašly. Našly ale podobně znějící farmářské hry: „Eco City – farm building game“, „Ecotopia: Farm & craft game“, „Green farm: Farmer simulator“ a hru „Eco Inc.“. Rešerše je jen orientační (webové vyhledávání, ne rejstříky).
- **Slabá rozlišovací způsobilost:** „ekofarma“ je běžné české slovo (ekologická farma). Pro farmářskou hru je název spíš popisný. Taková známka se hůř registruje i hůř brání a riziko záměny s „Eco…“ hrami je reálné.
- **Co ověřit:**
  - Databáze ochranných známek ÚPV: https://www.upv.gov.cz/informacni-zdroje/narodni-databaze/databaze-ochrannych-znamek
  - EUIPO eSearch plus a TMview: totožné i podobné názvy (EKO, ECO, EKOFARM, ECOFARM, ECO FARM, EKO-FARM), třídy 9, 28 a 41.
  - WIPO Global Brand Database.
  - App Store, Google Play a Steam.
  - Domény (.cz, .com, .eu).
- **Doporučení:** zvážit výraznější název nebo aspoň výrazné logo (kombinovaná známka). Rozhodnutí o názvu udělat před tvorbou loga a marketingu.

## 6. Návrhy na snížení rizik
1. Vést evidenci (oddíl 2) u každého nového assetu, u AI výstupů včetně promptů.
2. Do zadání pro ChatGPT nikdy nepsat názvy jiných her ani nepřikládat jejich screenshoty. Popisovat vlastní slovy (tvar, barvy, nálada).
3. Udělat vlastní vizuální identitu UI (paleta, rámy, ikony, logo). Kontrola „vedle sebe“ s nejpodobnější hrou před vydáním.
4. Názvy obrazovek a systémů vlastní (Farmářský tým, Pěstitel, Řemeslník…), texty psané pro EKOfarm.
5. Název hry prověřit (oddíl 5) dřív, než se do něj investuje (logo, doména, obchody).
6. Protože AI grafika nemusí být chráněná, počítat s tím, že ji jiní můžou kopírovat. Hodnotu hry stavět i na kódu, obsahu a značce. Kde je to důležité (logo, hlavní postavy), zvážit lidský autorský podíl (ruční dokreslení), který jde doložit.
7. Repozitář nechat soukromý, interní dokumenty (tento checklist, náhledy, zadání) nedávat do `public/`.

## 7. Otázky pro právníka
1. Lze grafiku vygenerovanou v ChatGPT a upravenou ořezem a zmenšením použít komerčně v EU? Má autor hry k ní nějaká práva, a jak se bránit, když ji někdo zkopíruje?
2. Jak doložit lidský tvůrčí podíl u AI grafiky a u kódu psaného s AI asistentem? Co si uchovávat (prompty, verze, ruční úpravy)?
3. Je souhrn vzhledu UI (dřevěné rámy, kulaté ukazatele, zelená tlačítka, okno nové úrovně) dost odlišný od nejpodobnější hry žánru z hlediska § 2981 OZ a C-393/09? Co konkrétně změnit?
4. Je název „EKOfarm“ (nebo navrhovaná alternativa) zapsatelný pro hry a aplikace (třídy 9, 41, případně 28) a nekoliduje se staršími známkami nebo hrami „Eco…“?
5. Jaké dokumenty potřebujeme pro vydání v EU: podmínky použití, zásady ochrany osobních údajů, pravidla chatu?
6. Plynou z chatu a tržiště mezi hráči povinnosti podle nařízení o digitálních službách (DSA)? Co minimálně zavést (nahlášení obsahu, moderace)?

## 8. Mimo duševní vlastnictví – vyřešit před vydáním (přehled)
- **Osobní údaje (GDPR):** účty, hesla, chat, odběr upozornění, případně Google účet. Potřeba zásady ochrany osobních údajů, možnost smazat účet, přehled, co a jak dlouho se ukládá.
- **Chat a obsah od hráčů:** pravidla, nahlášení zprávy, moderace.
- **Věkové hodnocení** v obchodech (dotazník IARC) a pravidla App Store a Google Play.
- **Platby:** zatím žádné. Kdyby přišly, spotřebitelské právo a pravidla obchodů.

## 9. Historie kontrol

| Datum | Kdo | Co | Výsledek |
|---|---|---|---|
| 12. 11. 2026 | Claude | v31: kontrola změn od v30 – žádná nová knihovna ani závislost (`package.json` beze změny), žádný nový obrázek, zvuk ani písmo; texty a rozhraní (síla obsluhy, přehled chovu) napsané pro EKOfarm; hledání zmínek o jiných hrách v rozdílu kódu | bez nálezu, tabulka v oddílu 2 beze změny |
| 12. 11. 2026 | Claude | Inventura souborů a zdrojů v repozitáři v27, hledání zmínek o jiných hrách, ověření citovaných ustanovení (§ 2976–2982 OZ podle znění od 6. 1. 2023), rozsudku 10 C 13/2023 a podmínek OpenAI (EU), orientační webová rešerše názvu | viz oddíly 2–5; zmínka v `STAV.md` odstraněna |

## Zdroje
- Autorský zákon: https://e-sbirka.gov.cz/sb/2000/121
- SDEU C-406/10: https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=ecli:ECLI:EU:C:2012:259
- Občanský zákoník, nekalá soutěž (znění od 6. 1. 2023): https://www.podnikatel.cz/zakony/novy-obcansky-zakonik/zneni-20230106/f4588398/
- Městský soud v Praze 10 C 13/2023 (komentář): https://www.epravo.cz/top/clanky/mestsky-soud-v-praze-o-umele-inteligenci-a-autorskem-pravu-117318.html
- Podmínky OpenAI pro EU: https://openai.com/policies/eu-terms-of-use/
- Databáze ochranných známek ÚPV: https://www.upv.gov.cz/informacni-zdroje/narodni-databaze/databaze-ochrannych-znamek
- Orientační rešerše názvu (výsledky vyhledávání): https://apps.apple.com/us/app/-/id1130240645 (Eco City), https://apps.apple.com/app/id1658271657 (Ecotopia), https://apps.apple.com/us/app/-/id6443502803 (Green farm)
