# EKOfarm – mapa obsahu rozšíření (v46)

Vygenerováno `node tools/eco-docs.mjs` ze skutečných pravidel. Přepínače (public/js/eco-config.js): `eco_recipes` **zapnuto** · `eco_planner` **zapnuto** · `eco_byproducts` **zapnuto** · `eco_straw` **zapnuto** · `eco_crops` **zapnuto** · `eco_mastery` **zapnuto** · `fishing_minigame_v2` **zapnuto** · `fishing_baits_v2` **zapnuto** · `fishing_fish_pack_v2` **zapnuto** · `bakery_extra_v2` **zapnuto**.

Návrhová ID ze zadání (`eco_rec_*`, `eco_item_*`, `eco_crop_*`) nejsou ID ve hře – ve hře platí sloupec **ID ve hře** (jména jsou česky zvlášť). Výrobek receptu má stejné ID jako recept; alternativní recept (`out`) vyrábí existující krmivo a nový předmět nevytváří.

## Recepty
| Návrh | ID ve hře | Název | Budova | Statek (návrh → hra) | Vaření (návrh → hra) | Suroviny | Čas | Výrobek | Cena | XP | Ikona | Skupina | Odchylka od návrhu |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| eco_rec_farmarsky_sendvic | `farmarsky_sendvic` | Farmářský sendvič | Pekárna | 2 → 2 | 1 → 1 | 1× Chléb + 1× Salát + 1× Ředkvička | 8 min | 1× Farmářský sendvič | 42 | 2 | i/farmarsky_sendvic.webp | eco_recipes | – |
| eco_rec_sojova_mouka | `sojova_mouka` | Sójová mouka | Mlýn | 3 → 3 | 2 → 2 | 3× Sója | 6 min | 1× Sójová mouka | 73 | 4 | i/sojova_mouka.webp | eco_recipes | – |
| eco_rec_sojovy_chleb | `sojovy_chleb` | Sójový chléb | Pekárna | 4 → 4 | 6 → 6 | 1× Sójová mouka + 2× Pšenice | 14 min | 1× Sójový chléb | 111 | 6 | i/sojovy_chleb.webp | eco_recipes | – |
| eco_rec_zeleninova_pomazanka | `zeleninova_pomazanka` | Zeleninová pomazánka | Mlékárna | 5 → 5 | 3 → 3 | 1× Smetana + 2× Ředkvička | 12 min | 1× Zeleninová pomazánka | 140 | 8 | i/zeleninova_pomazanka.webp | eco_recipes | – |
| eco_rec_medove_orechy | `medove_orechy` | Medové ořechy | Medárna | 6 → 6 | 3 → 3 | 2× Ořechy + 1× Med | 12 min | 1× Medové ořechy | 110 | 6 | i/medove_orechy.webp | eco_recipes | – |
| eco_rec_hrachova_pomazanka | `hrachova_pomazanka` | Hrachová pomazánka | Konzervárna | 6 → 6 | 5 → 5 | 2× Hrách + 1× Česnek | 14 min | 1× Hrachová pomazánka | 83 | 5 | i/hrachova_pomazanka.webp | eco_recipes | – |
| eco_rec_bramboraky | `bramboraky` | Bramboráky | Pekárna | 7 → 7 | 7 → 7 | 2× Brambory + 1× Vejce + 1× Řepkový olej | 18 min | 1× Bramboráky | 176 | 10 | i/bramboraky.webp | eco_recipes | – |
| eco_rec_zelenina_v_oleji | `zelenina_v_oleji` | Zelenina v oleji | Konzervárna | 7 → 7 | 7 → 7 | 1× Paprika + 1× Rajče + 1× Slunečnicový olej | 22 min | 1× Zelenina v oleji | 184 | 11 | i/zelenina_v_oleji.webp | eco_recipes | – |
| eco_rec_sojovy_olej | `sojovy_olej` | Sójový olej | Olejna | 7 → 7 | 4 → 4 | 3× Sója | 14 min | 1× Sójový olej | 81 | 5 | i/sojovy_olej.webp | eco_recipes | – |
| eco_rec_visnovy_kolac | `visnovy_kolac` | Višňový koláč | Pekárna | 4 → 4 | 8 → 8 | 1× Mouka + 2× Višně + 1× Vejce | 18 min | 1× Višňový koláč | 121 | 7 | i/visnovy_kolac.webp | eco_recipes | – |
| eco_rec_visnova_marmelada | `visnova_marmelada` | Višňová marmeláda | Marmeládárna | 8 → 8 | 6 → 6 | 3× Višně + 1× Cukr | 17 min | 1× Višňová marmeláda | 177 | 10 | i/visnova_marmelada.webp | eco_recipes | – |
| eco_rec_orechovy_krem | `orechovy_krem` | Ořechový krém | Cukrárna | 8 → 8 | 8 → 8 | 2× Ořechy + 1× Med + 1× Smetana | 18 min | 1× Ořechový krém | 232 | 14 | i/orechovy_krem.webp | eco_recipes | – |
| eco_rec_dynove_placicky | `dynove_placicky` | Dýňové placičky | Pekárna | 7 → 7 | 8 → 8 | 1× Dýně + 1× Vejce + 1× Řepkový olej | 16 min | 1× Dýňové placičky | 174 | 10 | i/dynove_placicky.webp | eco_recipes | – |
| eco_rec_ovesne_vlocky | `ovesne_vlocky` | Ovesné vločky | Mlýn | 3 → 3 | 2 → 2 | 3× Oves | 7 min | 1× Ovesné vločky | 81 | 5 | i/ovesne_vlocky.webp | eco_crops | – |
| eco_rec_ovesne_susenky | `ovesne_susenky` | Ovesné sušenky | Pekárna | 4 → 4 | 7 → 7 | 1× Ovesné vločky + 1× Pšenice + 1× Vejce | 15 min | 1× Ovesné sušenky | 160 | 9 | i/ovesne_susenky.webp | eco_crops | – |
| eco_rec_tresnovy_ovesny_kolac | `tresnovy_ovesny_kolac` | Třešňový ovesný koláč | Pekárna | 4 → 4 | 9 → 9 | 2× Třešně + 1× Ovesné vločky + 1× Vejce | 20 min | 1× Třešňový ovesný koláč | 204 | 12 | i/tresnovy_ovesny_kolac.webp | eco_crops | – |
| eco_rec_ovesne_krmivo | `krmivo_slepice__oves` | Ovesná krmná směs | Krmivárna | 3 → 3 | 1 → 1 | 1× Oves + 1× Kukuřice | 4 min | 2× Krmivo pro slepice (existující) | 21 | 1 | i/krmivo_slepice.webp (původní) | eco_crops | kusů 1 → 2, suroviny 2× Oves → 1× Oves (návrh 2× oves + 1× kukuřice → 1 krmivo by byl ztrátový: suroviny 48 mincí, krmivo 21) |
| eco_rec_lneny_olej | `lneny_olej` | Lněný olej | Olejna | 7 → 7 | 5 → 5 | 3× Len | 15 min | 1× Lněný olej | 125 | 7 | i/lneny_olej.webp | eco_crops | – |
| eco_rec_lnena_prize | `lnena_prize` | Lněná příze | Textilka | 10 → 10 | 6 → 6 | 3× Len | 18 min | 1× Lněná příze | 128 | 7 | i/lnena_prize.webp | eco_crops | – |
| eco_rec_lnena_tkanina | `lnena_tkanina` | Lněná tkanina | Textilka | 10 → 10 | 9 → 9 | 2× Lněná příze | 25 min | 1× Lněná tkanina | 334 | 19 | i/lnena_tkanina.webp | eco_crops | – |
| eco_rec_lneny_ubrus | `lneny_ubrus` | Lněný ubrus | Textilka | 10 → 10 | 14 → 14 | 2× Lněná tkanina | 35 min | 1× Lněný ubrus | 839 | 49 | i/lneny_ubrus.webp | eco_crops | – |
| eco_rec_koprove_okurky | `koprove_okurky` | Koprové okurky | Konzervárna | 6 → 6 | 6 → 6 | 2× Okurka + 1× Česnek + 1× Kopr | 18 min | 1× Koprové okurky | 80 | 5 | i/koprove_okurky.webp | eco_crops | – |
| eco_rec_bylinkova_rybi_polevka | `bylinkova_polevka` | Bylinková rybí polévka | Rybárna | 6 → 6 | 8 → 8 | 2× Plotice + 1× Brambory + 1× Petržel | 18 min | 1× Bylinková rybí polévka | 75 | 4 | i/bylinkova_polevka.webp | eco_crops | – |
| eco_rec_kapr_s_petrzeli | `kapr_petrzel` | Kapr s petrželí | Rybárna | 6 → 6 | 8 → 8 | 1× Kapr + 1× Máslo + 1× Petržel | 22 min | 1× Kapr s petrželí | 359 | 21 | i/kapr_petrzel.webp | eco_crops | – |
| eco_rec_bolen_s_koprem | `bolen_kopr` | Bolen s koprem | Rybárna | 6 → 6 | 15 → 15 | 1× Bolen + 1× Máslo + 1× Kopr | 25 min | 1× Bolen s koprem | 394 | 23 | i/bolen_kopr.webp | eco_crops | – |
| eco_rec_krmivo_s_otrubami | `krmivo_slepice__otruby` | Krmivo pro slepice s otrubami | Krmivárna | 3 → 3 | 1 → 1 | 1× Otruby + 1× Pšenice + 1× Kukuřice | 3 min | 1× Krmivo pro slepice (existující) | 21 | 1 | i/krmivo_slepice.webp (původní) | eco_byproducts | – |
| eco_rec_krmivo_s_pokrutinami | `krmivo_prasata__pokrutiny` | Krmivo pro prasata s pokrutinami | Krmivárna | 7 → 7 | 4 → 4 | 1× Pokrutiny + 1× Brambory + 1× Kukuřice | 6 min | 1× Krmivo pro prasata (existující) | 59 | 3 | i/krmivo_prasata.webp (původní) | eco_byproducts | – |
| eco_rec_krmivo_s_rizky | `krmivo_kravy__rizky` | Krmivo pro krávy s řepnými řízky | Krmivárna | 8 → 8 | 5 → 5 | 1× Řepné řízky + 1× Kukuřice + 1× Mrkev | 6 min | 1× Krmivo pro krávy (existující) | 41 | 2 | i/krmivo_kravy.webp (původní) | eco_byproducts | – |
| eco_rec_krmivo_s_vylisky | `krmivo_prasata__vylisky` | Ovocná krmná směs pro prasata | Krmivárna | 8 → 7 | 7 → 7 | 1× Ovocné výlisky + 1× Brambory + 1× Kukuřice | 6 min | 1× Krmivo pro prasata (existující) | 59 | 3 | i/krmivo_prasata.webp (původní) | eco_byproducts | Statek 8 → 7 (prasata a jejich krmivo jsou od Statku 7) |
| eco_rec_mistrovsky_rybi_talir | `rybi_talir` | Mistrovský rybí talíř | Rybárna | 7 → 7 | 25 → 25 | 1× Candát + 1× Štika + 1× Řepkový olej + 1× Petržel | 40 min | 1× Mistrovský rybí talíř | 217 | 13 | i/rybi_talir.webp | eco_mastery | – |
| eco_rec_slavnostni_ovocny_dort | `slavnostni_dort` | Slavnostní ovocný dort | Cukrárna | 8 → 8 | 30 → 30 | 2× Mouka + 2× Vejce + 1× Smetana + 2× Višně + 1× Cukr | 45 min | 1× Slavnostní ovocný dort | 427 | 25 | i/slavnostni_dort.webp | eco_mastery | – |
| eco_rec_farmarska_hostina | `hostina` | Farmářská hostina | Uzenářství | 8 → 8 | 40 → 40 | 1× Klobása + 1× Uzené maso + 2× Brambory + 1× Paprika | 50 min | 1× Farmářská hostina | 762 | 44 | i/hostina.webp | eco_mastery | – |

## Plodiny
| Návrh | ID ve hře | Název | Statek | Růst (návrh → hra) | Stroj na velkém poli | Výnos | Osivo (mince) | Cena | XP | Semena | Grafika (3 fáze + ikona) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| eco_crop_oves | `oves` | Oves | 3 → 3 | 22 → 22 min | kombajn | 2 | 9 | 20 | 4 | Semenárna: 2× Oves → 3× `s_oves` | c/oves_0..2.webp, i/oves.webp, i/s_oves.webp |
| eco_crop_len | `len` | Len | 7 → 7 | 35 → 35 min | kombajn | 2 | 14 | 30 | 6 | Semenárna: 2× Len → 3× `s_len` | c/len_0..2.webp, i/len.webp, i/s_len.webp |
| eco_crop_petrzel | `petrzel` | Petržel | 6 → 6 | 16 → 16 min | traktor | 2 | 6 | 15 | 3 | Semenárna: 2× Petržel → 3× `s_petrzel` | c/petrzel_0..2.webp, i/petrzel.webp, i/s_petrzel.webp |
| eco_crop_kopr | `kopr` | Kopr | 6 → 6 | 18 → 18 min | traktor | 2 | 7 | 16 | 4 | Semenárna: 2× Kopr → 3× `s_kopr` | c/kopr_0..2.webp, i/kopr.webp, i/s_kopr.webp |

Cena, osivo a XP nové plodiny = lineárně mezi plodinami se stejným strojem podle doby růstu (mimo rozsah úměrně času); výnos 2 jako všechny polní plodiny.

## Vedlejší produkty (platí pro dávky, které začaly od 2026-11-13)
| Návrh | ID ve hře | Název | Z čeho | Kolik | Cena | Spotřebitel | Ikona |
|---|---|---|---|---|---|---|---|
| eco_item_otruby | `otruby` | Otruby | Mouka | 1 ks za 5 hotových dávek | 2 | Krmivo pro slepice s otrubami | i/otruby.webp |
| eco_item_pokrutiny | `pokrutiny` | Pokrutiny | Řepkový olej, Slunečnicový olej, Sójový olej, Lněný olej | 1 ks za 4 hotových dávek | 16 | Krmivo pro prasata s pokrutinami | i/pokrutiny.webp |
| eco_item_repne_rizky | `repne_rizky` | Řepné řízky | Cukr | 1 ks za 4 hotových dávek | 6 | Krmivo pro krávy s řepnými řízky | i/repne_rizky.webp |
| eco_item_ovocne_vylisky | `ovocne_vylisky` | Ovocné výlisky | Jablečný džus, Hruškový džus, Višňový džus, Třešňový džus, Hroznový mošt | 1 ks za 6 hotových dávek | 16 | Ovocná krmná směs pro prasata | i/ovocne_vylisky.webp |

Počítadlo dávek je u farmy (`farm.byc`), vydávají se jen celé kusy a jen když se vejdou do Skladu (jinak počkají). Zrušená ani nedokončená dávka nic nedá.

## Sláma a ocenění
- **Podestýlka ze slámy** (`penStraw`, pole `o.pod` u ohrady): od Statku 4, jednorázově 10× sláma + 40 mincí, krmný cyklus × 0.97. Skupina `eco_straw`.
- **Mistr údolní kuchyně** (`mistr_kuchyne`, `farm.aw`): Vaření 50, jen kosmetické, ikona i/mistr_kuchyne.webp. Skupina `eco_mastery`.

## Plán výroby
- Výpočet `planChain(farm, výrobek, počet, { pref, pick, orders })` – jen čtení; akce `planApply` nastaví cílové zásoby výroben (atomicky, vyšší dosavadní cíl zůstane).
- Skladník (`tradeRound`) neprodá zboží, které výrobny drží pro cílové zásoby, ani suroviny na chybějící dávky (`planHeld`).
