# EKOfarm v47 – simulace rybaření (vygenerováno `node tools/fish-sim.mjs`)

Všechno počítají skutečná pravidla hry (`public/js/rules.js`). Úspěšnost minihry hraje **automat**, ne skuteční hráči: klepe podle polohy šipky a zóny, s reakcí 0,08–0,35 s a nejvýš 4–10 klepnutími za sekundu podle „šikovnosti“. Skutečnou úspěšnost je potřeba ověřit hraním (návrh: sbírat počet úspěšných a uniklých ryb podle profilu a udice).

## 1. Vliv návnady na druh (10 000 losů, podíl oblíbených ryb návnady)
| Voda / Rybaření | Návnada | Oblíbené ryby, které tu berou | Bez návnady | S návnadou | Poměr |
|---|---|---|---|---|---|
| Rybník / 12 | Červ | Plotice, Karas, Cejn, Perlín ostrobřichý, Ouklej obecná, Ježdík obecný, Okoun | 63 % | 76 % | 1,20× |
| Rybník / 12 | Kukuřice | Kapr, Amur, Cejn, Karas | 35 % | 51 % | 1,46× |
| Rybník / 12 | Těsto | Plotice, Karas, Lín, Cejnek malý, Cejn | 47 % | 62 % | 1,32× |
| Rybník / 12 | Rohlík | Kapr, Perlín ostrobřichý | 21 % | 34 % | 1,61× |
| Rybník / 12 | Hrášek | Amur, Kapr, Lín | 23 % | 34 % | 1,50× |
| Rybník / 12 | Sýr | Lín | 8 % | 14 % | 1,61× |
| Rybník / 12 | Třpytka | Okoun, Candát, Pstruh | 15 % | 26 % | 1,69× |
| Větší rybník / 20 | Červ | Plotice, Karas, Cejn, Perlín ostrobřichý, Ouklej obecná, Ježdík obecný, Okoun | 52 % | 66 % | 1,28× |
| Větší rybník / 20 | Kukuřice | Kapr, Amur, Cejn, Karas | 29 % | 43 % | 1,51× |
| Větší rybník / 20 | Těsto | Plotice, Karas, Lín, Cejnek malý, Cejn | 39 % | 55 % | 1,41× |
| Větší rybník / 20 | Rohlík | Kapr, Perlín ostrobřichý, Jelec tloušť, Jelec jesen | 26 % | 39 % | 1,53× |
| Větší rybník / 20 | Hrášek | Amur, Kapr, Lín | 19 % | 30 % | 1,58× |
| Větší rybník / 20 | Sýr | Lín, Jelec tloušť, Jelec jesen | 14 % | 22 % | 1,64× |
| Větší rybník / 20 | Masová návnada | Sumec, Úhoř | 4 % | 9 % | 2,02× |
| Větší rybník / 20 | Třpytka | Štika, Okoun, Candát, Bolen, Pstruh | 18 % | 29 % | 1,60× |
| Jezero / 50 | Červ | Plotice, Karas, Cejn, Perlín ostrobřichý, Ouklej obecná, Ježdík obecný, Okoun | 44 % | 59 % | 1,33× |
| Jezero / 50 | Kukuřice | Kapr, Amur, Cejn, Tolstolobik bílý, Karas | 28 % | 41 % | 1,51× |
| Jezero / 50 | Těsto | Plotice, Karas, Lín, Cejnek malý, Cejn, Síh maréna | 34 % | 50 % | 1,44× |
| Jezero / 50 | Rohlík | Kapr, Perlín ostrobřichý, Jelec tloušť, Jelec jesen | 22 % | 36 % | 1,61× |
| Jezero / 50 | Hrášek | Amur, Kapr, Tolstolobik bílý, Lín | 19 % | 30 % | 1,59× |
| Jezero / 50 | Sýr | Lín, Jelec tloušť, Jelec jesen, Mník jednovousý | 13 % | 23 % | 1,74× |
| Jezero / 50 | Masová návnada | Sumec, Úhoř, Mník jednovousý, Jeseter | 7 % | 12 % | 1,80× |
| Jezero / 50 | Třpytka | Štika, Okoun, Candát, Bolen, Pstruh, Siven americký | 20 % | 31 % | 1,60× |

Návnada mění jen poměr mezi druhy, které v dané vodě a s danou úrovní Rybaření berou (násobek 1,6 oblíbené / 0,85 ostatní); nikdy nepřidá zamčený druh a nikdy nezaručí konkrétní rybu.

## 2. Úspěšnost minihry (automat, 300 soubojů na buňku) a průměrná délka úspěšného souboje
| Udice | Hráč | Profil 1 (lehká) | Profil 2 (střední) | Profil 3 (těžká) |
|---|---|---|---|---|
| Lísková udice (1) | pozorný | 100 % · 9,3 s | 100 % · 10,8 s | 100 % · 18,1 s |
| Lísková udice (1) | průměrný | 100 % · 9,4 s | 100 % · 11,7 s | 97 % · 22,2 s |
| Lísková udice (1) | začátečník | 100 % · 9,5 s | 100 % · 13,6 s | 44 % · 27,0 s |
| Lísková udice (1) | náhodné klepání | 0 % · 17,5 s | 0 % | 0 % |
| Karbonová udice (5) | pozorný | 100 % · 8,4 s | 100 % · 9,6 s | 100 % · 13,9 s |
| Karbonová udice (5) | průměrný | 100 % · 8,4 s | 100 % · 9,9 s | 100 % · 16,1 s |
| Karbonová udice (5) | začátečník | 100 % · 8,5 s | 100 % · 10,7 s | 98 % · 20,4 s |
| Karbonová udice (5) | náhodné klepání | 1 % · 16,5 s | 0 % | 0 % |
| Zlatý prut (10) | pozorný | 100 % · 7,4 s | 100 % · 8,4 s | 100 % · 10,6 s |
| Zlatý prut (10) | průměrný | 100 % · 7,5 s | 100 % · 8,4 s | 100 % · 12,2 s |
| Zlatý prut (10) | začátečník | 100 % · 7,5 s | 100 % · 8,8 s | 100 % · 14,5 s |
| Zlatý prut (10) | náhodné klepání | 2 % · 17,0 s | 0 % · 14,7 s | 0 % |

Profil obtížnosti posílá server (1 = ryba s obtížností pod 0,35, 2 = do 0,65, 3 = těžší; velký kus občas o stupeň výš). Z profilu nejde poznat druh – v každém je víc ryb. Lepší udice = širší zóna, rychlejší postup a pomalejší napětí; náhodné klepání skoro nikdy neuspěje.

## 3. Hodnota úlovku za nához proti ceně návnady (pozorný hráč, úspěšný úlovek)
Cena návnady = prodejní cena položky ve skladu (to, o co hráč přijde, když ji místo prodeje nahodí). Hodnota úlovku = průměr ceny ryby × počtu kusů podle velikosti.

| Voda / Rybaření | Červ | Kukuřice | Těsto | Rohlík | Hrášek | Sýr | Masová návnada | Třpytka |
|---|---|---|---|---|---|---|---|---|
| Rybník / 6 | 4 → 16 (+12) | 8 → 16 (+8) | 6 → 16 (+10) | 13 → 17 (+4) | 21 → 17 (-4) | — | — | — |
| Větší rybník / 12 | 4 → 20 (+16) | 8 → 21 (+13) | 6 → 20 (+14) | 13 → 23 (+10) | 21 → 22 (+1) | 192 → 23 (-169) | 42 → 22 (-20) | 18 → 23 (+5) |
| Velký rybník / 15 | 4 → 24 (+20) | 8 → 25 (+17) | 6 → 24 (+18) | 13 → 26 (+13) | 21 → 26 (+5) | 192 → 27 (-165) | 42 → 27 (-15) | 18 → 27 (+9) |
| Jezero / 25 | 4 → 29 (+25) | 8 → 31 (+23) | 6 → 29 (+23) | 13 → 31 (+18) | 21 → 32 (+11) | 192 → 32 (-160) | 42 → 34 (-8) | 18 → 33 (+15) |
| Jezero / 40 | 4 → 32 (+28) | 8 → 34 (+26) | 6 → 33 (+27) | 13 → 34 (+21) | 21 → 35 (+14) | 192 → 35 (-157) | 42 → 38 (-4) | 18 → 36 (+18) |

Zápis: cena návnady → průměrná hodnota úlovku (rozdíl za nához). „—“ = návnada je na téhle úrovni ještě zamčená.

**Ekonomická poznámka:** Hrášek je dražší než průměrný úlovek (Rybník / 6); Sýr je dražší než průměrný úlovek (Větší rybník / 12, Velký rybník / 15, Jezero / 25, Jezero / 40); Masová návnada je dražší než průměrný úlovek (Větší rybník / 12, Velký rybník / 15, Jezero / 25, Jezero / 40). Sýr je podle zadání existující výrobek z Mlékárny (žádný nový), masová návnada je navržený recept 1 maso → 3 kusy. Obojí je volba hráče – návnada jen zvýší šanci na své ryby, nic nezaručí a cena je vidět ve skladu. Pokud se má sýr a masová návnada vyplácet i průměrně, je potřeba po zkušenostech hráčů upravit recept (např. 1 maso → 6) nebo ceny ryb – v této verzi zůstávají přesně podle zadání.

Kukuřice, hrách a rohlík jsou zároveň zboží, takže hráč „platí“ jejich cenou. Lepší udice navíc občas návnadu ušetří.

## 4. Server
Ověření souboje = jedno přehrání při vylovení (žádný průběžný výpočet každého snímku): 0,044 ms na souboj (610 kroků).
