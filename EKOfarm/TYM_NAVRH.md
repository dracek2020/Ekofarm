# EKOfarm – Farmářský tým: analýza, návrh a plán

Stav k 12. 11. 2026, hra ve verzi v27. Tento dokument je **návrh**. V kódu zatím nic z nových částí není, pokud u nich není výslovně napsáno „existuje (v27)“.

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
1. **Pomocník a farmáři pracují na stejných polích.** Nic se nerozbije (farmář vše před dokončením znovu ověřuje), ale pomocník při nedostatku semen platí mincemi a sází, co má nastavené on, ne podle plánu oblasti. Návrh: pomocník vynechá pole v oblastech, kde je pracovník (rozhodnutí R6).
2. **Pracovníka jde koupit hned na úrovni 1** a bez omezení počtu (do 30). Raná automatizace může být příliš snadná (R3).
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

---

## 3. Datové modely a vztahy

### 3.1 Přehled (navázáno na existující data, nic se neduplikuje)

```
farm
 ├─ vill[]            pracovníci (existuje, rozšíří se)
 │    id, prof, xp{}, hist[], at | area{kind,id}, job, w, t, n, earned, sold, last
 ├─ objects[]         budovy (existuje)
 │    + plan{recept: %}, target[[recept, ks]], auto, used{recept: ms}, log{}   ← nastavení pracoviště (výrobna)
 │    + plan{zboží: %}                                                         ← sklad (obchod)
 ├─ areas{}           nastavení pracovních oblastí (nové): { klíč: { plan{plodina|strom: %}, replant } }
 ├─ keep{}            rezervy skladu pro automatiku (nové): { položka: ks }
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

Velikost týmu: dnes nejvýš 30. Návrh je omezit ji úrovní Statku (R3).

---

## 4. Výpočet produktivity a výrobní kapacity

Všechny konstanty jsou v `team-config.js`. Nikde v kódu nebudou roztroušené.

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
Nové kulaté tlačítko **Tým** vpravo pod Deníkem a záložka **Tým** ve Statku. Obchod → Vesničané a Statek → Farmáři se nahradí odkazem sem.

### 6.2 Obrazovka Farmářský tým
1. **Hlavička:** „Tým 7 / 12“ (limit podle Statku), „Volná místa: 5“, tlačítko **Najmout**.
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

| Fáze | Úroveň Statku | Tým | Co hráč dělá |
|---|---|---|---|
| 1 Malá farma | 1–2 | do 4 pracovníků, pomocník na hodiny | hlavně ručně |
| 2 První pracovníci | 3–4 | do 8 | první oblast, jedna výrobna s plánem |
| 3 Rozvinuté hospodářství | 5–7 | do 16 | víc výroben, cíle zásob, rezervy, řetězce |
| 4 Moderní farma | 8–10 | do 30 | víc míst v budovách, strojník (POZDĚJI), ekologie (POZDĚJI) |

- **Žádné nové měny, mzdy, daně ani údržba** bez souhlasu (R1).
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
| **v29** | 3 (+ základ 7) | `team-config.js`; profese, `xp` po oborech, převod uložených her (10.2); nastavení přesunuté k pracovišti; kapacity a chyba `workplace_full`; obrazovka **Farmářský tým**; najímání s volbou profese; zkušenosti se začnou sbírat. |
| **v30** | 4 + 6 | Síla obsluhy `S`, procenta jako podíl času, nevyužitá kapacita a „přerozdělit“, cílové zásoby, rezervy `farm.keep`, odhad za hodinu, log výroby, nový blok pracovníků ve výrobně (posuvníky). |
| **v31** | 5 + 7 | Víc pěstitelů a chovatelů na místě, nastavení oblastí (`farm.areas`, `replant`), pomocník vs. oblasti, přehled chovu; úrovně 1–10 ze zkušeností, bonus profese, praxe v budově, historie. |
| **v32** | 8 | Výkonové testy (30 pracovníků, 15 výroben, 4 oblasti), test souběžných požadavků, převody z v23–v31, kontrola UI na telefonu, tabletu a počítači, vyvážení simulací. |
| později | – | Strojník, expedice zakázek, ekologie, portréty a animace práce. |

Když budeš chtít menší kroky, každá etapa jde i jako samostatný balíček.

### 10.2 Bezpečnost a převod uložených her
- Každý balíček je v gitu (GitHub) samostatný commit, takže jde kdykoli vrátit (`git revert`). Zip obsahuje jen změněné soubory.
- Nová pole se doplní v `normalize` jen tehdy, když chybí. Staré hodnoty se nepřepisují. Verze pravidel `RULES_VERSION` se zvýší.
- **Převod pracovníků:**
  - Profese podle pracoviště: oblast → pěstitel, ohrada a včelín → chovatel, výrobna → řemeslník, sklad → skladník, volný → řemeslník.
  - Koupená úroveň se převede na zkušenosti v profesi: 1 → L1, 2 → L3, 3 → L5, 4 → L7, 5 → L10. Nikdo o koupenou úroveň nepřijde.
  - Plán a strop se přesunou k pracovišti. Strop z v27 se změní na cíl zásoby. Rezerva obchodníka se změní na `farm.keep`.
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

**Hotovo** znamená: všechny testy procházejí, převod uložených her je otestovaný, dávka dohánění nepřekročí rozpočet a ve hře jsem prošel obrazovky na telefonu i tabletu. U každého balíčku napíšu, co se změnilo a proč, které soubory, co je otestované, jestli původní hra funguje a co zbývá.

---

## 11. Rozhodnutí, která potřebuju od tebe

| # | Otázka | Můj návrh |
|---|---|---|
| R1 | Mzdy a údržba | **Ne.** Mzdy by běžely i offline a hráč by se vrátil do dluhu. Rovnováhu řeší limit týmu a cena najmutí. |
| R2 | Úroveň pracovníka | **Jen ze zkušeností**, nákup úrovně za mince zmizí. Kdo úroveň koupil, nepřijde o ni (převod 10.2). |
| R3 | Limit velikosti týmu podle Statku | Statek 1–10: 2 / 4 / 6 / 8 / 10 / 13 / 16 / 20 / 25 / 30. Kdo má víc, nechá si je, jen další nenajme. |
| R4 | Cena najmutí | Nechat 100 mincí (bez změny). Druhá možnost: 100 + 25 za každého člena týmu, nejvýš 500. |
| R5 | Nižší strop rychlosti (×2,0 místo ×2,5) | Ano. Pracovníci na nejvyšší úrovni budou o něco pomalejší než ve v27. |
| R6 | Pomocník na hodiny a oblasti s pěstiteli | Pomocník vynechá pole v oblastech, kde je pěstitel. |
| R7 | Názvy profesí | Pěstitel, Chovatel, Řemeslník, Skladník, Strojník. Systém se jmenuje Farmářský tým. |
| R8 | Velikost balíčků | Tři balíčky v29–v31 a čtvrtý na testy (v32), jak je v 10.1. |

---

## 12. Záznam změn v tomto balíčku (v28)

| Co | Proč | Soubor |
|---|---|---|
| Nový dokument s analýzou, návrhem a plánem | Zadání: nejdřív analýza a plán, pak implementace | `TYM_NAVRH.md` |
| Nový právní checklist | Zadání, oddíl 17.7 | `EKOFARM_LEGAL_CHECKLIST.md` |
| Odstraněna zmínka o jiné hře v úvodu | Pravidlo: hry, kterými se inspirujeme, se v dokumentaci nejmenují | `STAV.md` |
| Odkaz na checklist a upozornění, že tabulka z v7 je zastaralá | Aby evidence licencí byla na jednom místě | `AUTORSKA_PRAVA.md` |

Kód hry se nezměnil. Testy: 79 z 79. Hra funguje stejně jako ve v27.

## 13. Co zůstává nehotové a doporučení
- Všechno označené V1 je zatím **jen navržené**.
- POZDĚJI: strojník, expedice zakázek, ekologie, víc portrétů (zadání pro grafiku připravím s v29), animace podle druhu práce, přejmenování pracovníků.
- Doporučuju udělat v29 hned po schválení rozhodnutí R1–R8. Je to základ, na kterém stojí všechno ostatní, a sám o sobě nemění rychlost výroby.
