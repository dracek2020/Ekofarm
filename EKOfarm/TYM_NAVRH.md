# EKOfarm – Farmářský tým: analýza, návrh a plán

Stav k 12. 11. 2026. **Ve v29 je hotový základ Farmářského týmu** (oddíl 0). Zbytek dokumentu je návrh dalších etap; co je hotové, je u něj napsáno.

## 0. Co je hotové ve v29

- **Reset týmu bez náhrady** (2.7). Dosavadní vesničané odešli. Co měli v rukou, se vrátilo do skladu.
- **Domky** chatrč (200 mincí / 2 lůžka), chata (500 / 3), dům (1 000 / 5). Všechny mají plochu 2×2 a dají se přestavět za rozdíl v ceně. Tým má tolik lidí, kolik je lůžek, nejvýš 30.
- **Nástěnka** v Městečku: inzerát za pohoštění, uchazeči s profesí, úrovní a vlastností. Za 24 h odejdou. Zájemci, kteří se ozvou sami (bublina nad domkem), přicházejí od pověsti 3.
- **Pověst farmy** (zakázky +3, denní úkoly +1, 10 stupňů). Při převodu se spočítala z už doručených zakázek.
- **Zásluhy** pro vylepšení Statku a nové rozložení průmyslu přes Statek 1–10 (2.9). Velké pole a Stodola jsou od Statku 4.
- **Profese** Pěstitel, Chovatel, Řemeslník, Skladník. Strojník přijde později.
- **Úrovně 1–12 po oborech**. Zkušenosti jsou hodnota hotové věci × 0,1, u skladníka tržba × 0,05. Mimo profesi se pracovník učí poloviční rychlostí, „Učenlivý“ o 25 % rychleji.
- **Výkon ×1 → ×12** (oddíl 4.0):
  - pěstitel zvládne políčko za 12 s, na úrovni 12 za 1 s;
  - řemeslník naloží do jedné dávky až 12 kusů, výroba trvá stejně dlouho;
  - chovatel dostane z jednoho krmení 1 → 3 produkty;
  - skladník prodá na jednom trhu 30 → 360 kusů a cenu má až o 25 % lepší.
  - Hráč z práce týmu dostane čtvrtinu XP.
- **Náročnost** (2.10, potřebná úroveň 1 / 2 / 4 / 6 / 8 podle úrovně odemčení) a historie povýšení.
- **Obrazovka Farmářský tým** (tlačítko Tým): seznam, filtr podle profese, detail s dovednostmi, přeřazení a propuštění.
- Dva nové kroky průvodce. Placený pomocník končí, najatý doběhne.

**Zatím platí:** na jednom pracovišti je jeden pracovník. Víc lidí na místo, procenta jako podíl času, cílové zásoby a rezervy skladu přijdou ve v30 (oddíl 10.1).

Značení stavu, které se používá v celém dokumentu:

| Značka | Význam |
|---|---|
| **EXISTUJE** | Je ve hře (v27) a je otestované. |
| **V1 · etapa N** | Doplní se v první verzi Farmářského týmu, v uvedené etapě. |
| **POZDĚJI** | Připraví se jen architektura, funkce přijde v dalším rozšíření. |
| **SOUHLAS** | Mění ekonomiku nebo pravidla hry. Neudělám bez tvého schválení (oddíl 11). |

---

## 1. Analýza současného stavu (etapa 1)

### 1.1 Technologie a architektura
Hra běží v prohlížeči (canvas + HTML panely), server je Cloudflare Worker s databází D1. Pravidla hry jsou v jednom sdíleném souboru `public/js/rules.js`, který používá prohlížeč i server. Prohlížeč akci provede hned u sebe a pošle ji serveru. Server ji přepočítá sám a jeho výsledek platí (serverová autorita). Celá farma je jeden JSON v tabulce `farms` a ukládá se s kontrolou verze (`saveFarm`: `UPDATE … WHERE version = ?`, při souběhu až 3 pokusy). Jedna farma se tak nikdy nezapíše dvakrát přes sebe a dva požadavky nemůžou utratit stejné zásoby.

### 1.2 Co hra už má a dá se použít

| Oblast | Co existuje (v27) | Kde |
|---|---|---|
| Pracovníci | „Vesničané“: nákup za 100 mincí, úrovně 1–5 kupované za mince (100/200/300/400), nejvýš 30 na farmu, z toho nejvýš 5 farmářů. Jméno se odvozuje z id. | `rules.js` oddíl vesničanů, `farm.vill` |
| Pracoviště | Výrobna, ohrada, včelín, sklad (obchodník), pracovní oblast polí a sadů (aspoň 4 sousední). **Na jednom pracovišti je nejvýš 1 pracovník.** Nový pracovník starého vystřídá. | `villJobType`, `workAreas`, akce `assignVill`, `assignArea` |
| Průběžná práce | Každý pracovník má vlastní čas `v.t` a úkol `v.job = {k, id, x, s, e}`. Úkon trvá `WORK[k] / VILL_SPEED[lvl]`. Materiál si bere na začátku úkonu a při nezdaru ho vrací. Čekání má důvod `v.w`. | `runVillagers`, `VILL_TASK`, `takeFor`, `giveBack` |
| Plán v procentech | Tabulka u pracovníka (`v.plan`): farmář – podíl oblasti pro každou plodinu nebo strom, dělník – podíl výrobků, obchodník – procento zásoby na trh. Součet ≤ 100 %, kroky po 5 %. Strop zásoby `v.lim`. | akce `villPlan`, `villLim` |
| Obchod | Obchodník ve Skladu: trh každých 30 min, kapacita a cenový bonus podle úrovně. | `tradeRound` |
| Čas a offline | Výpočet podle času serveru, nezávisle na snímkové frekvenci. Po návratu se dopočítá nejvýš 24 h. Rozpočet 800 úkonů na jeden požadavek, akce `tick`, `farm.vt` = kam je práce dopočítaná. | `runVillagers`, `villLag`, `worker.js` |
| Sklady | Sklad (`farm.silo`, kapacita `siloCap`), zásoba semen a sazenic ve Statku (`farm.seeds`, 3 ks na pole/sad). Plný sklad práci zastaví, úroda zůstane na poli. | `addItem`, `takeItem`, `spaceFor` |
| Výrobny | Všech 13 plánovaných výroben **je funkčních** a navíc Rybárna a Medárna (celkem 15). Fronta výroby 3 + 1 místo za každé 3 úrovně budovy, úroveň budovy zrychluje výrobu o 5 % za úroveň. | `BUILDINGS`, `RECIPES`, `queueSize`, `speedMult` |
| Recepty | Semenárna 20, Školka 13, Rybárna 11, Pekárna 9, Konzervárna 9, Džusárna 6, Krmivárna 5, Marmeládárna 5, Uzenářství 4, Mlékárna 3, Olejna 3, Textilka 3, Mlýn 2, Medárna 2, Cukrovar 1. | `RECIPES` |
| Chovy | Kurník, Kravín, Prasečák, Ovčín (krmivo → produkt) a Včelín (plástve přibývají s časem). Zvířata se popisují daty (`ANIMALS`), logika ohrady je společná. | `ANIMALS`, akce `feed`, `collect` |
| Pole | Malá pole, růst podle času, počasí mění dobu růstu při zasazení. Tři grafické fáze se počítají jen z času (`cropStage`), takže je automatika přeskočit nemůže. Sklizeň jde jen u zralé plodiny. | `plotState`, `growMs`, `objects.js` |
| Stroje | Traktory, kombajny, pluh, secí stroj, lis v garáži. Fungují na velkém poli: orba, setí, sklizeň, vykládka, lisování. Obsluhu dělá hráč ručně. | `MACHINES`, akce `field*` |
| Pomocník | Starší automatika: najmutý na 1/4/8 hodin za mince, sází a sklízí malá pole (**i v pracovních oblastech farmářů**). | `runHelper`, akce `hire` |
| UI | Panely budov s blokem „Pracovník“, Statek → Farmáři, Obchod → Vesničané, stav práce, vykřičník a kolečko nad hlavou na mapě. | `panels.js`, `render.js` |
| Testy | 79 automatických testů, z toho 13 pro vesničany a farmáře (plány, trh, dohánění, převod uložených her, nezávislost na dělení času, vykreslení panelů, akce `tick` na serveru). | `test/` |

### 1.3 Co chybí vůči zadání

| Požadavek | Stav |
|---|---|
| Profese (5 skupin) | Chybí. Rozlišují se jen farmáři a ostatní. |
| Zkušenosti z práce, úrovně 1–10, dovednosti, historie | Chybí. Úroveň se kupuje za mince, nejvýš 5. |
| Efektivita jako číslo | Chybí (je jen rychlost podle úrovně). |
| Víc pracovníků na pracovišti, kapacita podle úrovně budovy | Chybí (vždy 1). |
| Plán uložený u pracoviště | Plán je u pracovníka, při přeřazení se maže. |
| Procenta jako podíl výrobního **času** | Dnes se střídají **dávky** podle procent, ne čas. |
| Nevyužitá kapacita a volba „přerozdělit“ | Dnes se zbytek do 100 % vždy přerozdělí. |
| Cílové zásoby jako priorita oddělená od procent | Dnes je jen strop u řádku tabulky. |
| Rezervy surovin pro celou automatiku | Jen rezerva u obchodníka. |
| Obrazovka Farmářský tým | Chybí (pracovníci jsou rozházení po oknech budov). |
| Odhad produkce za hodinu, přehled zásob pro chov | Částečně (stav ano, odhad ne). |
| Voda pro zvířata, péče o plodiny, sezóny | Ve hře neexistují. Nezavádět bez souhlasu (oddíl 9). |
| Automatická obsluha strojů | Chybí. Stroje existují, ale jen ruční ovládání. |
| Logistika mimo prodej | Chybí. Sklad je jen jeden, přesuny mezi sklady nemají smysl. |
| Diagnostika výroby (log) | Chybí. |

### 1.4 Nalezené problémy
1. **Pomocník a farmáři pracují na stejných polích.** Nic se nerozbije (farmář vše před dokončením znovu ověřuje), ale pomocník při nedostatku semen platí mincemi a sází, co má nastavené on, ne podle plánu oblasti. Řeší se tím, že placený pomocník končí (2.5).
2. **Pracovníka jde koupit hned na úrovni 1** a bez omezení počtu (do 30). Raná automatizace může být příliš snadná. Řeší se hledáním přes nástěnku a pověstí farmy (2.5, 2.6).
3. V `STAV.md` byla zmínka o jiné hře. Ve v28 je odstraněná.

---

## 2. Návrh systému Farmářský tým

### 2.1 Princip
Hráč najímá **pracovníky** s profesí, posílá je na **pracoviště** a pracovišti nastaví, **co a v jakém poměru** se tam dělá. Pracovník se prací učí. Zkušenost si nese s sebou, i když ho přeřadíš. Vše se počítá herní logikou podle času. Postavičky na mapě jsou jen zobrazení a výpočet na nich nezávisí.

Ve hře se přestane používat slovo „vesničan“. Nahradí ho „pracovník“ a název profese. Uložená data se nepřejmenovávají (`farm.vill` zůstává), aby se nemusel dělat riskantní převod.

### 2.2 Profese

| Profese (klíč) | Pracoviště | Co dělá | Stav |
|---|---|---|---|
| **Pěstitel** (`pole`) | Oblast polí, oblast sadů | Setí podle plánu, sklizeň zralého, sady: sazenice, trhání, vykopání suchých | EXISTUJE jako farmář → V1 · etapa 3 profese |
| **Chovatel** (`chov`) | Kurník, Kravín, Prasečák, Ovčín, Včelín | Krmení krmivem ze skladu, sběr produktů, vybírání pláství | EXISTUJE jako vesničan v ohradě → V1 · etapa 3 |
| **Řemeslník** (`vyroba`) | 15 výroben | Nakládání výroby podle priorit a podílů, odnášení hotového | EXISTUJE jako dělník → V1 · etapa 3 |
| **Skladník** (`sklad`) | Sklad | Prodej na trhu každou půlhodinu (expedice). Později příjem a výdej zakázek | Prodej EXISTUJE → V1 · etapa 3; ostatní POZDĚJI |
| **Strojník** (`stroje`) | Velké pole | Orba, setí, sklizeň, vykládka strojem z garáže | POZDĚJI (stroje existují, automatika ne) |

Kdokoli může pracovat kdekoli. Ve své profesi se ale učí rychleji a pracuje lépe (oddíl 4).

### 2.3 Vlastnosti pracovníka

| Vlastnost | Uložení | Stav |
|---|---|---|
| Jedinečné ID | `v.id` | EXISTUJE |
| Jméno | odvozené z id (`villName`), později přejmenování `v.name` | EXISTUJE / přejmenování POZDĚJI |
| Profese | `v.prof` | V1 · etapa 3 |
| Pracovní zařazení | `v.at` (budova) nebo `v.area` (oblast) | EXISTUJE |
| Zkušenosti po oborech | `v.xp = { pole, chov, vyroba, sklad, stroje }` v pracovních minutách | V1 · etapa 3 (ukládání), etapa 7 (učení) |
| Úroveň | odvozená z `v.xp[obor]`, nekupuje se | V1 · etapa 7 |
| Efektivita | počítaná (oddíl 4), ukazuje se v % | V1 · etapa 3 |
| Stav dostupnosti | `v.job` / `v.w`: pracuje, čeká (důvod), volný | EXISTUJE |
| Historie postupu | `v.hist = [[čas, obor, úroveň], …]`, posledních 12 povýšení | V1 · etapa 7 |

### 2.4 Pravidla zařazení
1. Pracovník má v jednu chvíli jedno pracoviště. Přeřazení uvolní předchozí místo a vrátí materiál rozdělaného úkonu do skladu. To dnes **EXISTUJE** (`dropJob`).
2. Pracoviště má kapacitu (oddíl 3.3). Na plné pracoviště přiřadit nejde (chyba `workplace_full`). UI nabídne „vyměnit za…“. **V1 · etapa 3** (dnes se pracovník tiše vystřídá).
3. Zkušenosti zůstávají u pracovníka. Nastavení (plán, cíle) zůstává u pracoviště. **V1 · etapa 3** (dnes je plán u pracovníka).
4. Odstranění nebo přesun budovy: přesun pracovníka nechá, zbouraná budova pracovníky uvolní. Přesun existuje, bourání ve hře není.

### 2.5 Hledání pracovníků (nástěnka v Městečku) – V1 · etapa 3
**Rozhodnuto 12. 11. 2026:** pracovníci se nekupují ani nenajímají za peníze, **hledají se**. Placený pomocník na hodiny končí. Kdo ho má zrovna najatého, tomu nájem doběhne. Akce `hire`, `buyVill` a `buyFarmer` přestanou fungovat a hra místo nich ukáže cestu k nástěnce.

**Nástěnka** je nové místo na náměstí v Městečku, vedle Stánku, Prodejny a Tržiště.

1. **Inzerát:** hráč vybere profesi (Pěstitel, Chovatel, Řemeslník, Skladník; Strojník později) a vyvěsí inzerát.
2. **Pohoštění místo peněz:** inzerát stojí pár výrobků z farmy. Čím větší tým, tím lepší pohoštění. Vždy jsou dvě možnosti, hráč vybere tu, kterou má:

   | Členů týmu | Pohoštění (jedna z možností) |
   |---|---|
   | 0–1 | 4 × pšenice, nebo 4 × ředkvička |
   | 2–4 | 3 × chléb, nebo 3 × vejce |
   | 5–8 | 2 × koláč, nebo 2 × jablečný džus |
   | 9–14 | 2 × sýr, nebo 2 × marmeláda |
   | 15 a víc | 2 × sýr a 2 × koláč, nebo 2 × marmeláda a 2 × med |

3. **Čekání:** uchazeči přijdou za 20 min + 5 min za každého člena týmu (prázdný tým 20 min, 10 lidí 70 min, 29 lidí 2 h 45 min). Zatím je vidět odpočet.
4. **Výběr:** přijde 2–4 uchazečů podle pověsti (2.6). Většinou mají požadovanou profesi, s pověstí roste šance i na lepší začínající úroveň. Každý má **jednu vlastnost**:

   | Vlastnost | Účinek |
   |---|---|
   | Učenlivý | +25 % zkušeností |
   | Šikovný | +6 % rychlost práce |
   | Pečlivý | +4 % ke zrychlení výroby a zvířat |
   | Všestranný | mimo svou profesi pracuje bez srážky (jinak −10 %) |

5. Hráč si jednoho vybere a ten nastoupí do týmu jako volný. Ostatní odejdou. Neodpoví-li hráč do **24 h**, odejdou všichni. Pohoštění se nevrací.
6. Současně může viset 1 inzerát, od pověsti 5 dva.
7. Do týmu nikdo nenastoupí, když nemá volné lůžko v domcích (2.8, chyba `no_bed`).

**Pravidla výpočtu:**
- Uchazeči se vygenerují ve chvíli vyvěšení ze stejného náhodného čísla farmy, ze kterého vznikají zakázky (`rnd(farm)`). Server i prohlížeč tak dostanou stejné lidi a výsledek se nedá „přetočit“ znovunačtením.
- Pohoštění se odečte hned (`takeItem`), jen když ho hráč má.
- Všichni dosavadní pracovníci odejdou a tým se získává znovu (2.7).

**Grafika:** nástěnka zatím použije stávající obrázek cedule (`t/cedule`). Vlastní obrázek nástěnky a portréty uchazečů dodám jako zadání pro grafiku.

### 2.6 Pověst farmy – V1 · etapa 3
Pověst je číslo, které roste s tím, jak farma pracuje pro okolí. Neutrácí se, není to měna, a neklesá. Je vidět v hlavičce Farmářského týmu, ve Statku a na nástěnce.

**Body pověsti:**
- doručená zakázka: +3;
- splněný denní úkol: +1;
- později: prodej hráčům na tržišti a ekologické hospodaření.

Při převodu dostane každá farma body za zakázky, které už doručila (`stats.orders × 3`), takže stávající hráči nezačínají od nuly.

**Stupně pověsti** (návrh, doladím simulací):

| Stupeň | Body | Uchazečů | Začínající úroveň | Sami se ozvou |
|---|---|---|---|---|
| 1 | 0 | 2 | 1 | – |
| 2 | 20 | 2 | 1 | – |
| 3 | 60 | 3 | 1–2 | 1× za 2 dny |
| 4 | 120 | 3 | 1–2 | 1× za 2 dny |
| 5 | 220 | 3 | 1–3 | 1× denně |
| 6 | 360 | 3 | 1–3 | 1× denně |
| 7 | 550 | 4 | 2–3 | 1× denně |
| 8 | 800 | 4 | 2–4 | 2× denně |
| 9 | 1 100 | 4 | 2–4 | 2× denně |
| 10 | 1 500 | 4 | 3–5 | 2× denně |

Pověst je zároveň jedna ze zásluh pro vylepšení Statku (2.9).

**Sami se ozvou:** od stupně 3 se občas ozve člověk z některého domku v Městečku. Nad domkem se objeví bublina a uchazeč je i na nástěnce. Přijde **bez pohoštění** a nejčastěji s profesí, které má hráč v týmu nejméně. Čeká 24 h. Ozývá se jen tehdy, když je volné lůžko. Čas dalšího zájemce se počítá dopředu ze stejného náhodného čísla farmy, takže je pro server i prohlížeč stejný.


### 2.7 Začátek od nuly (reset týmu) – rozhodnuto 12. 11. 2026
Při přechodu na nový systém všichni dosavadní vesničané a farmáři odejdou. Každý hráč si tým získá znovu přes nástěnku a pohoštění.

- Rozdělaná práce se ukončí. Co měli pracovníci v rukou (semínko, suroviny, krmivo), se vrátí do skladu.
- Fronty ve výrobnách, zvířata, pole, sady a pracovní oblasti zůstanou, jak jsou. Plány a stropy pracovníků se smažou.
- Pověst se spočítá z už doručených zakázek, takže hráč může hledat hned, jakmile postaví první domek.
- Placený pomocník na hodiny končí. Kdo ho má zrovna najatého, tomu doběhne.
- **Rozhodnuto (R9):** mince za odešlé pracovníky se nevracejí.

### 2.8 Ubytování: chatrč, chata, dům – V1 · etapa 3
Každý člen týmu potřebuje lůžko. **Velikost týmu = počet lůžek v domcích**, nejvýš 30. Bez domku nikoho přijmout nejde.

| Domek | Cena | Lůžek | Cena za lůžko | Na ploše 2×2 | Od Statku |
|---|---|---|---|---|---|
| Chatrč | 200 | 2 | 100 | 2 lůžka | 1 |
| Chata | 500 | 3 | 167 | 3 lůžka | 3 |
| Dům | 1 000 | 5 | 200 | 5 lůžek | 5 |

- **Návrh (R10):** všechny tři domky mají stejnou plochu 2×2 a liší se velikostí stavení na obrázku. Volba je pak skutečná: chatrč je nejlevnější na lůžko, dům šetří místo. Kdyby chatrč zabírala jen 1×1, byla by výhodnější ve všem.
- Staví se ve Stavět → Farma, přesouvají se jako ostatní budovy. Počet není omezený, jen místem a stropem 30.
- Pověst už velikost týmu neomezuje. Rozhoduje o počtu a kvalitě uchazečů a o tom, kdo se ozve sám (2.6).
- **Grafika:** do doby, než budou vlastní obrázky, použiju tři domky z Městečka. Zadání pro grafiku chatrče, chaty a domu připravím.

### 2.9 Odemykání za zásluhy (postup farmy) – V1 · etapa 3
**Dnešní stav:**
- Vylepšení Statku stojí jen mince a pár surovin. Úroveň hráče ani výsledky farmy se nekontrolují.
- Statek 2 stojí 300 mincí a odemkne Mlýn, Kravín, Konzervárnu, Školku a Rybník.
- Do Statku 4 (asi 2 700 mincí celkem) je otevřeno 12 z 15 výroben.

**Návrh (R11):**
- Statek jde vylepšit, jen když farma splní **zásluhy**: úroveň hráče a jeden úkol (sklizeň, zakázky, živočišné produkty, výroba nebo pověst). Mince a suroviny zůstávají jako dnes.
- Průmysl se rozloží přes všech 10 úrovní Statku.
- Každá výrobna přijde až po surovině, kterou zpracovává.

| Statek | Zásluhy pro vylepšení (navíc k mincím a surovinám) | Odemkne |
|---|---|---|
| 1 | – (začátek) | Semenárna, Pekárna, Sad, Chatrč |
| 2 | úroveň 3, sklizeno 40 plodin | Krmivárna, Kurník |
| 3 | úroveň 5, doručeno 10 zakázek | Mlýn, Školka stromků, Rybník, Chata |
| 4 | úroveň 7, nasbíráno 30 živočišných produktů | Stodola a velké pole, Džusárna, Kravín |
| 5 | úroveň 9, pověst 4 | Mlékárna, Včelín, Dům |
| 6 | úroveň 11, vyrobeno 150 výrobků | Konzervárna, Medárna, Rybárna |
| 7 | úroveň 13, pověst 6 | Olejna, Marmeládárna, Prasečák |
| 8 | úroveň 15, vyrobeno 400 výrobků | Cukrovar, Uzenářství |
| 9 | úroveň 17, pověst 8 | Ovčín |
| 10 | úroveň 19, vyrobeno 1 000 výrobků | Textilka |

**Kontrola návaznosti:**
- Mlékárna přijde po Kravínu, Medárna po Včelínu, Uzenářství po Prasečáku, Textilka po Ovčínu.
- Rybárna přijde po Rybníku, Krmivárna se Kurníkem.
- Úroveň hráče vždy stačí na první recept nebo zvíře dané budovy.

**Pravidla:**
- Zásluhy se počítají ze statistik, které hra už vede od založení farmy (`stats.harvest`, `orders`, `animal`, `produce`) a z pověsti. Stávající hráči se tedy posuzují podle celé své historie.
- Nic postaveného nezmizí a úroveň Statku se nesnižuje. Když má hráč budovu, která by se mu teď odemkla až později, nechá si ji a funguje dál. Novou z vyšší úrovně ale nepostaví, dokud Statek nedožene.
- Velké pole bude od Statku 4 (dnes od 3). Traktory a kombajny už dnes potřebují Stodolu, takže přijdou s ní. Ozdoby, pole, sady a ostatní stroje se nemění.
- Ve Statku bude seznam zásluh s pruhy (✓ hotovo / kolik zbývá). U zamčené budovy ve Stavět bude „Statek 6 · vyrobit 150 výrobků“.

### 2.10 Zkušenosti pracovníků odemykají náročnější práci – návrh (R12)
Pracovník zvládne **sám** jen práci, na kterou má praxi. Každý recept, plodina a zvíře má náročnost 1–5 podle úrovně hráče, od které se odemyká:

| Odemyká se od úrovně hráče | do 4 | 5–7 | 8–10 | 11–13 | 14 a víc |
|---|---|---|---|---|---|
| Potřebná úroveň pracovníka | 1 | 2 | 3 | 4 | 5 |

**Příklady:**
- Řemeslník úrovně 1 upeče chléb i obyčejný koláč. Třešňový koláč umí od úrovně 2, ořechový od úrovně 4.
- Chovatel úrovně 1 zvládne slepice, krávy a prasata až s úrovní 2, ovce s úrovní 3.
- Pěstitel úrovně 1 pěstuje pšenici a mrkev, meloun až s úrovní 3.

**Pravidla:**
- Hráč ručně dál vyrábí všechno, co mu dovolí jeho úroveň, jako dnes.
- V tabulce plánu se náročnější řádek ukáže šedě: „umí od úrovně 2“.
- Zkušenosti pracovníků tak mají smysl i mimo rychlost a zkušený člověk má cenu.

---

## 3. Datové modely a vztahy

### 3.1 Přehled (navázáno na existující data, nic se neduplikuje)

```
farm
 ├─ vill[]            pracovníci (existuje, rozšíří se)
 │    id, prof, trait, xp{}, hist[], at | area{kind,id}, job, w, t, n, earned, sold, last
 ├─ objects[]         budovy (existuje) + nové druhy chatrc, chata, dum (typ `house`, lůžka v `BUILDINGS`)
 │    + plan{recept: %}, target[[recept, ks]], auto, used{recept: ms}, log{}   ← nastavení pracoviště (výrobna)
 │    + plan{zboží: %}                                                         ← sklad (obchod)
 ├─ areas{}           nastavení pracovních oblastí (nové): { klíč: { plan{plodina|strom: %}, replant } }
 ├─ keep{}            rezervy skladu pro automatiku (nové): { položka: ks }
 ├─ rep               pověst farmy v bodech (nové)
 ├─ board{}           nástěnka (nové): ads[{ id, prof, ready, until, cands[{ id, prof, lvl, trait }] }], next = čas dalšího zájemce, který se ozve sám
 ├─ silo{}, seeds{}   sklad a zásoba semen (existuje, jediné místo pro inventář)
 └─ vt                kam je práce týmu dopočítaná (existuje)
```

Zadání jmenuje logické oblasti. Tady je, jak se namapují na projekt (nové soubory jen tam, kde to dává smysl):

| Oblast ze zadání | V EKOfarm |
|---|---|
| Employee, EmployeeSkills | `farm.vill[]` + funkce `teamLevel`, `teamEff` v `rules.js` |
| EmployeeAssignment | `v.at` / `v.area` + akce `assignVill`, `assignArea` |
| Workplace | budova v `farm.objects` nebo oblast z `workAreas()` + funkce `workplaces(farm)` (seznam míst s kapacitou) |
| ProductionRecipe | `RECIPES` (existuje, beze změny) |
| ProductionPlan | `o.plan`, `o.target`, `o.auto`, `farm.areas[k]` |
| ProductionQueue | `o.queue` (existuje) |
| Inventory | `addItem` / `takeItem` / `spaceFor` (existuje, jediná cesta do skladu) |
| AutomationManager | `runVillagers` (existuje, rozšíří se) |
| EconomyCalculator | nové funkce `staffPower`, `batchMs`, `estimate`. Nástroj `tools/economy.mjs` (existuje) se rozšíří o simulaci týmu. |
| ProductionLog | `o.log` – počty za posledních 6 celých hodin (malé, ukládá se) |
| Konfigurace | **nový soubor `public/js/team-config.js`** jen s čísly (žádné importy). Všechny tabulky z oddílu 4 budou tam. |

### 3.2 Klíč oblasti a slučování
Oblast se počítá z polí, která sousedí (to existuje). Její klíč je druh + nejmenší id pole (`pole101`). Pravidla pro `farm.areas`:

- Nové pole oblast zvětší a klíč se nezmění, protože nová pole mají vyšší id.
- Spojení dvou oblastí: platí nastavení oblasti s menším klíčem.
- Rozdělení oblasti (přesun pole): část s původním klíčem si nastavení nechá, druhá začne s prázdným plánem (jen sklízí).

### 3.3 Kapacita pracovišť (konfigurovatelné, `team-config.js`)

| Pracoviště | Návrh kapacity | Poznámka |
|---|---|---|
| Výrobna | 1 + ⌊(úroveň budovy − 1) / 3⌋ → 1 / 2 / 3 / 4 (úrovně 1, 4, 7, 10) | stejný rytmus jako místa ve frontě |
| Ohrada | 1 + ⌊(úroveň − 1) / 5⌋ → 1 / 2 | |
| Včelín | 1 | |
| Sklad | 1 | |
| Oblast polí / sadů | ⌈počet políček / 8⌉, nejvýš 4 | 12 polí → 2 pěstitelé |
| Velké pole (strojník) | 1 | POZDĚJI |

Velikost týmu: dnes nejvýš 30. Nově ji určují lůžka v domcích (2.8), nejvýš 30.

---

## 4. Výpočet produktivity a výrobní kapacity

Všechny konstanty jsou v `public/js/team-config.js` (ve v29 hotové). Nikde v kódu nejsou roztroušené.

### 4.0 Platný model (v29, podle rozhodnutí z 12. 11.) – nahrazuje 4.1 a 4.2
- **Úroveň 1–12 v každém oboru zvlášť** (pole, chov, výroba, sklad).
- **Zkušenosti** jsou hodnota hotové věci × 0,1: sklizeň, ovoce, produkt od zvířete, výrobek. Skladník dostává tržbu × 0,05. Čím hodnotnější věc, tím víc zkušeností.
- **Prahy úrovní** (zkušenosti celkem): L2 40 · L3 140 · L4 400 · L5 950 · L6 2 100 · L7 4 500 · L8 9 000 · L9 18 000 · L10 35 000 · L11 70 000 · L12 140 000. Při nepřetržité práci (asi 40 zkušeností za hodinu na úrovni 1, s úrovní roste) je to zhruba:

  | Úroveň | 2 | 5 | 8 | 10 | 12 |
  |---|---|---|---|---|---|
  | Po kolika hodinách práce | 1 | 14 | 75 | 190 | 480 |

  Za týden tedy nikdo dvanáctku mít nebude.
- **Výkon** = kolik práce udělá za stejný čas: ×1,00 · 1,25 · 1,57 · 1,97 · 2,47 · 3,09 · 3,87 · 4,86 · 6,09 · 7,63 · 9,57 · 12,00. Na úrovni 12 je to 12× víc než na úrovni 1. Mimo profesi má pracovník 90 % výkonu.
  - **Pole:** úkon trvá 12 s / výkon, takže 12 s → 1 s na políčko.
  - **Výrobna:** dávka obsahuje tolik kusů, kolik je výkon. Zlomky se sčítají, dávka je omezená surovinami a stropem. Doba výroby je stejná.
  - **Chov:** z jednoho krmení je 1 + 2 × (L − 1) / 11 produktů.
  - **Sklad:** na jeden trh unese 30 × výkon kusů a cenu má o 0–25 % lepší.
- **Vlastnosti:**
  - Učenlivý: +25 % zkušeností.
  - Šikovný: +6 % rychlost úkonů.
  - Pečlivý: +5 % výrobků, produktů od zvířat i zboží na trh.
  - Všestranný: mimo svou profesi bez srážky.
- **Hráč** dostane za práci týmu čtvrtinu XP, jakou by dostal za ruční práci (`playerXp`). Úroveň hráče tak nelétá kvůli automatizaci.
- Proti 4.3: síla obsluhy pro víc pracovníků bude ve v30 počítat s tímto výkonem místo tabulky `CRAFT`.

### 4.1 Zkušenosti
- Jednotka je **pracovní minuta**, tedy 60 s práce při základní rychlosti. Úkon dá `WORK[k] / 60` minut do oboru, ve kterém se dělal. Prodej dá 0,1 minuty za kus.
- Ve své profesi se pracovník učí **1,5× rychleji**.
- Prahy úrovní (pracovní minuty): L2 120 · L3 360 · L4 840 · L5 1 680 · L6 3 000 · L7 5 100 · L8 8 100 · L9 12 000 · L10 18 000.
- Při nepřetržité práci ve vlastní profesi to vychází asi takto: L2 za 1 h, L5 za 15 h, L7 za 40 h, L10 za 119 h. Mimo profesi trvá L10 asi 179 h. Čekání (než něco doroste) se nepočítá, takže skutečně to bude déle.

### 4.2 Efektivita
Efektivita v oboru = `SPEED[L] × (obor = profese ? 1 : 0,9)`.

| Úroveň | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Rychlost práce `SPEED` | ×1,00 | ×1,12 | ×1,24 | ×1,36 | ×1,48 | ×1,58 | ×1,68 | ×1,78 | ×1,88 | ×2,00 |
| Zrychlení výroby a zvířat `CRAFT` | 0 % | 3 % | 6 % | 9 % | 12 % | 14 % | 16 % | 18 % | 20 % | 22 % |

Délka úkonu = `WORK[k] / efektivita`. Základní délky (EXISTUJE): sklizeň 20 s, setí 20 s, trhání 25 s, vykopání 40 s, sazenice 40 s, odnesení 15 s, naložení 15 s, krmení 12 s, sběr 12 s, plástve 20 s.

Proti v27 je strop nižší (dnes ×2,5 na úrovni 5, nově ×2,0 na úrovni 10). Je to záměr kvůli vyváženosti. Převod viz 10.2.

### 4.3 Výkon pracoviště (víc pracovníků)
Síla obsluhy výrobny:

```
S = Σ  W[k] × (1 + CRAFT[L_k]) × profese_k      (pracovníci seřazení od nejlepšího)
W = [1; 0,45; 0,30; 0,20]                       (každý další přidá méně)
S = 1, když tam nikdo není (hráč vyrábí sám, jako dnes)
```

Délka jedné dávky (počítá se jednou, ve chvíli zařazení do fronty, a pak se nemění):

```
d = max( T_receptu × speedMult(úroveň budovy) / S ,  T_receptu × 0,22 )
speedMult = 1 − 0,05 × (úroveň budovy − 1)     (EXISTUJE)
```

Spodní mez 0,22 brání nekonečnému násobení bonusů: budova nikdy nevyrobí víc než asi 4,5× základní rychlost. Úroveň pracovníka a úroveň budovy jsou oddělené a násobí se jen jednou.

Příklad Pekárna, chléb (300 s):

| Úroveň budovy | Míst | Pracovníci (úrovně) | S | Dávka | Kusů za hodinu |
|---|---|---|---|---|---|
| 1 | 1 | – (ručně) | 1,00 | 300 s | 12,0 |
| 1 | 1 | 1 | 1,00 | 300 s | 12,0 |
| 1 | 1 | 10 | 1,22 | 246 s | 14,6 |
| 4 | 2 | 1 | 1,00 | 255 s | 14,1 |
| 4 | 2 | 1, 1 | 1,45 | 176 s | 20,5 |
| 4 | 2 | 5, 5 | 1,62 | 157 s | 22,9 |
| 7 | 3 | 5, 5, 5 | 1,96 | 107 s | 33,6 |
| 10 | 4 | 1 | 1,00 | 165 s | 21,8 |
| 10 | 4 | 5, 5, 5, 5 | 2,18 | 76 s | 47,7 |
| 10 | 4 | 10, 10, 10, 10 | 2,38 | 69 s | 51,9 |

Skutečná produkce je navíc omezená surovinami, místem ve skladu a tím, jestli pracovník stihne nakládat a odnášet. Na chovy se použije stejné `S` pro čas zvířete (`dur`). U polí víc pěstitelů jen dělá víc úkonů současně, růst plodin se nezrychluje.

### 4.4 Procenta = podíl výrobního času
Každá výrobna si vede `o.used[recept]`, tedy kolik milisekund výroby už recept dostal. Další dávku dostane recept s největším schodkem:

```
schodek_r = (pct_r / Σ pct_aktivních) × Σ used_aktivních − used_r
```

Aktivní jsou recepty, které mají suroviny, nejsou nad cílem a nejsou nad rezervou. Po zařazení dávky se k `used` přičte její `d`. Když součet `used` přesáhne 4 hodiny výroby, všechno se vydělí dvěma, aby stará historie nepřebila nový plán.

Rozdíl proti v27: recept s dlouhou dávkou dostane méně kusů, ale stejný podíl času. To odpovídá zadání.

**Nevyužitá kapacita** (Σ < 100 % a vypnuté „přerozdělit“): za dávku délky `d` následuje přestávka `d × (100 − Σ) / Σ`. Při 80 % tak budova stojí 20 % času. Se zapnutým „přerozdělit“ se podíly roztáhnou na 100 % (dnešní chování).

### 4.5 Cílové zásoby (priorita, oddělená od procent)
- Seznam `o.target = [[recept, cíl], …]` v pořadí priority.
- Pracovník nejdřív projde cíle. Recept, jehož zásoba (sklad + fronta) je pod cílem a má suroviny, jde první, bez ohledu na procenta.
- Recept, který cíl splnil, se **nevyrábí vůbec**, ani přes procenta. Cíl je zároveň strop. Kdo chce strop bez priority, nastaví recept jen do procent bez cíle.
- Když jsou cíle splněné nebo nemají suroviny, zbylou kapacitu rozdělí procenta.
- Když nejde vyrobit nic, pracovník čeká a ví proč. Probudí ho přísun suroviny nebo úbytek zásoby (mechanika buzení EXISTUJE).
- Rozdělaná dávka se vždy dokončí. Suroviny jsou už spotřebované a změna plánu ji neruší. Když je sklad plný, hotový výrobek počká v budově (EXISTUJE).

### 4.6 Rezervy skladu (`farm.keep`)
„Nesahat pod N kusů.“ Platí pro **veškerou automatiku**: výrobny, chovatele (krmivo) i skladníka. Neplatí pro ruční akce hráče. Tím se řeší požadavky „neblokovat suroviny jiným budovám“ i „vyhradit osivo na další výsadbu“. Příklad: rezerva 20 semen slunečnice znamená, že je Mlýn nesemele na pražená semínka. Rezervy u obchodníka z v27 se do `farm.keep` převedou.

### 4.7 Odhad produkce (UI)
`estimate(farm, o, hodiny)` spočítá pro každý recept kusy za hodinu podle podílu času, `d` a stavu surovin, kolik surovin spotřebuje a na kolik hodin zásoby vystačí. Je to jen zobrazení, simulaci nemění.

---

## 5. Pravidla automatizace

### 5.1 Pole a sady (pěstitel)

| Pravidlo | Stav |
|---|---|
| Hráč vybere oblast (aspoň 4 sousední pole nebo sady) a pošle tam pěstitele | EXISTUJE |
| Plán oblasti v procentech (plodiny / stromy), zbytek ladem | EXISTUJE u farmáře → přesun k oblasti V1 · etapa 5 |
| Přepínač „po sklizni znovu zasadit“ (`replant`) | V1 · etapa 5 |
| Víc pěstitelů v oblasti, každý si zabere jiné pole (`claim`) | V1 · etapa 5 |
| Sází jen se semenem ze zásoby Statku, nikdy za mince | EXISTUJE |
| Bez semen se nezasadí nic, stav „došla semena“ | EXISTUJE |
| Sklizeň až po dozrání (třetí fáze), fáze se počítají jen z času | EXISTUJE |
| Plný sklad: úroda zůstane na poli, pěstitel čeká, nic nezmizí | EXISTUJE |
| Počasí: doba růstu se určí při zasazení | EXISTUJE |
| Sezóny | Ve hře nejsou, nezavádí se |
| Příprava půdy a péče o plodiny | Na malých polích mechanika není. POZDĚJI v rámci ekologie (kvalita půdy) |
| Rezerva osiva | přes `farm.keep` (4.6) V1 · etapa 6 |

### 5.2 Chovy (chovatel)

| Pravidlo | Stav |
|---|---|
| Krmení: 1 krmivo ze skladu na zvíře, odečte se doopravdy | EXISTUJE |
| Zvíře dá produkt jen po nakrmení a uplynutí doby | EXISTUJE |
| Sběr do skladu, při plném skladu čeká | EXISTUJE |
| Bez krmiva stojí, stav „došlo krmivo“ | EXISTUJE |
| Víc chovatelů, každý si bere jiné zvíře | V1 · etapa 5 |
| Úroveň zkracuje dobu zvířete (`CRAFT`) | EXISTUJE (tabulka se změní) |
| Přehled v okně: počet zvířat, chovatelé, krmivo „vystačí na X krmení / h“, produkce za hodinu, problémy | V1 · etapa 5 |
| Voda | Mechanika neexistuje. Nová povinnost = **SOUHLAS**, návrh v rámci ekologie POZDĚJI |
| Nové druhy zvířat | Nezavádí se. Logika je obecná, nový druh = nový řádek v `ANIMALS` |

### 5.3 Výrobny (řemeslník)

| Pravidlo | Stav |
|---|---|
| Suroviny se berou ze skladu při naložení, hotové do skladu | EXISTUJE |
| Nikdy záporný sklad, nikdy přes kapacitu | EXISTUJE (kontroly v `takeFor`, `spaceFor`, testy) |
| Dávka se započítá jednou (fronta, odnesení jednou) | EXISTUJE |
| Plán u budovy, procenta jako podíl času, nevyužitá kapacita, „přerozdělit“ | V1 · etapa 4 |
| Cílové zásoby jako priorita | V1 · etapa 6 |
| Víc řemeslníků a síla obsluhy `S` | V1 · etapa 4 |
| Specializace na odvětví („praxe v budově“: +1 % za každých 10 h práce v daném druhu budovy, nejvýš +10 %) | V1 · etapa 7 |
| Log výroby za posledních 6 hodin | V1 · etapa 4 |

### 5.4 Sklad a obchod (skladník)
EXISTUJE: trh každou půlhodinu, procento zásoby na trh, kapacita a cena podle úrovně. V1 · etapa 3–7: úroveň ze zkušeností, rezervy přes `farm.keep`. POZDĚJI: automatické plnění zakázek („expedice“) a příjem zboží z tržiště hráčů.

Nová tabulka pro úrovně 1–10:

| Úroveň | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Kusů na trh | 30 | 40 | 50 | 65 | 80 | 100 | 120 | 140 | 160 | 180 |
| Lepší cena | 0 % | 2 % | 4 % | 6 % | 8 % | 11 % | 14 % | 17 % | 21 % | 25 % |
| Druhů zboží | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 12 |

### 5.5 Stroje (strojník) – POZDĚJI
Připraví se jen místo v datech (obor `stroje`, pracoviště velké pole) a pravidla:

- Strojník bere volný stroj z garáže (`freeMachine`, EXISTUJE).
- Cyklus: orba (volitelná) → setí jen ze semen ve Statku → čekání → sklizeň strojem podle plodiny → vykládka podle místa ve skladu → volitelně lisování.
- Stroj zkracuje čas práce, nic nevyrábí bez vstupů.

### 5.6 Herní čas a offline
EXISTUJE a zůstane:

- Výpočet je událost po události podle času serveru, nezávisle na vykreslování.
- Prohlížeč počítá každou sekundu a při každé akci, server při každém požadavku.
- Po zavření hry se nic nepočítá. Po návratu se dopočítá nejvýš 24 h, po dávkách do 800 úkonů.
- Dvojímu započítání brání `v.t`, `job.e` a `farm.vt`.
- Délka offline se dá nastavit (`TEAM.offlineH`).

---

## 6. UI – Farmářský tým

Vlastní vzhled ve stylu EKOfarm (dřevo, papír, zelené akční prvky, vlastní ikony). Rozvržení je navržené od nuly pro telefon na výšku.

### 6.1 Vstup
Nové kulaté tlačítko **Tým** vpravo pod Deníkem a záložka **Tým** ve Statku. Obchod → Vesničané a Statek → Farmáři se nahradí odkazem sem. Hledání nových lidí je na **Nástěnce** v Městečku (6.6).

### 6.2 Obrazovka Farmářský tým
1. **Hlavička:** „Tým 7 / 12 lůžek“, pověst se stupněm a pruhem do dalšího, „Volná místa: 5“, tlačítko **Hledat pracovníka** (otevře nástěnku).
2. **Filtr profesí:** 5 ikon v řadě (Pěstitel, Chovatel, Řemeslník, Skladník, Strojník – šedý „brzy“) a „Všichni“.
3. **Karty pracovníků:**
   - Portrét (zatím dva stávající obrázky lidí, potřebujeme víc portrétů – zadání pro grafiku dodám).
   - Jméno a ikona profese.
   - Hvězda s úrovní a tenký pruh zkušeností.
   - Pracoviště („Pekárna · místo 1/2“).
   - Efektivita („124 %“).
   - Barevná tečka stavu: zelená pracuje, žlutá čeká, šedá volný, červená problém.
4. **Detail pracovníka** (klepnutí na kartu):
   - 5 pruhů dovedností.
   - Historie povýšení.
   - **Přeřadit:** seznam pracovišť jeho profese s volnými místy nahoře, ostatní pod nimi s poznámkou „mimo profesi −10 %“.
   - Na plném pracovišti volba „vyměnit za…“.
5. **Volná místa:** sbalitelný seznam pracovišť s kapacitou n / m. Klepnutím vybereš, koho tam poslat.

### 6.3 Detail pracoviště (výrobna) – blok „Pracovníci“ v okně budovy
1. **Řada míst:** obsazená s portrétem, prázdná s „+“. Pod tím stav (co se děje, upozornění).
2. **Udržovat zásobu** (priorita): řádky „výrobek · ve skladu 37 / cíl [−] 100 [+]“, šipky ▲▼ pro pořadí, „+ přidat cíl“.
3. **Rozdělení kapacity:** u každého výrobku posuvník 0–100 % po 5 % s tlačítky −/+ pro jemné nastavení. Pruh součtu ukazuje „využito 85 % · 15 % stojí“. Přepínač **Přerozdělit nevyužité**.
4. **Odhad za hodinu:** kusy za hodinu, spotřeba surovin, „pšenice vystačí na 3 h 20 min“.
5. **Poslední hodiny:** malý sloupcový přehled vyrobeného (z `o.log`).

Na telefonu je vše pod sebou, žádné další okno. Na tabletu a počítači se bloky 2–4 dají vedle sebe (dvě kolony od šířky 720 px).

### 6.4 Okno oblasti a chovu
- **Oblast:** plán osázení (posuvníky), přepínač „znovu zasadit“, místa pro pěstitele, stav polí (osázeno, zralé, ladem), semena ve Statku a rezervy.
- **Chov:** zvířata, chovatelé, krmivo s odhadem, produkce za hodinu.

### 6.5 Mapa
Zůstane, co je ve v27: postava, kolečko průběhu, vykřičník, pěstitel chodí k poli. Víc postav na jednom pracovišti se rozestoupí. Animace podle druhu práce a pohyb mezi budovami jsou POZDĚJI. Výpočet na nich nezávisí.

### 6.6 Nástěnka
- Nahoře pověst farmy a „Tým 7 / 12 lůžek“ (bez volného lůžka upozornění „postav domek“).
- **Vyvěsit inzerát:** výběr profese (5 ikon), dvě karty pohoštění (šedá, když ji hráč nemá), tlačítko Vyvěsit.
- **Visící inzerát:** odpočet „uchazeči přijdou za 35 min“.
- **Uchazeči:** karty vedle sebe. Na kartě portrét, jméno, profese, začínající úroveň, vlastnost s krátkým popisem a tlačítko **Přijmout**. Dole „odejdou za 23 h“.
- **Zájemce, který se ozval sám:** zvýrazněná karta s domkem.
- Na mapě: bublina nad nástěnkou, když čekají uchazeči, a nad domkem, když se někdo ozval.

---

## 7. Integrace se současnou ekonomikou

- **Inventář zůstává jediný:** `farm.silo` + `farm.seeds`. Každý pohyb jde přes `addItem` / `takeItem` (statistiky, buzení čekajících).
- **Recepty se nemění.** Řetězce, které hra už má:
  - pole → pšenice → Mlýn → mouka → Pekárna → chléb / koláče → sklad → trh;
  - Kravín → mléko → Mlékárna → smetana / sýr / máslo;
  - pole → pšenice, kukuřice, mrkev… → Krmivárna → krmivo → chovy;
  - pole → plodina → Semenárna → semena → zásoba Statku → pěstitelé (uzavřený koloběh);
  - ovoce → Školka → sazenice → sady.
- **Fáze rozvoje farmy** (návrh, část je **SOUHLAS**):

| Fáze | Úroveň Statku | Tým (podle lůžek) | Co hráč dělá |
|---|---|---|---|
| 1 Malá farma | 1–2 | 0–4 (chatrče) | hlavně ručně, první chatrč a inzerát za pšenici |
| 2 První pracovníci | 3–4 | do 10 (chaty) | první oblast, jedna výrobna s plánem, první zájemci se ozvou sami |
| 3 Rozvinuté hospodářství | 5–7 | do 20 (domy) | víc výroben, cíle zásob, rezervy, řetězce |
| 4 Moderní farma | 8–10 | do 30 | víc míst v budovách, strojník (POZDĚJI), ekologie (POZDĚJI) |

- **Žádné mzdy ani nájmy** (rozhodnuto). Pracovníci se hledají za pohoštění z farmy, takže nábor spotřebovává výrobky, ne mince.
- **Žádné nové měny, daně ani údržba** bez souhlasu. Pověst se neutrácí, takže měna to není.
- **Vyvažování:** `tools/economy.mjs` se rozšíří o simulaci týdne pro 3 vzorové farmy (malá, střední, velká). Bude hlásit mince za hodinu s týmem a bez něj. Cíl: tým se vyplatí, ale ruční hra se zakázkami zůstane výhodnější na jednotku času hráče.

---

## 8. Právní část
Samostatně v `EKOFARM_LEGAL_CHECKLIST.md`. Pro tento systém platí: obecný princip (najímání, přiřazování, podíly kapacity, zkušenosti) je myšlenka. Konkrétní provedení (výpočty, názvy, obrazovky, texty, grafika) je vlastní a jiné hry se v něm ani v kódu nejmenují.

---

## 9. Ekologie – připravit, nezavádět
Kvalita půdy, šetrné postupy, voda, efektivita řetězců, vedlejší produkty a energie by měnily ekonomiku. V1 jen nechá místo v datech: `farm.eco = {}` a háček `ecoMult(farm, druh)`, který zatím vrací 1. Návrh mechanik přijde zvlášť a ke schválení.

---

## 10. Implementační plán

### 10.1 Etapy a balíčky
Každý balíček má nové číslo verze a jde nasadit samostatně. Hra mezi nimi zůstává funkční.

| Balíček | Etapy | Obsah |
|---|---|---|
| **v28** (tento) | 1–2 | Analýza, návrh, právní checklist. Kód beze změny. |
| **v29 – HOTOVO** | 3 (+ základ 7) | `team-config.js`; profese, `xp` po oborech, reset uložených her; obrazovka **Farmářský tým**; **nástěnka v Městečku** (inzerát, pohoštění, uchazeči s vlastností), **pověst farmy** a zájemci, kteří se ozvou sami; **reset týmu** (2.7); **domky** chatrč, chata, dům (2.8); **odemykání za zásluhy** a nové rozložení průmyslu (2.9); konec nákupu pracovníků a placeného pomocníka; zkušenosti se začnou sbírat. |
| **v30** | 4 + 6 | Nastavení přesunuté k pracovišti, víc pracovníků na místě (kapacita podle úrovně budovy, chyba `workplace_full`), síla obsluhy `S`, procenta jako podíl času, nevyužitá kapacita a „přerozdělit“, cílové zásoby, rezervy `farm.keep`, odhad za hodinu, log výroby, nový blok pracovníků ve výrobně (posuvníky). |
| **v31** | 5 + 7 | Víc pěstitelů a chovatelů na místě, nastavení oblastí (`farm.areas`, `replant`), pomocník vs. oblasti, přehled chovu; úrovně 1–10 ze zkušeností, bonus profese, praxe v budově, historie. |
| **v32** | 8 | Výkonové testy (30 pracovníků, 15 výroben, 4 oblasti), test souběžných požadavků, převody z v23–v31, kontrola UI na telefonu, tabletu a počítači, vyvážení simulací. |
| později | – | Strojník, expedice zakázek, ekologie, portréty a animace práce. |

Když budeš chtít menší kroky, každá etapa jde i jako samostatný balíček.

### 10.2 Bezpečnost a převod uložených her
- Každý balíček je v gitu (GitHub) samostatný commit, takže jde kdykoli vrátit (`git revert`). Zip obsahuje jen změněné soubory.
- Nová pole se doplní v `normalize` jen tehdy, když chybí. Staré hodnoty se nepřepisují. Verze pravidel `RULES_VERSION` se zvýší.
- **Převod pracovníků:** reset (2.7). Materiál z rozdělané práce se vrátí do skladu a pracovníci se odeberou. Pokud schválíš R9, vrátí se i mince. Rezerva obchodníka se převede na `farm.keep`, aby si hráč nemusel znovu nastavovat, co chce držet.
- **Pověst** se spočítá ze `stats.orders`. **Zásluhy** se počítají ze statistik, které už existují. Úroveň Statku ani postavené budovy se nemění.
- Testy převodu pokryjí uložené hry ve tvaru v23, v25, v26 a v27.

### 10.3 Testovací scénáře a kritéria dokončení

| # | Scénář ze zadání | Dnes | Kdy |
|---|---|---|---|
| 1 | Najmutí a uložení | test existuje | rozšířit o profesi (v29) |
| 2 | Přiřazení k budově | existuje | – |
| 3 | Přeřazení uvolní místo a vrátí materiál | existuje | – |
| 4 | Nelze překročit kapacitu | – | v29 |
| 5 | Zkušenosti z práce | – | v29 (sběr), v31 (úrovně) |
| 6 | Produkce podle zkušeností | jen úroveň za mince | v30 / v31 |
| 7 | Zastavení bez surovin | existuje | – |
| 8 | Správné odečítání surovin | existuje | rozšířit o víc pracovníků (v30) |
| 9 | Výrobky do skladu | existuje | – |
| 10 | Sklad nepřeteče | existuje | – |
| 11 | Součet procent ≤ 100 % | existuje | – |
| 12 | Uložení a obnovení nastavení | částečně | v29: přes server i po přeřazení |
| 13 | Sklizeň až po dozrání | existuje | – |
| 14 | Bez semen se nesází | existuje | – |
| 15 | Cílové zásoby | strop existuje | v30 priorita |
| 16 | Žádná duplikace při souběžných požadavcích | ochrana existuje, test ne | v32 (dva požadavky naráz proti serveru) |
| 17 | Přerušení nezpůsobí ztrátu | částečně (vracení materiálu) | v32 |
| 18 | Offline produkce | existuje | – |
| 19 | Staré uložené hry | existuje (v26 → v27) | každý balíček |
| 20 | UI na zařízeních | telefon (Playwright) | v32 + tablet a počítač |
| + | Výkon | test „měsíc pryč“, rozpočet dávky | v32: 30 pracovníků, dávka do 30 ms na vývojovém stroji |
| + | Nástěnka: inzerát odečte pohoštění, bez něj nejde vyvěsit | – | v29 |
| + | Uchazeči stejní na serveru i v prohlížeči, opakované načtení je nezmění | – | v29 |
| + | Přijetí nad limit pověsti nejde, ostatní uchazeči odejdou, po 24 h odejdou všichni | – | v29 |
| + | Pověst roste za zakázky a denní úkoly, převod ze statistik | – | v29 |
| + | Zájemce se ozve sám podle stupně pověsti a jen když tým není plný | – | v29 |
| + | Staré akce nákupu a pomocníka vrátí srozumitelnou chybu, najatý pomocník doběhne | – | v29 |
| + | Reset: pracovníci odejdou, materiál a (R9) mince se vrátí, fronty a zvířata zůstanou | – | v29 |
| + | Domky: bez volného lůžka nikoho nepřijmeš, lůžka se sčítají, strop 30 | – | v29 |
| + | Statek nejde vylepšit bez zásluh, budovy se odemykají podle nové tabulky, postavené budovy zůstanou | – | v29 |

**Hotovo** znamená: všechny testy procházejí, převod uložených her je otestovaný, dávka dohánění nepřekročí rozpočet a ve hře jsem prošel obrazovky na telefonu i tabletu. U každého balíčku napíšu, co se změnilo a proč, které soubory, co je otestované, jestli původní hra funguje a co zbývá.

---

## 11. Rozhodnutí, která potřebuju od tebe

| # | Otázka | Můj návrh |
|---|---|---|
| R1 | Mzdy a nájmy | **Rozhodnuto: ne.** Pracovníci se hledají (2.5). |
| R2 | Úroveň pracovníka | **Rozhodnuto:** zkušenosti za hotovou práci podle hodnoty, 12 úrovní, pomalý růst (4.0). Hotovo ve v29. |
| R3 | Limit velikosti týmu | **Rozhodnuto:** lůžka v domcích, nejvýš 30 (2.8). |
| R4 | Jak získat pracovníka | **Rozhodnuto:** nástěnka s inzerátem a pověst farmy (2.5, 2.6). Čísla (pohoštění, časy, stupně) jsou návrh a doladím je simulací. |
| R5 | Výkon podle úrovně | **Rozhodnuto:** ne rychlost, ale kolik práce za stejný čas: ×1 → ×12 (políčko 12 s → 1 s, víc kusů v dávce). Hotovo ve v29. |
| R6 | Placený pomocník na hodiny | **Končí** spolu s nájmy. Kdo ho má najatého, tomu doběhne. |
| R7 | Názvy profesí | **Rozhodnuto:** Pěstitel, Chovatel, Řemeslník, Skladník, Strojník. |
| R8 | Velikost balíčků | Tři balíčky v29–v31 a čtvrtý na testy (v32), jak je v 10.1. |
| R9 | Mince za odešlé pracovníky | **Rozhodnuto: nic se nevrací.** |
| R10 | Plocha domků | **Rozhodnuto:** všechny 2×2, liší se obrázkem a počtem lůžek. |
| R11 | Rozložení průmyslu a zásluhy | **Rozhodnuto:** tabulka v 2.9. Hotovo ve v29. |
| R12 | Náročná práce jen pro zkušené pracovníky | **Rozhodnuto:** ano. Hotovo ve v29 (potřebná úroveň 1 / 2 / 4 / 6 / 8). |

---

## 12. Záznam změn v tomto balíčku (v28)

| Co | Proč | Soubor |
|---|---|---|
| Nový dokument s analýzou, návrhem a plánem | Zadání: nejdřív analýza a plán, pak implementace | `TYM_NAVRH.md` |
| Nový právní checklist | Zadání, oddíl 17.7 | `EKOFARM_LEGAL_CHECKLIST.md` |
| Odstraněna zmínka o jiné hře v úvodu | Pravidlo: hry, kterými se inspirujeme, se v dokumentaci nejmenují | `STAV.md` |
| Odkaz na checklist a upozornění, že tabulka z v7 je zastaralá | Aby evidence licencí byla na jednom místě | `AUTORSKA_PRAVA.md` |

Kód hry se nezměnil. Testy: 79 z 79. Hra funguje stejně jako ve v27.

Doplněno po v28 (bude v zipu v29): oddíly 2.5 Hledání pracovníků a 2.6 Pověst farmy, nástěnka v UI (6.6), rozhodnutí R1, R3, R4 a R6, testy nástěnky a pověsti. Potom oddíly 2.7 Reset týmu, 2.8 Ubytování, 2.9 Odemykání za zásluhy a 2.10 Náročná práce, rozhodnutí R9–R12.

## 13. Co zůstává nehotové a doporučení
- Všechno označené V1 je zatím **jen navržené**.
- POZDĚJI: strojník, expedice zakázek, ekologie (i jako zdroj pověsti), body pověsti za prodej hráčům, víc portrétů a obrázek nástěnky (zadání pro grafiku připravím s v29), animace podle druhu práce, přejmenování pracovníků.
- **v29 je hotová** (oddíl 0). Další je v30: víc pracovníků na jednom místě (kapacita podle úrovně budovy, chyba `workplace_full`), procenta jako podíl výrobního času, nevyužitá kapacita, cílové zásoby a rezervy skladu.
- Grafika pro domky, nástěnku a portréty je zadaná v `EKOfarm_grafika_tym_pro_ChatGPT.zip` (`ZADANI_TYM.md`).
- **Výkon při vysokých úrovních:** den nepřítomnosti s týmem na úrovni 12 se dopočítá asi na 55 požadavků. Každý trvá do 5 ms, ale v prohlížeči to zabere pár sekund. Ve v31 zvážit slučování úkonů (víc políček v jednom úkonu).
