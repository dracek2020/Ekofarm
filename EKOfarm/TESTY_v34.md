# EKOfarm v34 – testy, výkon a audit serveru

Vygenerováno z `test/scenarios.test.js` (`SCEN_REPORT=TESTY.md node --test test/scenarios.test.js`) a z měření na vývojovém stroji 12. 11. 2026.
Celá sada `npm test`: **120 testů, 0 chyb** (98 původních, z toho 5 upravených na nové krmení zvířat, 22 nových scénářů).

## 1. Scénáře ze zadání (očekávaný a skutečný výsledek)

| # | Oblast | Scénář | Očekávaný výsledek | Skutečný výsledek | Stav |
|---|---|---|---|---|---|
| 1 | Chov | chov má dostatek krmiva | za 3 h: 3 slepice × 3 vejce = 9 vajec; 3 krmiva na první cyklus + 3 na druhý | 9 vajec, spotřeba 6 krmiv | OK |
| 2 | Chov | krmivo dochází | nakrmí se jen 1 slepice, krmivo 0, upozornění „došlo krmivo“ (kritické) | nakrmeno 1, krmivo 0, warn no_feed, alert no_feed/0,empty_plots/2 | OK |
| 3 | Chov | krmivo je chráněné skladovou rezervou | chovatel nesáhne na 10 kusů v rezervě (dostupné 0), stav pracovníka „feed“, upozornění „v rezervě“ | krmivo 10, dostupné 0, pracovník feed, warn keep | OK |
| 4 | Chov | víc chovů používá společné zásoby | kukuřice nikdy do mínusu; u dvou ohrad se stejným krmivem výdrž ze spotřeby obou (2/h → 4 kusy na 2 h) | kukuřice zbývá 0, krmiva 0+0; ohrad 2, spotřeba všech 2/h, výdrž 2 h | OK |
| 5 | Chov | chov nemá zaměstnance | nikdo nekrmí (krmivo zůstane 9), přehled „bez chovatele“, upozornění „ohrada nemá pracovníka“ | krmivo 9, vajec 0, warn no_worker, alert true | OK |
| 6 | Chov | chov dosáhl maximální kapacity | ohrada úrovně 1 pojme 3 slepice, další nákup → pen_full | 3/3, nákup: pen_full | OK |
| 7 | Chov | sklad je plný a produkci nelze uložit | vejce se neuloží ani nezmizí (čekají u slepic), chovatel „full“, kritické upozornění; po rozšíření skladu se seberou | čeká 6 vajec, chovatel full, alerty silo_full,pen_full,full, po rozšíření vajec 6 | OK |
| 8 | Zaměstnanci | farma má 30 zaměstnanců (den nepřítomnosti) | 30 lidí, den se dopočítá po dávkách; zásoby nikdy záporné, sklad nepřeteče, zpráva o nepřítomnosti hotová | 35 požadavků (nejhorší 12.2 ms), sklad 2538/3000, úkonů 6077, prodáno za 7712 | OK |
| 9 | Zaměstnanci | zaměstnanec přeřazen během výroby | pšenice vzatá do rukou se po přeřazení vrátí, nic se nevyrobí ani neztratí | úkol load, vzal 3, po přeřazení pšenice 30, fronta mlýna 0 | OK |
| 10 | Zaměstnanci | zaměstnanec získá novou úroveň | z úrovně 1 na 2 a vyšší, úkon kratší (výkon roste) | úroveň 1 → 2, nakládání 9000 → 7200 ms, výkon ×1.25 | OK |
| 11 | Zaměstnanci | výrobna změní procentuální plán (ne zpětně) | změna plánu nepřepíše čas výroby, který už proběhl; krmivo pro krávy se vyrábí až od změny | podíl času před změnou {"krmivo_slepice":3840000}, hned po změně {"krmivo_slepice":3840000}, krmivo pro krávy před změnou 0, potom se vyrábí: true | OK |
| 12 | Zaměstnanci | výrobna dosáhne cílové zásoby | zásoba mouky (sklad + fronta) nepřekročí cíl 40, pracovník čeká („limit“), jen informace – ne chyba | mouka 40, pracovník limit, upozornění 2 | OK |
| 13 | Server | hráč zavře hru na 1 hodinu | stejný výsledek, ať se hodina spočítá najednou nebo po minutách; zpráva o nepřítomnosti jen u hodiny najednou | shoda true, zpráva true / false | OK |
| 14 | Server | hráč zavře hru na 24 hodin | den se dopočítá po dávkách, zpráva shrne celou nepřítomnost a znovu se nezapočítá | 35 dávek, zpráva 24 h, úkonů 6077, po dalším otevření beze změny true | OK |
| 15 | Server | server se během výroby restartuje | po uložení a načtení uprostřed práce stejný výsledek jako bez přerušení | shoda true | OK |
| 16 | Server | dva požadavky současně aktualizují stejnou farmu | oba požadavky se uloží (druhý se při kolizi zopakuje), obě pole osetá, mince odečtené jen jednou za každé | stavy 200/200, osetých polí 2, mince 48 | OK |
| 17 | Server | dvě výrobny potřebují stejnou surovinu | pšenice se nikdy neodečte dvakrát ani do mínusu: spotřeba obou výroben + zbytek = 25 | mouka 6 dávek, semena 3 dávek → spotřeba 24, zbývá 1 | OK |
| 18 | Server | skladník prodává zboží ve třicetiminutových intervalech | prodej jednou za 30 min (za 2 h 4×) | prodejů 4, rozestupy 30, 30, 30 min | OK |
| 19 | Server | skladník neprodá rezervované zboží | prodá se jen to nad rezervou 250 – pšenice neklesne pod 250 | pšenice 250, rezerva 250 | OK |
| 20 | Server | víc hráčů současně používá své farmy | každý hráč má jen svou změnu, nic se mezi farmami nepomíchá | uloženo 200/200/200, správně true/true/true | OK |
| 21 | Server | nová sezóna: farma ze starší verze začne od nuly | úroveň 1, startovní mince, stará nabídka na tržišti zmizí (a dřív se ani neukáže), starý prodej se nepřipíše | úroveň 1, mince 50, nabídku viděl kupec 0×, zbylo nabídek 0, nevyplacených 0, žebříček max 1 | OK |
| 22 | Hospodaření | příjmy a výdaje odpovídají skutečným změnám mincí | výdaj = cena Pekárny, příjem = výkup pšenice, výsledek = změna mincí | příjmy 20 (sell), výdaje 60 (build), změna mincí -40 | OK |

Poznámky:
- Scénář 4: ve hře může být jen **jedna ohrada od každého druhu** (`BUILDINGS.max = 1`), takže stejné krmivo zatím nejí dvě ohrady. Přehled chovu to přesto umí (výdrž krmiva se počítá ze spotřeby všech ohrad se stejným krmivem) – ověřeno s druhým kurníkem vloženým přímo do stavu farmy. Část a) ověřuje sdílenou kukuřici mezi Krmivárnou a oběma chovy.
- Scénář 15 (restart serveru): Worker nemá žádný stav v paměti – každý požadavek načte farmu z databáze a dopočítá ji podle času. Test proto ukládá a znovu načítá farmu uprostřed výroby (JSON → normalize) a porovná výsledek s výpočtem bez přerušení.
- Scénáře 16, 20 a 21 běží přes skutečný kód Workeru nad SQLite (náhrada D1, `tools/fake-d1.mjs`).

## 2. Výkon serveru před a po (v33 → v34)

Zátěž: farma s 30 pracovníky na úrovni 12 (pole, 4 výrobny, kurník, kravín, včelín, skladník), hráč pryč 24 hodin. Měřeno `tools/bench-team.mjs` – celý požadavek bez databáze (JSON → normalize → akce → JSON). Stroj je sdílený, čísla kolísají o ±15 %.

| | v33 | v34 |
|---|---|---|
| Rozpočet událostí na požadavek (`VILL_BUDGET`) | 1 500 | **1 000** |
| Požadavků na dohnání dne | 19–22 | 28–31 |
| CPU jednoho požadavku při dohánění – medián | 10–13,5 ms | **6,4–10 ms** |
| CPU jednoho požadavku – nejhorší (vč. prvního zahřátí) | 22–44 ms | **20–26 ms** |
| Běžný požadavek (hráč klepne) | 0,3 ms | 0,3–0,4 ms |
| Velikost farmy (JSON) | 11 kB | 13 kB (+ hospodaření 48 h a zpráva o nepřítomnosti) |
| Volání databáze: `/api/actions` | 4 (přihlášení, farma, prodeje, uložení) | **3** (přihlášení, farma + prodeje v jedné dávce, uložení) |
| Volání databáze: `/api/state` | 3 | **2** |
| Volání databáze: `/api/market` | 4 | **2** |
| Volání databáze: `/api/leaderboard` | 4 | **3** |
| Uložení po `tick`, při kterém tým nic neudělal | vždy | **neukládá se** |

Proč menší rozpočet: Cloudflare Workers mají na bezplatném tarifu limit 10 ms CPU na požadavek. Dohnání dlouhé nepřítomnosti se teď vejde do menších dávek (víc kratších požadavků); celkový výpočet je stejný a výsledek nezávisí na tom, jak se čas rozkrájí (scénáře 13–15).

## 3. Audit databáze a serveru

- **Jeden řádek na farmu** (`farms.state` JSON + `version`). Každá akce = 1 čtení + 1 zápis celé farmy; zápis je podmíněný verzí (optimistické zamykání) a v téže transakci (D1 batch) se zapisují i navazující změny (tržiště, vyplacené prodeje). Při kolizi se požadavek zopakuje až 3×. Částečná transakce nemůže nastat – buď se uloží všechno, nebo nic.
- **Odečet surovin**: probíhá v pravidlech nad jednou farmou v jednom požadavku, události jdou v pořadí času. Dvě výrobny si stejnou surovinu nemůžou vzít dvakrát (scénář 17); rezervy hlídá `availFor` (scénáře 3, 19).
- **Indexy**: `sessions(token_hash)` (primární), `farms(user_id)` (primární), `market(seller)`, `market_sales(seller, paid)`, `chat(user_id, created)`, `push_subs(user_id)` – odpovídají dotazům. Nové indexy nejsou potřeba.
- **Žebříček** čte úroveň z JSON všech farem (`json_extract`). Pro desítky až stovky hráčů je to v pořádku. Při tisících hráčů navrhuji sloupce `level`, `xp` v tabulce `farms` (plněné při uložení) a index – vyžádá si migraci, zatím neprovedeno.
- **Zkušenosti, výroba, chov, prodeje skladníka** se počítají jen v paměti během požadavku; do databáze jde jen výsledná farma. Historie se neukládá po úkonech: hospodaření po hodinách (nejvýš 48 záznamů), zpráva o nepřítomnosti jen poslední.
- **Migrace databáze**: žádná. Schéma (`schema.sql`) je beze změny. Reset na novou sezónu dělá kód při načtení farmy (viz `STAV.md`, v34).
