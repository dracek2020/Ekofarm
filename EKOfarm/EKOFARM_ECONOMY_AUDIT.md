# EKOfarm – ekonomický audit (vygenerováno: `node tools/eco-audit.mjs`)

Zdroj: skutečná pravidla `public/js/rules.js` (RULES_VERSION 23, aplikace v46), zapnuté skupiny rozšíření: `eco_recipes`, `eco_planner`, `eco_byproducts`, `eco_straw`, `eco_crops`, `eco_mastery`.

## Jak se počítá
- **Cena výrobku** se v kódu dopočítává z receptu: `(Σ cena surovin × 1,2 + čas v min + 2) / kusů` – ceny se nevyplňují ručně.
- **Sklad** vykupuje za 50 % ceny × tržní výkyv 0,7–1,4 (střed 1). **Stánek** vykupuje 70–88 %, prodává 133–160 %. **Zakázky** platí 130–170 % (střed 150 %) × bonus Statku (+3 %/úroveň) a dávají XP.
- **Skutečný zisk zpracování** = výrobek mínus suroviny ve **stejném kanálu** (surovinu jde prodat i bez výroby – alternativní využití). „Za slot-hodinu“ = zisk / doba jedné dávky (jedna výrobní fronta).
- Tým pracuje i offline: dopočítá se nejvýš 24 h podle serverového času (VILL_CATCHUP), skladník prodává po 30 min.

## Souhrn
| | před (v45) | teď |
|---|---|---|
| Recepty na výrobky | 83 | 115 |
| Různé výrobky | 83 | 110 |
| Plodiny | 20 | 24 |
| Stromy a keře | 13 | 13 |
| Ryby | 14 | 14 |
| Výrobny (budovy) | 17 | 17 |
| Nejvyšší zisk za slot-hodinu – Sklad | 155 | 155 |
| Nejvyšší zisk za slot-hodinu – zakázky | 464 | 464 |
| Medián zisku za slot-hodinu – zakázky | 192 | 210 |
| Nevyužité suroviny | 1 | 1 |
| Suroviny čekající na recept (Statek) | 41 | 43 |
| Cykly v grafu receptů | 0 | 0 |

### Nejvýnosnější recept podle Statku (zakázky, mince za slot-hodinu)
| Statek | Receptů | Nejlepší před | Nejlepší teď |
|---|---|---|---|
| 1 | 1 | 162 (Chléb) | 162 (Chléb) |
| 2 | 7 | 315 (Krmivo pro slepice) | 315 (Krmivo pro slepice) |
| 3 | 20 | 315 (Krmivo pro slepice) | 315 (Krmivo pro slepice) |
| 4 | 36 | 315 (Krmivo pro slepice) | 315 (Krmivo pro slepice) |
| 5 | 44 | 336 (Máslo) | 336 (Máslo) |
| 6 | 76 | 369 (Bolen na bylinkách) | 369 (Bolen na bylinkách) |
| 7 | 89 | 369 (Bolen na bylinkách) | 369 (Bolen na bylinkách) |
| 8 | 108 | 369 (Bolen na bylinkách) | 369 (Bolen na bylinkách) |
| 9 | 109 | 369 (Bolen na bylinkách) | 369 (Bolen na bylinkách) |
| 10 | 115 | 464 (Vlněná deka) | 464 (Vlněná deka) |

## Suroviny – použití a čekání na první recept
| Surovina | Původ | Statek od | Použití | První recept (Statek / Vaření) | Čeká Statků |
|---|---|---|---|---|---|
| Chléb | výroba | 1 | 1 | 2 / 1 | **1** |
| Kukuřice | pole | 1 | 9 | 2 / 1 | **1** |
| Pšenice | pole | 1 | 9 | 1 / 1 | 0 |
| Ředkvička | pole | 1 | 3 | 2 / 1 | **1** |
| Salát | pole | 1 | 3 | 2 / 1 | **1** |
| Brambory | pole | 2 | 8 | 6 / 1 | **4** |
| Hruška | sad | 2 | 3 | 2 / 1 | 0 |
| Jablko | sad | 2 | 4 | 2 / 1 | 0 |
| Jahody | pole | 2 | 4 | 5 / 3 | **3** |
| Křížaly | výroba | 2 | 1 | 3 / 4 | **1** |
| Maliny | sad | 2 | 6 | 2 / 1 | 0 |
| Mrkev | pole | 2 | 3 | 4 / 1 | **2** |
| Okurka | pole | 2 | 3 | 6 / 1 | **4** |
| Rajče | pole | 2 | 4 | 6 / 1 | **4** |
| Vejce | zvířata | 2 | 15 | 2 / 4 | 0 |
| Amur | rybník | 3 | 1 | 6 / 9 | **3** |
| Angrešt | sad | 3 | 2 | 3 / 4 | 0 |
| Bolen | rybník | 3 | 2 | 6 / 15 | **3** |
| Candát | rybník | 3 | 2 | 6 / 10 | **3** |
| Cejn | rybník | 3 | 1 | 6 / 3 | **3** |
| Cibule | pole | 3 | 9 | 6 / 1 | **3** |
| Česnek | pole | 3 | 6 | 6 / 3 | **3** |
| Jeseter | rybník | 3 | 1 | 6 / 22 | **3** |
| Kapr | rybník | 3 | 2 | 6 / 3 | **3** |
| Karas | rybník | 3 | 1 | 6 / 3 | **3** |
| Lín | rybník | 3 | 1 | 6 / 4 | **3** |
| Mouka | výroba | 3 | 18 | 3 / 4 | 0 |
| Okoun | rybník | 3 | 1 | 6 / 6 | **3** |
| Otruby | vedlejší produkt | 3 | 1 | 3 / 1 | 0 |
| Oves | pole | 3 | 2 | 3 / 1 | 0 |
| Ovesné vločky | výroba | 3 | 2 | 4 / 7 | **1** |
| Plotice | rybník | 3 | 2 | 6 / 1 | **3** |
| Pstruh | rybník | 3 | 1 | 8 / 1 | **5** |
| Rybíz | sad | 3 | 2 | 3 / 4 | 0 |
| Řepka | pole | 3 | 1 | 7 / 1 | **4** |
| Sója | pole | 3 | 3 | 3 / 2 | 0 |
| Sójová mouka | výroba | 3 | 1 | 4 / 6 | **1** |
| Sumec | rybník | 3 | 1 | 6 / 18 | **3** |
| Štika | rybník | 3 | 2 | 6 / 13 | **3** |
| Švestka | sad | 3 | 3 | 3 / 3 | 0 |
| Třešně | sad | 3 | 6 | 3 / 4 | 0 |
| Úhoř | rybník | 3 | 1 | 8 / 6 | **5** |
| Borůvky | sad | 4 | 2 | 4 / 4 | 0 |
| Cukrová řepa | pole | 4 | 1 | 8 / 1 | **4** |
| Meruňka | sad | 4 | 2 | 4 / 7 | 0 |
| Mléko | zvířata | 4 | 4 | 5 / 1 | **1** |
| Ovocné výlisky | vedlejší produkt | 4 | 1 | 7 / 7 | **3** |
| Paprika | pole | 4 | 5 | 6 / 4 | **2** |
| Semena slunečnice | semena | 4 | 2 | 4 / 6 | 0 |
| Sláma | velké pole (lis) | 4 | 0 | **žádný** | – |
| Slunečnice | pole | 4 | 1 | 7 / 3 | **3** |
| Višně | sad | 4 | 4 | 4 / 4 | 0 |
| Zelí | pole | 4 | 2 | 6 / 6 | **2** |
| Broskev | sad | 5 | 2 | 5 / 7 | 0 |
| Dýně | pole | 5 | 2 | 6 / 9 | **1** |
| Hrách | pole | 5 | 2 | 6 / 5 | **1** |
| Hrozny | sad | 5 | 2 | 5 / 7 | 0 |
| Máslo | výroba | 5 | 4 | 6 / 8 | **1** |
| Meloun | pole | 5 | 1 | 8 / 9 | **3** |
| Plástev medu | včelín | 5 | 2 | 6 / 1 | **1** |
| Semena dýně | semena | 5 | 1 | 7 / 7 | **2** |
| Smetana | výroba | 5 | 8 | 5 / 3 | 0 |
| Kopr | pole | 6 | 2 | 6 / 6 | 0 |
| Med | výroba | 6 | 4 | 6 / 3 | 0 |
| Ořechy | sad | 6 | 3 | 6 / 3 | 0 |
| Petržel | pole | 6 | 3 | 6 / 8 | 0 |
| Len | pole | 7 | 2 | 7 / 5 | 0 |
| Maso | zvířata | 7 | 2 | 8 / 1 | **1** |
| Pokrutiny | vedlejší produkt | 7 | 1 | 7 / 4 | 0 |
| Řepkový olej | výroba | 7 | 3 | 7 / 7 | 0 |
| Slunečnicový olej | výroba | 7 | 1 | 7 / 7 | 0 |
| Cukr | výroba | 8 | 11 | 8 / 4 | 0 |
| Klobása | výroba | 8 | 1 | 8 / 40 | 0 |
| Řepné řízky | vedlejší produkt | 8 | 1 | 8 / 5 | 0 |
| Uzené maso | výroba | 8 | 1 | 8 / 40 | 0 |
| Vlna | zvířata | 9 | 1 | 10 / 1 | **1** |
| Klubko vlny | výroba | 10 | 2 | 10 / 3 | 0 |
| Lněná příze | výroba | 10 | 1 | 10 / 9 | 0 |
| Lněná tkanina | výroba | 10 | 1 | 10 / 14 | 0 |

### Sledované suroviny (zadání A4)
- **Sója** – k dispozici od Statku 3, použití 3: Krmivo pro ovce, Sójová mouka, Sójový olej
- **Ředkvička** – k dispozici od Statku 1, použití 3: Zeleninový salát, Farmářský sendvič, Zeleninová pomazánka
- **Salát** – k dispozici od Statku 1, použití 3: Krmivo pro prasata, Zeleninový salát, Farmářský sendvič
- **Řepka** – k dispozici od Statku 3, použití 1: Řepkový olej
- **Cukrová řepa** – k dispozici od Statku 4, použití 1: Cukr
- **Sláma** – k dispozici od Statku 4, použití 0 (v45 nevyužitá): —
- **Řepkový olej** – k dispozici od Statku 7, použití 3: Bramboráky, Dýňové placičky, Mistrovský rybí talíř
- **Slunečnicový olej** – k dispozici od Statku 7, použití 1: Zelenina v oleji
- **Višně** – k dispozici od Statku 4, použití 4: Višňový džus, Višňový koláč, Višňová marmeláda, Slavnostní ovocný dort
- **Ořechy** – k dispozici od Statku 6, použití 3: Ořechový koláč, Medové ořechy, Ořechový krém
- **Mouka** – k dispozici od Statku 3, použití 18: Třešňový koláč, Borůvkové muffiny, Buchty, Ořechový koláč, Chléb se semínky, Medovník, Perník, Smažený kapr, Rybí prsty, Rybí karbanátky, Jablečný závin, Švestkové knedlíky, Třešňová bublanina, Angreštový koláč, Jahodové knedlíky, Ovocný dort, Višňový koláč, Slavnostní ovocný dort
- **Cibule** – k dispozici od Statku 3, použití 9: Kečup, Lečo, Kysané zelí, Hrachová polévka, Dýňová polévka, Rybí polévka, Štika na cibulce, Sumcový guláš, Bolen na bylinkách
- **Sláma** – žádný recept ji nežere (záměr: žádná povinná podestýlka); nově jde dobrovolně a jednorázově na podestýlka ze slámy (10× sláma + 40 mincí, cyklus ohrady × 0,97).

### Strop příjmu jedné výrobní fronty (F03)
Statický výpočet, **ne simulace hráče**: nejlepší recept dostupný na daném Statku × nepřetržitý provoz jedné fronty × prodej v zakázkách (střed 150 %). Skutečný příjem omezují suroviny, počet zakázek (6 najednou), tým a sklad.

| Statek | 1 den před | 1 den po | 7 dní po | 30 dní po | 90 dní po |
|---|---|---|---|---|---|
| 2 | 7 560 | 7 560 | 52 920 | 226 800 | 680 400 |
| 4 | 7 560 | 7 560 | 52 920 | 226 800 | 680 400 |
| 6 | 8 856 | 8 856 | 61 992 | 265 680 | 797 040 |
| 8 | 8 856 | 8 856 | 61 992 | 265 680 | 797 040 |
| 10 | 11 136 | 11 136 | 77 952 | 334 080 | 1 002 240 |

Nové recepty strop **nezvyšují** (nejlepší recept na každém Statku je stejný jako ve v45), zvyšují jen počet rozumných možností (medián zisku za slot-hodinu 192 → 210). Offline se tým dopočítá nejvýš 24 h, takže 7 dní nepřítomnosti nedá víc než 1 den.

### Bolen na bylinkách
Skutečný recept v kódu: 1× Bolen + 1× Máslo + 1× Cibule – **bylinky neobsahuje** (shoda s přehledem). Recept se **nemění** (rozpracované fronty a zakázky); bylinkovou variantu přináší samostatný recept „Bolen s koprem“ (etapa E).

### Graf receptů
- Cykly: **žádné** (výroba nemůže vytvořit nekonečný hodnotový řetězec)
- Víc receptů na stejný výrobek: Krmivo pro slepice (krmivo_slepice, krmivo_slepice__oves, krmivo_slepice__otruby); Krmivo pro krávy (krmivo_kravy, krmivo_kravy__rizky); Krmivo pro prasata (krmivo_prasata, krmivo_prasata__pokrutiny, krmivo_prasata__vylisky)

## Všechny recepty
| Výrobek | Budova | Statek | Vaření | Suroviny | Čas | Cena surovin | Cena | Zisk Sklad / h | Zisk zakázky / h | Pozn. |
|---|---|---|---|---|---|---|---|---|---|---|
| Chléb | Pekárna | 1 | 1 | 3× Pšenice | 5 min | 9 | 18 | 54 | 162 |  |
| Krmivo pro slepice | Krmivárna | 2 | 1 | 2× Pšenice + 1× Kukuřice | 2 min | 14 | 21 | 105 | 315 |  |
| Křížaly | Sušárna ovoce | 2 | 1 | 3× Jablko | 10 min | 30 | 48 | 54 | 162 |  |
| Sušené hrušky | Sušárna ovoce | 2 | 1 | 3× Hruška | 10 min | 42 | 62 | 60 | 180 |  |
| Malinový čaj | Sušárna ovoce | 2 | 1 | 3× Maliny | 8 min | 24 | 39 | 56 | 169 |  |
| Farmářský sendvič | Pekárna | 2 | 1 | 1× Chléb + 1× Salát + 1× Ředkvička | 8 min | 27 | 42 | 56 | 169 |  |
| Koláč | Pekárna | 2 | 4 | 2× Pšenice + 2× Vejce | 15 min | 76 | 108 | 64 | 192 |  |
| Mouka | Mlýn | 3 | 1 | 3× Pšenice | 4 min | 9 | 17 | 60 | 180 |  |
| Návnada | Krmivárna | 3 | 1 | 1× Pšenice + 1× Kukuřice | 2 min | 11 | 18 | 105 | 315 |  |
| Ovesná krmná směs | Krmivárna | 3 | 1 | 1× Oves + 1× Kukuřice | 4 min | 28 | 42 | 105 | 315 | alternativní recept |
| Krmivo pro slepice s otrubami | Krmivárna | 3 | 1 | 1× Otruby + 1× Pšenice + 1× Kukuřice | 3 min | 13 | 21 | 80 | 240 | alternativní recept |
| Sójová mouka | Mlýn | 3 | 2 | 3× Sója | 6 min | 54 | 73 | 95 | 285 |  |
| Ovesné vločky | Mlýn | 3 | 2 | 3× Oves | 7 min | 60 | 81 | 90 | 270 |  |
| Sušené švestky | Sušárna ovoce | 3 | 3 | 3× Švestka | 12 min | 36 | 57 | 53 | 158 |  |
| Ovocný čaj | Sušárna ovoce | 3 | 4 | 1× Křížaly + 2× Rybíz | 10 min | 66 | 91 | 75 | 225 |  |
| Jablečný závin | Pekárna | 3 | 4 | 1× Mouka + 3× Jablko | 15 min | 47 | 73 | 52 | 156 |  |
| Švestkové knedlíky | Pekárna | 3 | 4 | 1× Mouka + 3× Švestka | 15 min | 53 | 81 | 56 | 168 |  |
| Třešňová bublanina | Pekárna | 3 | 4 | 1× Mouka + 1× Vejce + 2× Třešně | 15 min | 88 | 123 | 70 | 210 |  |
| Angreštový koláč | Pekárna | 3 | 4 | 1× Mouka + 1× Vejce + 3× Angrešt | 15 min | 82 | 115 | 66 | 198 |  |
| Třešňový koláč | Pekárna | 3 | 9 | 2× Mouka + 2× Třešně + 1× Vejce | 20 min | 105 | 148 | 65 | 194 |  |
| Krmivo pro krávy | Krmivárna | 4 | 1 | 2× Kukuřice + 1× Mrkev | 5 min | 28 | 41 | 78 | 234 |  |
| Mrkvová šťáva | Džusárna | 4 | 1 | 3× Mrkev | 8 min | 36 | 53 | 64 | 191 |  |
| Jablečný džus | Džusárna | 4 | 1 | 4× Jablko | 10 min | 40 | 60 | 60 | 180 |  |
| Hruškový džus | Džusárna | 4 | 1 | 3× Hruška | 10 min | 42 | 62 | 60 | 180 |  |
| Malinový sirup | Džusárna | 4 | 1 | 3× Maliny | 10 min | 24 | 41 | 51 | 153 |  |
| Třešňový džus | Džusárna | 4 | 3 | 3× Třešně | 12 min | 54 | 79 | 63 | 188 |  |
| Višňový džus | Džusárna | 4 | 4 | 3× Višně | 12 min | 48 | 72 | 60 | 180 |  |
| Sušené borůvky | Sušárna ovoce | 4 | 4 | 3× Borůvky | 12 min | 27 | 46 | 48 | 143 |  |
| Pražená semínka | Mlýn | 4 | 6 | 4× Semena slunečnice | 8 min | 48 | 68 | 75 | 225 |  |
| Sójový chléb | Pekárna | 4 | 6 | 1× Sójová mouka + 2× Pšenice | 14 min | 79 | 111 | 69 | 206 |  |
| Sušené meruňky | Sušárna ovoce | 4 | 7 | 3× Meruňka | 15 min | 60 | 89 | 58 | 174 |  |
| Ovesné sušenky | Pekárna | 4 | 7 | 1× Ovesné vločky + 1× Pšenice + 1× Vejce | 15 min | 119 | 160 | 82 | 246 |  |
| Višňový koláč | Pekárna | 4 | 8 | 1× Mouka + 2× Višně + 1× Vejce | 18 min | 84 | 121 | 62 | 185 |  |
| Chléb se semínky | Pekárna | 4 | 9 | 2× Mouka + 2× Semena slunečnice | 15 min | 58 | 87 | 58 | 174 |  |
| Třešňový ovesný koláč | Pekárna | 4 | 9 | 2× Třešně + 1× Ovesné vločky + 1× Vejce | 20 min | 152 | 204 | 78 | 234 |  |
| Borůvkové muffiny | Pekárna | 4 | 10 | 1× Mouka + 2× Borůvky + 1× Vejce | 15 min | 70 | 101 | 62 | 186 |  |
| Smetana | Mlékárna | 5 | 1 | 1× Mléko | 10 min | 71 | 97 | 78 | 234 |  |
| Sýr | Mlékárna | 5 | 3 | 2× Mléko | 20 min | 142 | 192 | 75 | 225 |  |
| Ovocný jogurt | Mlékárna | 5 | 3 | 1× Mléko + 1× Jahody + 1× Maliny | 15 min | 94 | 130 | 72 | 216 |  |
| Zeleninová pomazánka | Mlékárna | 5 | 3 | 1× Smetana + 2× Ředkvička | 12 min | 105 | 140 | 88 | 263 |  |
| Máslo | Mlékárna | 5 | 4 | 2× Smetana | 15 min | 194 | 250 | 112 | 336 |  |
| Hroznový mošt | Džusárna | 5 | 7 | 3× Hrozny | 15 min | 48 | 75 | 54 | 162 |  |
| Broskvový sirup | Džusárna | 5 | 7 | 3× Broskev | 15 min | 72 | 103 | 62 | 186 |  |
| Rozinky | Sušárna ovoce | 5 | 10 | 3× Hrozny | 15 min | 48 | 75 | 54 | 162 |  |
| Zeleninový salát | Konzervárna | 6 | 1 | 2× Salát + 1× Rajče + 1× Okurka + 1× Ředkvička | 5 min | 33 | 47 | 84 | 252 |  |
| Med | Medárna | 6 | 1 | 2× Plástev medu | 5 min | 24 | 36 | 72 | 216 |  |
| Rybí polévka | Rybárna | 6 | 1 | 2× Plotice + 1× Cibule + 1× Brambory | 15 min | 42 | 67 | 50 | 150 |  |
| Ovocný salát | Cukrárna | 6 | 1 | 1× Jablko + 1× Hruška + 1× Maliny + 1× Třešně | 10 min | 50 | 72 | 66 | 198 |  |
| Jahodové knedlíky | Cukrárna | 6 | 1 | 1× Mouka + 2× Jahody + 1× Smetana | 15 min | 144 | 190 | 92 | 276 |  |
| Kyselé okurky | Konzervárna | 6 | 3 | 3× Okurka + 1× Česnek | 15 min | 44 | 70 | 52 | 156 |  |
| Kečup | Konzervárna | 6 | 3 | 4× Rajče + 1× Cibule | 15 min | 47 | 73 | 52 | 156 |  |
| Svíčka z vosku | Medárna | 6 | 3 | 3× Plástev medu | 10 min | 36 | 55 | 57 | 171 |  |
| Smažený kapr | Rybárna | 6 | 3 | 1× Kapr + 1× Mouka + 1× Vejce | 15 min | 66 | 96 | 60 | 180 |  |
| Rybí karbanátky | Rybárna | 6 | 3 | 2× Karas + 1× Cejn + 1× Mouka | 15 min | 43 | 69 | 52 | 156 |  |
| Ovocná zmrzlina | Cukrárna | 6 | 3 | 1× Mléko + 1× Smetana + 2× Jahody | 15 min | 198 | 255 | 114 | 342 |  |
| Medové ořechy | Medárna | 6 | 3 | 2× Ořechy + 1× Med | 12 min | 80 | 110 | 75 | 225 |  |
| Lečo | Konzervárna | 6 | 4 | 2× Paprika + 2× Rajče + 1× Cibule | 20 min | 61 | 95 | 51 | 153 |  |
| Pečený lín | Rybárna | 6 | 4 | 2× Lín + 1× Česnek | 20 min | 46 | 77 | 47 | 140 |  |
| Ovocný dort | Cukrárna | 6 | 4 | 2× Mouka + 2× Vejce + 1× Smetana + 1× Maliny + 1× Třešně | 30 min | 227 | 304 | 77 | 231 |  |
| Hrachová pomazánka | Konzervárna | 6 | 5 | 2× Hrách + 1× Česnek | 14 min | 56 | 83 | 58 | 174 |  |
| Kysané zelí | Konzervárna | 6 | 6 | 2× Zelí + 1× Cibule | 20 min | 51 | 83 | 48 | 144 |  |
| Rybí prsty | Rybárna | 6 | 6 | 2× Okoun + 1× Mouka | 15 min | 53 | 81 | 56 | 168 |  |
| Koprové okurky | Konzervárna | 6 | 6 | 2× Okurka + 1× Česnek + 1× Kopr | 18 min | 50 | 80 | 50 | 150 |  |
| Hrachová polévka | Konzervárna | 6 | 7 | 2× Hrách + 1× Brambory + 1× Cibule | 20 min | 68 | 104 | 54 | 162 |  |
| Perník | Pekárna | 6 | 7 | 1× Mouka + 1× Med | 10 min | 53 | 76 | 69 | 207 |  |
| Bylinková rybí polévka | Rybárna | 6 | 8 | 2× Plotice + 1× Brambory + 1× Petržel | 18 min | 46 | 75 | 48 | 145 |  |
| Kapr s petrželí | Rybárna | 6 | 8 | 1× Kapr + 1× Máslo + 1× Petržel | 22 min | 279 | 359 | 109 | 327 |  |
| Dýňová polévka | Konzervárna | 6 | 9 | 1× Dýně + 1× Cibule + 1× Smetana | 20 min | 138 | 188 | 75 | 225 |  |
| Medovník | Pekárna | 6 | 9 | 2× Mouka + 1× Med + 2× Vejce | 25 min | 140 | 195 | 66 | 198 |  |
| Amur na grilu | Rybárna | 6 | 9 | 1× Amur + 1× Česnek + 1× Paprika | 20 min | 58 | 92 | 51 | 153 |  |
| Candát na másle | Rybárna | 6 | 10 | 1× Candát + 1× Máslo | 20 min | 280 | 358 | 117 | 351 |  |
| Štika na cibulce | Rybárna | 6 | 13 | 1× Štika + 2× Cibule | 20 min | 58 | 92 | 51 | 153 |  |
| Bolen na bylinkách | Rybárna | 6 | 15 | 1× Bolen + 1× Máslo + 1× Cibule | 20 min | 301 | 383 | 123 | 369 |  |
| Bolen s koprem | Rybárna | 6 | 15 | 1× Bolen + 1× Máslo + 1× Kopr | 25 min | 306 | 394 | 106 | 317 |  |
| Sumcový guláš | Rybárna | 6 | 18 | 1× Sumec + 2× Paprika + 1× Cibule | 30 min | 93 | 144 | 51 | 153 |  |
| Kaviár | Rybárna | 6 | 22 | 1× Jeseter | 30 min | 70 | 116 | 46 | 138 |  |
| Krmivo pro prasata | Krmivárna | 7 | 1 | 2× Brambory + 1× Kukuřice + 1× Salát | 5 min | 43 | 59 | 96 | 288 |  |
| Řepkový olej | Olejna | 7 | 1 | 2× Řepka | 10 min | 44 | 65 | 63 | 189 |  |
| Švestková povidla | Marmeládárna | 7 | 1 | 4× Švestka | 15 min | 48 | 75 | 54 | 162 |  |
| Slunečnicový olej | Olejna | 7 | 3 | 3× Slunečnice | 12 min | 78 | 108 | 75 | 225 |  |
| Sójový olej | Olejna | 7 | 4 | 3× Sója | 14 min | 54 | 81 | 58 | 174 |  |
| Krmivo pro prasata s pokrutinami | Krmivárna | 7 | 4 | 1× Pokrutiny + 1× Brambory + 1× Kukuřice | 6 min | 39 | 59 | 100 | 300 | alternativní recept |
| Lněný olej | Olejna | 7 | 5 | 3× Len | 15 min | 90 | 125 | 70 | 210 |  |
| Dýňový olej | Olejna | 7 | 7 | 4× Semena dýně | 15 min | 48 | 75 | 54 | 162 |  |
| Bramboráky | Pekárna | 7 | 7 | 2× Brambory + 1× Vejce + 1× Řepkový olej | 18 min | 130 | 176 | 77 | 230 |  |
| Zelenina v oleji | Konzervárna | 7 | 7 | 1× Paprika + 1× Rajče + 1× Slunečnicový olej | 22 min | 133 | 184 | 70 | 209 |  |
| Ovocná krmná směs pro prasata | Krmivárna | 7 | 7 | 1× Ovocné výlisky + 1× Brambory + 1× Kukuřice | 6 min | 39 | 59 | 100 | 300 | alternativní recept |
| Dýňové placičky | Pekárna | 7 | 8 | 1× Dýně + 1× Vejce + 1× Řepkový olej | 16 min | 130 | 174 | 83 | 248 |  |
| Mistrovský rybí talíř | Rybárna | 7 | 25 | 1× Candát + 1× Štika + 1× Řepkový olej + 1× Petržel | 40 min | 146 | 217 | 53 | 160 |  |
| Cukr | Cukrovar | 8 | 1 | 2× Cukrová řepa | 10 min | 60 | 84 | 72 | 216 |  |
| Klobása | Uzenářství | 8 | 1 | 2× Maso + 1× Česnek | 20 min | 214 | 279 | 98 | 293 |  |
| Uzený pstruh | Uzenářství | 8 | 1 | 2× Pstruh | 25 min | 48 | 85 | 44 | 133 |  |
| Uzené maso | Uzenářství | 8 | 3 | 2× Maso | 25 min | 200 | 267 | 80 | 241 |  |
| Malinový džem | Marmeládárna | 8 | 4 | 3× Maliny + 1× Cukr | 15 min | 108 | 147 | 78 | 234 |  |
| Jahodový džem | Marmeládárna | 8 | 4 | 3× Jahody + 1× Cukr | 15 min | 129 | 172 | 86 | 258 |  |
| Rybízová marmeláda | Marmeládárna | 8 | 4 | 3× Rybíz + 1× Cukr | 15 min | 111 | 150 | 78 | 234 |  |
| Krmivo pro krávy s řepnými řízky | Krmivárna | 8 | 5 | 1× Řepné řízky + 1× Kukuřice + 1× Mrkev | 6 min | 26 | 41 | 75 | 225 | alternativní recept |
| Angreštový kompot | Konzervárna | 8 | 6 | 3× Angrešt + 1× Cukr | 15 min | 114 | 154 | 80 | 240 |  |
| Meruňkový džem | Marmeládárna | 8 | 6 | 3× Meruňka + 1× Cukr | 15 min | 144 | 190 | 92 | 276 |  |
| Uzený úhoř | Uzenářství | 8 | 6 | 2× Úhoř | 25 min | 68 | 109 | 49 | 148 |  |
| Višňová marmeláda | Marmeládárna | 8 | 6 | 3× Višně + 1× Cukr | 17 min | 132 | 177 | 79 | 238 |  |
| Ořechový krém | Cukrárna | 8 | 8 | 2× Ořechy + 1× Med + 1× Smetana | 18 min | 177 | 232 | 92 | 275 |  |
| Broskvový kompot | Konzervárna | 8 | 9 | 3× Broskev + 1× Cukr | 20 min | 156 | 209 | 80 | 239 |  |
| Melounový nápoj | Džusárna | 8 | 9 | 1× Meloun + 1× Cukr | 10 min | 118 | 154 | 108 | 324 |  |
| Buchty | Pekárna | 8 | 12 | 2× Mouka + 1× Cukr + 1× Vejce | 15 min | 153 | 201 | 96 | 288 |  |
| Ořechový koláč | Pekárna | 8 | 16 | 2× Mouka + 2× Ořechy + 1× Cukr | 25 min | 162 | 221 | 71 | 212 |  |
| Slavnostní ovocný dort | Cukrárna | 8 | 30 | 2× Mouka + 2× Vejce + 1× Smetana + 2× Višně + 1× Cukr | 45 min | 317 | 427 | 73 | 220 |  |
| Farmářská hostina | Uzenářství | 8 | 40 | 1× Klobása + 1× Uzené maso + 2× Brambory + 1× Paprika | 50 min | 592 | 762 | 102 | 306 |  |
| Krmivo pro ovce | Krmivárna | 9 | 1 | 2× Pšenice + 1× Zelí + 1× Sója | 6 min | 44 | 61 | 85 | 255 |  |
| Klubko vlny | Textilka | 10 | 1 | 2× Vlna | 15 min | 214 | 274 | 120 | 360 |  |
| Svetr | Textilka | 10 | 3 | 2× Klubko vlny | 30 min | 548 | 690 | 142 | 426 |  |
| Vlněná deka | Textilka | 10 | 4 | 3× Klubko vlny | 40 min | 822 | 1028 | 155 | 464 |  |
| Lněná příze | Textilka | 10 | 6 | 3× Len | 18 min | 90 | 128 | 63 | 190 |  |
| Lněná tkanina | Textilka | 10 | 9 | 2× Lněná příze | 25 min | 256 | 334 | 94 | 281 |  |
| Lněný ubrus | Textilka | 10 | 14 | 2× Lněná tkanina | 35 min | 668 | 839 | 147 | 440 |  |
