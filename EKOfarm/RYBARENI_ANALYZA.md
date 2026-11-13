# EKOfarm v47 – analýza rybaření, návnad a pečiva (vygenerováno `node tools/fish-docs.mjs`)

Zdroj: skutečná pravidla `public/js/rules.js` a `public/js/eco-config.js`; návrh ze zadání `audit/v47_navrh_*.json`. Zapnuté skupiny: `eco_recipes`, `eco_planner`, `eco_byproducts`, `eco_straw`, `eco_crops`, `eco_mastery`, `fishing_minigame_v2`, `fishing_baits_v2`, `fishing_fish_pack_v2`, `bakery_extra_v2`.

## 1. Co hra měla před v47 a co přibylo
| Oblast | EXISTUJÍCÍ (v46) | v47 |
|---|---|---|
| Rybaření – akce | `fishCast` + `fishLand`; druh ryby se losoval v prohlížeči i na serveru stejně (deterministicky ze seedu farmy), minihra jen v prohlížeči | Stejné akce, nově **serverové tajemství**: druh a váhu losuje jen server (`farm.sx`, do prohlížeče se nikdy neposílá), klient dostane jen profil obtížnosti 1–3; výsledek souboje server ověří přehráním klepnutí. Nová akce `fishGiveUp` (vzdát se). Idempotentní klíč `k`, jeden nához na hráče. |
| Minihra | Původní rybaření (v26) | Nová minihra: farmář s prutem (5 póz), nához, čekání na záběr, souboj se šipkou a zelenou zónou, postup chytání, napětí vlasce, výsledek. Pevný krok 30 Hz, max. 35 s. Původní kód zůstává za přepínačem `fishing_minigame_v2`. |
| Návnada | 1 položka „Návnada“ (`navnada`, Krmivárna: 1× Pšenice, 1× Kukuřice → 3) | 8 návnad (`BAITS`), okénko „Vyber návnadu“ před náhozem; `navnada` zůstává stejné ID, jen se jmenuje „Těsto na ryby“ |
| Ryby | 14 druhů | 24 druhů (+10), stejné ID starých ryb |
| Vodní plochy | Rybník 5, Větší rybník 8, Velký rybník 15, Jezero 20 | beze změny (žádná nová budova, kapacity stejné) |
| Udice | 10 udic | beze změny; lepší udice = širší zóna, rychlejší postup, pomalejší napětí |
| Deník a rekordy | `farm.fj` (ulovené druhy, rekordy vah) | stejný deník + nově „bral(a) na: …“ (`farm.fj.b`), poslední návnada `farm.fb` |
| Denní úkoly | 10 druhů (mezi nimi „Ulovit ryb“) | + „Nahodit s návnadou“ (`stats.cast`) a „Uvařit rybích jídel“ (`stats.fishdish`), jen se zapnutou minihrou a s rybníkem a udicí |
| Rybí recepty | 15 v Rybárně (+ uzené ryby v Uzenářství) | +16 (Rybárna 13, Pekárna 1, Uzenářství 2) |
| Pečivo | 20 receptů v Pekárně | +18 pečiv + Rohlík (pečivo i návnada) |
| Plodiny | 24 | + Žito, Mák |

Databáze: **žádná migrace**. Farma je JSON v D1 (`farms.data`); nová pole jsou volitelná a `normalize()` je doplní: `sx` (tajemství serveru, jen na serveru), `fb`, `fj.b`, `stats.cast`, `stats.fishdish`, `hook` u rybníka (rozběhnutý nához). Stará farma se načte beze změny zásob.

## 2. Ryby – stabilní ID
| ID | Ryba | Nejmenší voda | Rybaření | Váha | Cena | Obtížnost | Návrh ze zadání |
|---|---|---|---|---|---|---|---|
| `plotice` | Plotice | Rybník | 1 | 0,1–0,6 kg | 8 | 0,15 | stávající |
| `karas` | Karas | Rybník | 1 | 0,2–1,5 kg | 7 | 0,1 | stávající |
| `kapr` | Kapr | Rybník | 2 | 1–12 kg | 14 | 0,3 | stávající |
| `cejn` | Cejn | Rybník | 3 | 0,5–4 kg | 12 | 0,3 | stávající |
| `lin` | Lín | Rybník | 4 | 0,5–4 kg | 16 | 0,35 | stávající |
| `okoun` | Okoun | Rybník | 5 | 0,2–2 kg | 18 | 0,45 | stávající |
| `pstruh` | Pstruh | Rybník | 7 | 0,5–5 kg | 24 | 0,55 | stávající |
| `amur` | Amur | Rybník | 9 | 2–25 kg | 28 | 0,6 | stávající |
| `candat` | Candát | Rybník | 11 | 1–10 kg | 30 | 0,65 | stávající |
| `uhor` | Úhoř | Rybník | 13 | 0,5–4 kg | 34 | 0,7 | stávající |
| `stika` | Štika | Rybník | 15 | 1–15 kg | 36 | 0,75 | stávající |
| `bolen` | Bolen | Rybník | 17 | 1–8 kg | 40 | 0,8 | stávající |
| `sumec` | Sumec | Rybník | 20 | 5–80 kg | 50 | 0,9 | stávající |
| `jeseter` | Jeseter | Rybník | 24 | 5–60 kg | 70 | 0,95 | stávající |
| `perlin` | Perlín ostrobřichý *(v47)* | Rybník | 2 | 0,1–1 kg | 14 | 0,3 | `eco_fish_perlin_ostrobrichy`: Rybaření 2, Rybník |
| `ouklej` | Ouklej obecná *(v47)* | Rybník | 4 | 0,02–0,08 kg | 16 | 0,35 | `eco_fish_ouklej_obecna`: Rybaření 4, Rybník |
| `cejnek` | Cejnek malý *(v47)* | Rybník | 6 | 0,1–0,8 kg | 21 | 0,5 | `eco_fish_cejnek_maly`: Rybaření 6, Rybník |
| `jezdik` | Ježdík obecný *(v47)* | Rybník | 7 | 0,02–0,15 kg | 24 | 0,55 | `eco_fish_jezdik_obecny`: Rybaření 7, Rybník |
| `tloust` | Jelec tloušť *(v47)* | Větší rybník | 8 | 0,3–4 kg | 26 | 0,57 | `eco_fish_jelec_tloust`: Rybaření 8, Větší rybník |
| `jesen` | Jelec jesen *(v47)* | Větší rybník | 12 | 0,3–3 kg | 32 | 0,68 | `eco_fish_jelec_jesen`: Rybaření 12, Větší rybník |
| `tolstolobik` | Tolstolobik bílý *(v47)* | Velký rybník | 15 | 2–30 kg | 36 | 0,75 | `eco_fish_tolstolobik_bily`: Rybaření 15, Velký rybník |
| `siven` | Siven americký *(v47)* | Jezero | 20 | 0,2–2 kg | 50 | 0,9 | `eco_fish_siven_americky`: Rybaření 20, Jezero |
| `marena` | Síh maréna *(v47)* | Jezero | 27 | 0,3–3 kg | 79 | 0,97 | `eco_fish_sih_marena`: Rybaření 27, Jezero |
| `mnik` | Mník jednovousý *(v47)* | Jezero | 35 | 0,5–5 kg | 102 | 0,97 | `eco_fish_mnik_jednovousy`: Rybaření 35, Jezero |

Cena, obtížnost a váha nových ryb se dopočítaly z úrovně Rybaření podle stávajících ryb (interpolace) – návrh je nechal prázdné (`base_price: null`).

## 3. Návnady – stabilní ID
| ID návnady | Návnada | Skladová položka | Odemčení | Oblíbené ryby | Návrh ze zadání |
|---|---|---|---|---|---|
| `cerv` | Červ | `cerv` (Červ) | Statek 3, Rybaření 1 | Plotice, Karas, Cejn, Perlín ostrobřichý, Ouklej obecná, Ježdík obecný, Okoun | `bait_worm`: Statek 3, Rybaření 1 |
| `kukurice` | Kukuřice | `corn` (Kukuřice) | Statek 3, Rybaření 1 | Kapr, Amur, Cejn, Tolstolobik bílý, Karas | `bait_corn`: Statek 3, Rybaření 1 |
| `testo` | Těsto | `navnada` (Těsto na ryby) | Statek 3, Rybaření 1 | Plotice, Karas, Lín, Cejnek malý, Cejn, Síh maréna | `bait_dough`: Statek 3, Rybaření 1 |
| `rohlik` | Rohlík | `rohlik` (Rohlík) | Statek 3, Rybaření 2 | Kapr, Perlín ostrobřichý, Jelec tloušť, Jelec jesen | `bait_roll`: Statek 3, Rybaření 2 |
| `hrasek` | Hrášek | `hrach` (Hrách) | Statek 5, Rybaření 4 | Amur, Kapr, Tolstolobik bílý, Lín | `bait_pea`: Statek 5, Rybaření 4 |
| `syr` | Sýr | `syr` (Sýr) | Statek 5, Rybaření 8 | Lín, Jelec tloušť, Jelec jesen, Mník jednovousý | `bait_cheese`: Statek 5, Rybaření 8 |
| `maso` | Masová návnada | `masova_navnada` (Masová návnada) | Statek 7, Rybaření 12 | Sumec, Úhoř, Mník jednovousý, Jeseter | `bait_meat`: Statek 7, Rybaření 12 |
| `trpytka` | Třpytka | `trpytka` (Třpytka) | Statek 7, Rybaření 12 | Štika, Okoun, Candát, Bolen, Pstruh, Siven americký | `bait_lure`: Statek 7, Rybaření 12 |

Návnada násobí šanci oblíbených ryb 1,6× a ostatních 0,85× – jen mezi druhy, které v dané vodě a s danou úrovní berou. Kukuřice, hrách, sýr a rohlík jsou stávající zboží (žádná druhá položka); červ a třpytka se kupují ve Stánku (Zásoby) za mince; masová návnada je recept v Krmivárně.

## 4. Recepty a plodiny: návrh → skutečné ID a hodnoty
| Skutečné ID | Název | Budova | Statek / Vaření | Čas | Suroviny → kusů | Cena | Návrh ze zadání | Rozdíl proti návrhu |
|---|---|---|---|---|---|---|---|---|
| `rybi_jednohubky` | Rybí jednohubky | Rybárna | 6 / 3 | 12 min | 2× Ouklej obecná, 1× Chléb → 1 | 74 | `eco_rec_rybi_jednohubky` | podle návrhu |
| `perlin_cesnek` | Perlín na česneku | Rybárna | 6 / 5 | 15 min | 2× Perlín ostrobřichý, 1× Česnek → 1 | 67 | `eco_rec_perlin_na_cesneku` | podle návrhu |
| `cejnek_testicko` | Cejnek v těstíčku | Rybárna | 6 / 6 | 15 min | 2× Cejnek malý, 1× Vejce, 1× Mouka → 1 | 130 | `eco_rec_cejnek_v_testicku` | podle návrhu |
| `polevka_jezdik` | Polévka z ježdíka | Rybárna | 6 / 7 | 18 min | 2× Ježdík obecný, 1× Brambory, 1× Cibule → 1 | 109 | `eco_rec_polevka_z_jezdika` | podle návrhu |
| `tloust_cibule` | Tloušť na cibuli | Rybárna | 6 / 8 | 20 min | 1× Jelec tloušť, 1× Cibule → 1 | 66 | `eco_rec_tloust_na_cibuli` | podle návrhu |
| `rybi_pomazanka` | Rybí pomazánka | Rybárna | 6 / 9 | 18 min | 2× Plotice, 1× Smetana, 1× Cibule → 1 | 169 | `eco_rec_rybi_pomazanka` | podle návrhu |
| `jesen_zelenina` | Jesen se zeleninou | Rybárna | 6 / 12 | 22 min | 1× Jelec jesen, 1× Paprika, 1× Mrkev → 1 | 96 | `eco_rec_jesen_se_zeleninou` | podle návrhu |
| `pstruh_maslo` | Pstruh na másle | Rybárna | 6 / 13 | 20 min | 1× Pstruh, 1× Máslo → 1 | 351 | `eco_rec_pstruh_na_masle` | podle návrhu |
| `rybi_kolac` | Rybí koláč | Pekárna | 6 / 14 | 25 min | 1× Pstruh, 2× Mouka, 1× Vejce → 1 | 139 | `eco_rec_rybi_kolac` | podle návrhu |
| `tolstolobik_zelenina` | Tolstolobik na zelenině | Rybárna | 7 / 15 | 25 min | 1× Tolstolobik bílý, 1× Rajče, 1× Cibule → 1 | 94 | `eco_rec_tolstolobik_na_zelenine` | podle návrhu |
| `uzeny_tolstolobik` | Uzený tolstolobik | Uzenářství | 8 / 16 | 28 min | 2× Tolstolobik bílý → 1 | 116 | `eco_rec_uzeny_tolstolobik` | podle návrhu |
| `siven_cesnek` | Siven na česneku | Rybárna | 10 / 21 | 25 min | 1× Siven americký, 1× Česnek, 1× Máslo → 1 | 404 | `eco_rec_siven_na_cesneku` | podle návrhu |
| `uzena_marena` | Uzená maréna | Uzenářství | 10 / 28 | 30 min | 2× Síh maréna → 1 | 222 | `eco_rec_uzena_marena` | podle návrhu |
| `pecena_marena` | Pečená maréna | Rybárna | 10 / 30 | 30 min | 1× Síh maréna, 1× Cibule, 1× Česnek → 1 | 157 | `eco_rec_pecena_marena` | podle návrhu |
| `mnik_maslo` | Mník na másle | Rybárna | 10 / 35 | 30 min | 1× Mník jednovousý, 1× Máslo, 1× Cibule → 1 | 468 | `eco_rec_mnik_na_masle` | podle návrhu |
| `rybi_misa` | Slavnostní rybí mísa | Rybárna | 10 / 40 | 45 min | 1× Siven americký, 1× Síh maréna, 1× Tolstolobik bílý, 1× Brambory → 1 | 263 | `eco_rec_slavnostni_rybi_misa` | podle návrhu |
| `masova_navnada` | Masová návnada | Krmivárna | 7 / 1 | 5 min | 1× Maso → 3 | 42 | `bait_meat` | podle návrhu |
| `rohlik` | Rohlík | Pekárna | 1 / 1 | 4 min | 2× Pšenice → 1 | 13 | `eco_rec_rohlik` | podle návrhu |
| `zitna_mouka` | Žitná mouka | Mlýn | 3 / 1 | 5 min | 3× Žito → 1 | 72 | `eco_item_zitna_mouka` | podle návrhu |
| `mlety_mak` | Mletý mák | Mlýn | 4 / 1 | 6 min | 3× Mák → 1 | 84 | `eco_item_mlety_mak` | podle návrhu |
| `tvaroh` | Tvaroh | Mlékárna | 5 / 1 | 12 min | 2× Mléko → 1 | 184 | `eco_item_tvaroh` | podle návrhu |
| `pletynka` | Pletýnka | Pekárna | 2 / 4 | 8 min | 3× Pšenice, 1× Vejce → 1 | 63 | `eco_rec_pletynka` | podle návrhu |
| `cibulova_placka` | Cibulová placka | Pekárna | 3 / 5 | 10 min | 1× Mouka, 1× Cibule → 1 | 46 | `eco_rec_cibulova_placka` | podle návrhu |
| `preclik` | Preclík | Pekárna | 3 / 5 | 12 min | 2× Mouka, 1× Vejce → 1 | 97 | `eco_rec_preclik` | podle návrhu |
| `zitny_bochnik` | Žitný bochník | Pekárna | 3 / 5 | 14 min | 2× Žitná mouka, 1× Pšenice → 1 | 192 | `eco_rec_zitny_bochnik` | podle návrhu |
| `cesnekova_bulka` | Česneková bulka | Pekárna | 3 / 6 | 10 min | 1× Mouka, 1× Česnek → 1 | 49 | `eco_rec_cesnekova_bulka` | podle návrhu |
| `tresnovy_satecek` | Třešňový šáteček | Pekárna | 3 / 6 | 15 min | 1× Mouka, 2× Třešně → 1 | 81 | `eco_rec_tresnovy_satecek` | podle návrhu |
| `makovy_kolacek` | Makový koláček | Pekárna | 4 / 8 | 15 min | 1× Mouka, 1× Mletý mák → 1 | 138 | `eco_rec_makovy_kolacek` | podle návrhu |
| `syrova_houska` | Sýrová houska | Pekárna | 5 / 8 | 15 min | 1× Mouka, 1× Sýr → 1 | 268 | `eco_rec_syrova_houska` | podle návrhu |
| `dynova_bulka` | Dýňová bulka | Pekárna | 5 / 9 | 15 min | 1× Mouka, 1× Dýně → 1 | 73 | `eco_rec_dynova_bulka` | podle návrhu |
| `hroznovy_kolac` | Hroznový koláč | Pekárna | 5 / 9 | 18 min | 2× Mouka, 2× Hrozny, 1× Vejce → 1 | 141 | `eco_rec_hroznovy_kolac` | podle návrhu |
| `tvarohovy_satecek` | Tvarohový šáteček | Pekárna | 5 / 10 | 18 min | 1× Mouka, 1× Tvaroh, 1× Vejce → 1 | 303 | `eco_rec_tvarohovy_satecek` | podle návrhu |
| `malinovy_croissant` | Malinový croissant | Pekárna | 5 / 11 | 20 min | 1× Mouka, 1× Smetana, 2× Maliny → 1 | 178 | `eco_rec_malinovy_croissant` | podle návrhu |
| `orechove_susenky` | Ořechové sušenky | Pekárna | 6 / 13 | 18 min | 1× Mouka, 2× Ořechy, 1× Med → 1 | 136 | `eco_rec_orechove_susenky` | podle návrhu |
| `jahodova_rolada` | Jahodová roláda | Pekárna | 6 / 14 | 24 min | 2× Mouka, 2× Jahody, 1× Smetana → 1 | 219 | `eco_rec_jahodova_rolada` | podle návrhu |
| `makovy_zavin` | Makový závin | Pekárna | 8 / 16 | 22 min | 2× Mouka, 2× Mletý mák, 1× Cukr → 1 | 367 | `eco_rec_makovy_zavin` | podle návrhu |
| `visnova_kapsa` | Višňová kapsa | Pekárna | 8 / 17 | 20 min | 1× Mouka, 2× Višně, 1× Cukr → 1 | 182 | `eco_rec_visnova_kapsa` | podle návrhu |
| `vanocka` | Vánočka | Pekárna | 8 / 20 | 30 min | 2× Mouka, 1× Vejce, 1× Mléko, 1× Cukr → 1 | 301 | `eco_rec_vanocka` | podle návrhu |
| `orechovy_venec` | Mistrovský ořechový věnec | Pekárna | 10 / 30 | 40 min | 2× Mouka, 1× Tvaroh, 1× Med, 2× Ořechy → 1 | 400 | `eco_rec_mistrovsky_orechovy_venec` | podle návrhu |
| `zito` | Žito (plodina) | pole | 3 / – | 20 min | osivo 8 → 2 | 18 | `eco_crop_zito` | podle návrhu |
| `mak` | Mák (plodina) | pole | 4 / – | 24 min | osivo 10 → 2 | 21 | `eco_crop_mak` | podle návrhu |

Ceny nejsou ručně: výrobek = (Σ surovin × 1,2 + čas v min + 2) / kusů, jako u všech receptů hry. 

## 5. Kontrola duplicit proti obsahu hry (v1–v46)
Porovnáno 39 nových receptů proti 115 stávajícím: **stejné ID výrobku 0, stejný název 0, nevysvětlená shoda surovin 0.**

Podobná jména ve stejné výrobně (sdílené slovo i surovina), stejné suroviny a ručně vybrané dvojice – zkontrolováno, nejde o duplicity:

| Nový | Stávající | Podobnost | Rozhodnutí |
|---|---|---|---|
| Polévka z ježdíka | Rybí polévka (Rybárna) | podobný název, společné: Brambory, Cibule | jiné suroviny (2× Ježdík obecný, 1× Brambory, 1× Cibule vs 2× Plotice, 1× Cibule, 1× Brambory) a jiný výrobek – ponecháno |
| Polévka z ježdíka | Bylinková rybí polévka (Rybárna) | podobný název, společné: Brambory | jiné suroviny (2× Ježdík obecný, 1× Brambory, 1× Cibule vs 2× Plotice, 1× Brambory, 1× Petržel) a jiný výrobek – ponecháno |
| Tloušť na cibuli | Štika na cibulce (Rybárna) | podobný název, společné: Cibule | jiné suroviny (1× Jelec tloušť, 1× Cibule vs 1× Štika, 2× Cibule) a jiný výrobek – ponecháno |
| Pstruh na másle | Candát na másle (Rybárna) | podobný název, společné: Máslo | jiné suroviny (1× Pstruh, 1× Máslo vs 1× Candát, 1× Máslo) a jiný výrobek – ponecháno |
| Rybí koláč | Koláč (Pekárna) | podobný název, společné: Vejce | jiné suroviny (1× Pstruh, 2× Mouka, 1× Vejce vs 2× Pšenice, 2× Vejce) a jiný výrobek – ponecháno |
| Rybí koláč | Třešňový koláč (Pekárna) | podobný název, společné: Mouka, Vejce | jiné suroviny (1× Pstruh, 2× Mouka, 1× Vejce vs 2× Mouka, 2× Třešně, 1× Vejce) a jiný výrobek – ponecháno |
| Rybí koláč | Ořechový koláč (Pekárna) | podobný název, společné: Mouka | jiné suroviny (1× Pstruh, 2× Mouka, 1× Vejce vs 2× Mouka, 2× Ořechy, 1× Cukr) a jiný výrobek – ponecháno |
| Rybí koláč | Angreštový koláč (Pekárna) | podobný název, společné: Mouka, Vejce | jiné suroviny (1× Pstruh, 2× Mouka, 1× Vejce vs 1× Mouka, 1× Vejce, 3× Angrešt) a jiný výrobek – ponecháno |
| Rybí koláč | Višňový koláč (Pekárna) | podobný název, společné: Mouka, Vejce | jiné suroviny (1× Pstruh, 2× Mouka, 1× Vejce vs 1× Mouka, 2× Višně, 1× Vejce) a jiný výrobek – ponecháno |
| Rybí koláč | Třešňový ovesný koláč (Pekárna) | podobný název, společné: Vejce | jiné suroviny (1× Pstruh, 2× Mouka, 1× Vejce vs 2× Třešně, 1× Ovesné vločky, 1× Vejce) a jiný výrobek – ponecháno |
| Mník na másle | Candát na másle (Rybárna) | podobný název, společné: Máslo | jiné suroviny (1× Mník jednovousý, 1× Máslo, 1× Cibule vs 1× Candát, 1× Máslo) a jiný výrobek – ponecháno |
| Slavnostní rybí mísa | Mistrovský rybí talíř (Rybárna) | podobný účel (ruční kontrola) | jiné suroviny (1× Siven americký, 1× Síh maréna, 1× Tolstolobik bílý, 1× Brambory vs 1× Candát, 1× Štika, 1× Řepkový olej, 1× Petržel), jiný výrobek – ponecháno |
| Tvaroh | Sýr (Mlékárna) | stejné suroviny (2× Mléko) | jiný výrobek, jiný čas (12 min vs 20 min) a Vaření (1 vs 3); zadání chce tvaroh z mléka výslovně – ponecháno |
| Třešňový šáteček | Třešňový koláč (Pekárna) | podobný název, společné: Mouka, Třešně | jiné suroviny (1× Mouka, 2× Třešně vs 2× Mouka, 2× Třešně, 1× Vejce) a jiný výrobek – ponecháno |
| Třešňový šáteček | Třešňová bublanina (Pekárna) | podobný název, společné: Mouka, Třešně | jiné suroviny (1× Mouka, 2× Třešně vs 1× Mouka, 1× Vejce, 2× Třešně) a jiný výrobek – ponecháno |
| Třešňový šáteček | Třešňový ovesný koláč (Pekárna) | podobný název, společné: Třešně | jiné suroviny (1× Mouka, 2× Třešně vs 2× Třešně, 1× Ovesné vločky, 1× Vejce) a jiný výrobek – ponecháno |
| Makový koláček | Třešňový koláč (Pekárna) | podobný název, společné: Mouka | jiné suroviny (1× Mouka, 1× Mletý mák vs 2× Mouka, 2× Třešně, 1× Vejce) a jiný výrobek – ponecháno |
| Makový koláček | Ořechový koláč (Pekárna) | podobný název, společné: Mouka | jiné suroviny (1× Mouka, 1× Mletý mák vs 2× Mouka, 2× Ořechy, 1× Cukr) a jiný výrobek – ponecháno |
| Makový koláček | Angreštový koláč (Pekárna) | podobný název, společné: Mouka | jiné suroviny (1× Mouka, 1× Mletý mák vs 1× Mouka, 1× Vejce, 3× Angrešt) a jiný výrobek – ponecháno |
| Makový koláček | Višňový koláč (Pekárna) | podobný název, společné: Mouka | jiné suroviny (1× Mouka, 1× Mletý mák vs 1× Mouka, 2× Višně, 1× Vejce) a jiný výrobek – ponecháno |
| Dýňová bulka | Dýňové placičky (Pekárna) | podobný název, společné: Dýně | jiné suroviny (1× Mouka, 1× Dýně vs 1× Dýně, 1× Vejce, 1× Řepkový olej) a jiný výrobek – ponecháno |
| Hroznový koláč | Koláč (Pekárna) | podobný název, společné: Vejce | jiné suroviny (2× Mouka, 2× Hrozny, 1× Vejce vs 2× Pšenice, 2× Vejce) a jiný výrobek – ponecháno |
| Hroznový koláč | Třešňový koláč (Pekárna) | podobný název, společné: Mouka, Vejce | jiné suroviny (2× Mouka, 2× Hrozny, 1× Vejce vs 2× Mouka, 2× Třešně, 1× Vejce) a jiný výrobek – ponecháno |
| Hroznový koláč | Ořechový koláč (Pekárna) | podobný název, společné: Mouka | jiné suroviny (2× Mouka, 2× Hrozny, 1× Vejce vs 2× Mouka, 2× Ořechy, 1× Cukr) a jiný výrobek – ponecháno |
| Hroznový koláč | Angreštový koláč (Pekárna) | podobný název, společné: Mouka, Vejce | jiné suroviny (2× Mouka, 2× Hrozny, 1× Vejce vs 1× Mouka, 1× Vejce, 3× Angrešt) a jiný výrobek – ponecháno |
| Hroznový koláč | Višňový koláč (Pekárna) | podobný název, společné: Mouka, Vejce | jiné suroviny (2× Mouka, 2× Hrozny, 1× Vejce vs 1× Mouka, 2× Višně, 1× Vejce) a jiný výrobek – ponecháno |
| Hroznový koláč | Třešňový ovesný koláč (Pekárna) | podobný název, společné: Vejce | jiné suroviny (2× Mouka, 2× Hrozny, 1× Vejce vs 2× Třešně, 1× Ovesné vločky, 1× Vejce) a jiný výrobek – ponecháno |
| Ořechové sušenky | Ořechový koláč (Pekárna) | podobný název, společné: Mouka, Ořechy | jiné suroviny (1× Mouka, 2× Ořechy, 1× Med vs 2× Mouka, 2× Ořechy, 1× Cukr) a jiný výrobek – ponecháno |
| Makový závin | Jablečný závin (Pekárna) | podobný název, společné: Mouka | jiné suroviny (2× Mouka, 2× Mletý mák, 1× Cukr vs 1× Mouka, 3× Jablko) a jiný výrobek – ponecháno |
| Višňová kapsa | Višňový koláč (Pekárna) | podobný účel (ruční kontrola) | jiné suroviny (1× Mouka, 2× Višně, 1× Cukr vs 1× Mouka, 2× Višně, 1× Vejce), jiný výrobek – ponecháno |
| Mistrovský ořechový věnec | Ořechový koláč (Pekárna) | podobný účel (ruční kontrola) | jiné suroviny (2× Mouka, 1× Tvaroh, 1× Med, 2× Ořechy vs 2× Mouka, 2× Ořechy, 1× Cukr), jiný výrobek – ponecháno |

Z návrhu se **nepřidalo nic dvakrát**: Rohlík je jediná položka (`rohlik`) pro pečivo i návnadu; Hrášek používá stávající `hrach`; Sýr stávající `syr`; Těsto je stávající `navnada`; Kukuřice stávající `corn`.
