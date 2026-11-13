# EKOfarm – test report rybaření, návnad a pečiva (v47)

Vygenerováno `node tools/test-report-v47.mjs` · 2026-11-13 · verze hry 47 · commit `f549761` · kontrola v prohlížeči 2026-11-13

## Souhrn
- Celá sada testů (`npm test`): **245 PASS / 0 FAIL** z 245.
- Akceptační testy 1–29: **29 PASS, 0 FAIL, 0 NOT RUN**.
- Kontrola grafiky (`tools/v47check.py`): 70 souborů, chyb 0.
- Úspěšnost minihry je ověřená **automatem** (RYBARENI_SIMULACE.md), ne skutečnými hráči – kalibrace obtížnosti podle hraní zůstává otevřená.

Reprodukce: `npm test` (pravidla, server, API přes Worker s falešnou D1), `node --test test/v47.test.js` (jen tento balíček), `python3 tools/v47check.py` (grafika), `node tools/build-artifact.mjs` + `tools/ui-check-v47.cjs` (prohlížeč).

| Bod | Kritérium | Stav | Co se ověřilo | Kde |
|---|---|---|---|---|
| T01 | Přesné počty v okénku, nulová návnada neaktivní | **PASS** | okénko: přesné počty ze skladu, nulová nebo zamčená návnada se nedá vybrat | test/v47.test.js |
| T02 | Otevření/zavření okénka nic neodečte | **PASS** | výběr nic nestojí; nához vezme přesně 1 kus zvolené návnady a po úniku se nevrací · Prohlížeč: okénko otevřeno a zavřeno 3× (Zrušit, Esc, klik vedle) – sklad beze změny, hráč se vrátí do okna rybníka. telefon (390 × 664, dotyk): sklad stejný; tablet (1180 × 820, dotyk, CPU 4× zpomalené): sklad stejný; pc_reduced (1280 × 800, mezerník): sklad stejný. Pravidla: test T02 + T03 (výběr nic nestojí). | test/v47.test.js, tools/ui-check-v47.cjs → audit/ui47.json, snímky v náhledu v47 |
| T03 | Nához odečte přesně 1 kus, po prohře se nevrací | **PASS** | výběr nic nestojí; nához vezme přesně 1 kus zvolené návnady a po úniku se nevrací | test/v47.test.js |
| T04 | Dvojklik / opakovaný požadavek nezaúčtuje 2 návnady | **PASS** | dvojklik / opakovaný požadavek se stejným klíčem nezaúčtuje druhou návnadu | test/v47.test.js |
| T05 | Poslední kus v rezervě skladu nejde nahodit | **PASS** | poslední kus chráněný rezervou skladu nejde nahodit | test/v47.test.js |
| T06 | Těsto = stará „Návnada“ (zásoby i fronta) | **PASS** | Těsto = dosavadní „Návnada“: staré zásoby i fronta Krmivárny fungují | test/v47.test.js |
| T07 | Hrášek bere skladový Hrách | **PASS** | Hrášek bere plodinu Hrách, Rohlík je jediná položka (pečivo i návnada), Třpytka se kupuje za mince | test/v47.test.js |
| T08 | Rohlík je jedna položka; Třpytka za mince | **PASS** | Hrášek bere plodinu Hrách, Rohlík je jediná položka (pečivo i návnada), Třpytka se kupuje za mince | test/v47.test.js |
| T09 | Prázdný rybník – návnada se neodečte | **PASS** | prázdný rybník: návnada se neodečte | test/v47.test.js |
| T10 | Druh a váha skryté do vylovení | **PASS** | druh ani váha nejsou vidět před vylovením (výsledek, stav farmy, data pro prohlížeč); přes API: server rybu neprozradí, podvržené vylovení neprojde | test/v47.test.js |
| T11 | Úspěch: ryba, rekord, deník, XP jednou | **PASS** | úspěch: ryba, rekord, deník a XP jednou; neúspěch nic z toho nemění | test/v47.test.js |
| T12 | Neúspěch: jen „Ryba unikla“ | **PASS** | úspěch: ryba, rekord, deník a XP jednou; neúspěch nic z toho nemění | test/v47.test.js |
| T13 | Výsledek nejde podvrhnout | **PASS** | přes API: server rybu neprozradí, podvržené vylovení neprojde; výsledek nejde podvrhnout: bez klepnutí, s náhodným klepáním ani moc rychle | test/v47.test.js |
| T14 | Zamčené ryby nemají žádnou šanci | **PASS** | ryby mimo Rybaření nebo vodní plochu nemají žádnou šanci ani s nejlepší návnadou | test/v47.test.js |
| T15 | Návnada má měřitelný, ne absolutní vliv | **PASS** | návnady mají měřitelný, ne absolutní vliv (10 000 losů) | test/v47.test.js |
| T16 | Výpadek spojení: obnova nebo timeout bez zdvojení | **PASS** | výpadek: stejný nához se obnoví, po vypršení se ryba vrátí a jde nahodit znovu; rozběhnutý nához ze staré verze (v46) se po aktualizaci zruší, ryba se vrátí a jde nahodit znovu | test/v47.test.js |
| T17 | Staré ryby, udice, kapacity, deník, rekordy | **PASS** | starých 14 ryb, 10 udic, kapacity 5/8/15/20, deník a rekordy zůstávají; stará farma se načte beze ztráty | test/v47.test.js |
| T18 | Telefon na výšku a tablet bez přetékání | **PASS** | Prohlížeč: okénko návnad i minihra uvnitř obrazovky, bez vodorovného posunu; během souboje je okénko návnad skryté. telefon (390 × 664, dotyk): okénko OK, minihra OK, okénko během souboje skryté; tablet (1180 × 820, dotyk, CPU 4× zpomalené): okénko OK, minihra OK, okénko během souboje skryté; pc_reduced (1280 × 800, mezerník): okénko OK, minihra OK, okénko během souboje skryté | tools/ui-check-v47.cjs → audit/ui47.json, snímky v náhledu v47 |
| T19 | PC klik a mezerník, dotyk, kolísání FPS | **PASS** | klepnutí se počítá jen s odstupem (žádný automat ani držení), minihra nezávisí na FPS · Prohlížeč: celý nához až po vylovení dotykem, mezerníkem a se 4× zpomaleným CPU (nižší FPS) – server přijal klepnutí ve všech případech. telefon (390 × 664, dotyk): Úlovek! Perlín ostrobřichý Hmotnost: 960 g; tablet (1180 × 820, dotyk, CPU 4× zpomalené): Úlovek! Plotice Hmotnost: 460 g; pc_reduced (1280 × 800, mezerník): Úlovek! Karas Hmotnost: 1,3 kg. Pravidla: test T19 + T21 (pevný krok 30 Hz). | test/v47.test.js, tools/ui-check-v47.cjs → audit/ui47.json, snímky v náhledu v47 |
| T20 | prefers-reduced-motion nezabrání úlovku | **PASS** | Prohlížeč s prefers-reduced-motion: reduce – bez paprsků a odskoků, úlovek proběhl. telefon (390 × 664, dotyk): bez omezení pohybu; tablet (1180 × 820, dotyk, CPU 4× zpomalené): bez omezení pohybu; pc_reduced (1280 × 800, mezerník): Úlovek! Karas | tools/ui-check-v47.cjs → audit/ui47.json, snímky v náhledu v47 |
| T21 | Dlouhý stisk nevytváří opakované klepnutí | **PASS** | klepnutí se počítá jen s odstupem (žádný automat ani držení), minihra nezávisí na FPS | test/v47.test.js |
| T22 | Server bez průběžného výpočtu každého snímku | **PASS** | server neodpočítává každý snímek: celý souboj se ověří jedním přehráním (< 5 ms) | test/v47.test.js |
| T23 | 10 ryb, 16 receptů, bez duplicit | **PASS** | 10 nových ryb ve správných vodách, 16 rybích receptů bez duplicit, odemčení podle Statku a Vaření | test/v47.test.js |
| T24 | Recepty neobchází Statek ani Vaření | **PASS** | 10 nových ryb ve správných vodách, 16 rybích receptů bez duplicit, odemčení podle Statku a Vaření | test/v47.test.js |
| T25 | 19 pečiv, žito a mák, 3 mezivýrobky | **PASS** | pečivo: 19 receptů, žito a mák, žitná mouka, mletý mák, tvaroh; cukr až se Statkem 8 | test/v47.test.js |
| T26 | Zakázky/Stánek chtějí jen dosažitelné | **PASS** | zakázky, Stánek a pohoštění chtějí jen to, co hráč může mít (i nové ryby, pečivo, návnady) | test/v47.test.js |
| T27 | Ceny ze vzorce, žádná nekonečná smyčka | **PASS** | ceny ze vzorce, žádná nekonečná zisková smyčka; návnady jen na ryby stojí méně než ryby, na které lákají | test/v47.test.js |
| T28 | Grafický manifest odpovídá realitě | **PASS** | grafika odpovídá: každá nová ryba, jídlo, pečivo, návnada a plodina má obrázek; minihra má pózy a scénu | test/v47.test.js |
| T29 | Stará farma se načte beze ztráty | **PASS** | starých 14 ryb, 10 udic, kapacity 5/8/15/20, deník a rekordy zůstávají; stará farma se načte beze ztráty; rozběhnutý nához ze staré verze (v46) se po aktualizaci zruší, ryba se vrátí a jde nahodit znovu | test/v47.test.js |
