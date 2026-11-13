// EKOfarm v46 – rozšíření ekonomiky: přepínače skupin (feature flags) a všechna nová data na jednom místě.
// Server (Worker) i prohlížeč čtou stejný soubor, takže zapnutí nebo vypnutí skupiny = nové vydání (CLIENT_MIN).
// Testy můžou přepínače přepsat přes globalThis.EKO_FLAGS PŘED načtením pravidel (dynamický import, viz test/v46*.test.js).
// Vypnutá skupina = její recepty, plodiny a předměty v pravidlech vůbec nejsou (hra se chová jako v45).
// Hodnoty tady jsou návrh ze zadání upravený podle auditu (EKOFARM_ECONOMY_AUDIT.md); ceny výrobků se dál
// dopočítávají z receptu (rules.js), ceny nových plodin z okolních plodin se stejným strojem a podobným časem.

export const ECO_FLAGS_DEFAULT = {
  eco_recipes: true,      // B – nové recepty pro současné plodiny (sója, ředkvička, salát, oleje, višně, ořechy…)
  eco_planner: true,      // C – plán výrobního řetězce v Řídicím centru (náhled jen pro čtení + potvrzení cílových zásob)
  eco_byproducts: true,   // D – vedlejší produkty (otruby, pokrutiny, řepné řízky, ovocné výlisky) a alternativní krmné směsi
  eco_straw: true,        // D – dobrovolné vylepšení ohrady slámou (jednorázově, malý bonus)
  eco_crops: true,        // E – oves, len, petržel, kopr (bez nové budovy)
  eco_mastery: true,      // F – mistrovské recepty (Vaření 25/30/40) a odznak Mistr údolní kuchyně (Vaření 50)
};
const ECO_OVER = (typeof globalThis !== 'undefined' && globalThis.EKO_FLAGS) || {};
export const ECO_FLAGS = Object.fromEntries(Object.keys(ECO_FLAGS_DEFAULT).map(k => [k, k in ECO_OVER ? !!ECO_OVER[k] : ECO_FLAGS_DEFAULT[k]]));
export const ecoOn = flag => !flag || !!ECO_FLAGS[flag];

// Od kdy platí vedlejší produkty (effectiveAt): dávky, které začaly dřív, se nepočítají (žádná zpětná simulace).
export const ECO_FROM = Date.UTC(2026, 10, 13, 0, 0, 0);

// ---- E: nové plodiny (bez ceny: dopočítá se z plodin se stejným strojem a podobnou dobou růstu) ----
// st = od jaké úrovně Statku, min = doba růstu v minutách, harvester = čím se sklízí na velkém poli
export const ECO_CROPS = [
  { id: 'oves',    name: 'Oves',    cat: 'obili',    st: 3, min: 22, harvester: 'combine', flag: 'eco_crops' },
  { id: 'len',     name: 'Len',     cat: 'obili',    st: 7, min: 35, harvester: 'combine', flag: 'eco_crops' },
  { id: 'petrzel', name: 'Petržel', cat: 'zelenina', st: 6, min: 16, harvester: 'tractor', flag: 'eco_crops' },
  { id: 'kopr',    name: 'Kopr',    cat: 'zelenina', st: 6, min: 18, harvester: 'tractor', flag: 'eco_crops' },
];

// ---- D: vedlejší produkty – n kusů za každých `per` HOTOVÝCH dávek výrobku z `from` (počítadlo se ukládá u farmy) ----
// Cena = `worth` × hodnota suroviny, kterou vedlejší produkt nahradí v alternativní krmné směsi (dopočítá rules.js).
export const ECO_BYPRODUCTS = [
  { id: 'otruby',         name: 'Otruby',         from: ['mouka'], per: 5, n: 1, flag: 'eco_byproducts' },
  { id: 'pokrutiny',      name: 'Pokrutiny',      from: ['olej', 'sl_olej', 'sojovy_olej', 'lneny_olej'], per: 4, n: 1, flag: 'eco_byproducts' },
  { id: 'repne_rizky',    name: 'Řepné řízky',    from: ['cukr'], per: 4, n: 1, flag: 'eco_byproducts' },
  { id: 'ovocne_vylisky', name: 'Ovocné výlisky', from: ['dzus_jablko', 'dzus_hruska', 'dzus_visne', 'tresnovy_dzus', 'most'], per: 6, n: 1, flag: 'eco_byproducts' },
];
export const BYPRODUCT_WORTH = 0.8;

// ---- B, D, E, F: recepty ----
// b = budova, in = suroviny, min = doba v minutách, st = nejnižší Statek (skutečný je i podle surovin – nikdy dřív než ony),
// cook = úroveň Vaření, out = výsledný předmět (jen u alternativních receptů – vyrábí EXISTUJÍCÍ krmivo), name = název receptu.
// Recept se do hry přidá jen se zapnutou skupinou a jen když existují všechny jeho suroviny.
export const ECO_RECIPES = [
  // B – současné plodiny
  { id: 'farmarsky_sendvic',    name: 'Farmářský sendvič',    b: 'pekarna',      in: { chleb: 1, salat: 1, redkvicka: 1 }, min: 8,  st: 2, cook: 1, flag: 'eco_recipes' },
  { id: 'sojova_mouka',         name: 'Sójová mouka',         b: 'mlyn',         in: { soy: 3 }, min: 6, st: 3, cook: 2, flag: 'eco_recipes' },
  { id: 'sojovy_chleb',         name: 'Sójový chléb',         b: 'pekarna',      in: { sojova_mouka: 1, wheat: 2 }, min: 14, st: 4, cook: 6, flag: 'eco_recipes' },
  { id: 'zeleninova_pomazanka', name: 'Zeleninová pomazánka', b: 'mlekarna',     in: { smetana: 1, redkvicka: 2 }, min: 12, st: 5, cook: 3, flag: 'eco_recipes' },
  { id: 'medove_orechy',        name: 'Medové ořechy',        b: 'medarna',      in: { orech: 2, med: 1 }, min: 12, st: 6, cook: 3, flag: 'eco_recipes' },
  { id: 'hrachova_pomazanka',   name: 'Hrachová pomazánka',   b: 'konzervarna',  in: { hrach: 2, cesnek: 1 }, min: 14, st: 6, cook: 5, flag: 'eco_recipes' },
  { id: 'bramboraky',           name: 'Bramboráky',           b: 'pekarna',      in: { potato: 2, vejce: 1, olej: 1 }, min: 18, st: 7, cook: 7, flag: 'eco_recipes' },
  { id: 'zelenina_v_oleji',     name: 'Zelenina v oleji',     b: 'konzervarna',  in: { paprika: 1, rajce: 1, sl_olej: 1 }, min: 22, st: 7, cook: 7, flag: 'eco_recipes' },
  { id: 'sojovy_olej',          name: 'Sójový olej',          b: 'olejna',       in: { soy: 3 }, min: 14, st: 7, cook: 4, flag: 'eco_recipes' },
  { id: 'visnovy_kolac',        name: 'Višňový koláč',        b: 'pekarna',      in: { mouka: 1, visne: 2, vejce: 1 }, min: 18, st: 4, cook: 8, flag: 'eco_recipes' },
  { id: 'visnova_marmelada',    name: 'Višňová marmeláda',    b: 'marmeladarna', in: { visne: 3, cukr: 1 }, min: 17, st: 8, cook: 6, flag: 'eco_recipes' },
  { id: 'orechovy_krem',        name: 'Ořechový krém',        b: 'cukrarna',     in: { orech: 2, med: 1, smetana: 1 }, min: 18, st: 8, cook: 8, flag: 'eco_recipes' },
  { id: 'dynove_placicky',      name: 'Dýňové placičky',      b: 'pekarna',      in: { dyne: 1, vejce: 1, olej: 1 }, min: 16, st: 7, cook: 8, flag: 'eco_recipes' },
  // E – nové plodiny (bez nové budovy)
  { id: 'ovesne_vlocky',        name: 'Ovesné vločky',        b: 'mlyn',         in: { oves: 3 }, min: 7, st: 3, cook: 2, flag: 'eco_crops' },
  { id: 'ovesne_susenky',       name: 'Ovesné sušenky',       b: 'pekarna',      in: { ovesne_vlocky: 1, wheat: 1, vejce: 1 }, min: 15, st: 4, cook: 7, flag: 'eco_crops' },
  { id: 'tresnovy_ovesny_kolac', name: 'Třešňový ovesný koláč', b: 'pekarna',    in: { tresne: 2, ovesne_vlocky: 1, vejce: 1 }, min: 20, st: 4, cook: 9, flag: 'eco_crops' },
  // návrh 2× oves + 1× kukuřice → 1 krmivo by byl ztrátový (suroviny 48 mincí, krmivo 21) → 1× oves + 1× kukuřice → 2 krmiva
  { id: 'krmivo_slepice__oves', name: 'Ovesná krmná směs',    b: 'krmivarna',    out: 'krmivo_slepice', in: { oves: 1, corn: 1 }, qty: 2, min: 4, st: 3, cook: 1, flag: 'eco_crops' },
  { id: 'lneny_olej',           name: 'Lněný olej',           b: 'olejna',       in: { len: 3 }, min: 15, st: 7, cook: 5, flag: 'eco_crops' },
  { id: 'lnena_prize',          name: 'Lněná příze',          b: 'textilka',     in: { len: 3 }, min: 18, st: 10, cook: 6, flag: 'eco_crops' },
  { id: 'lnena_tkanina',        name: 'Lněná tkanina',        b: 'textilka',     in: { lnena_prize: 2 }, min: 25, st: 10, cook: 9, flag: 'eco_crops' },
  { id: 'lneny_ubrus',          name: 'Lněný ubrus',          b: 'textilka',     in: { lnena_tkanina: 2 }, min: 35, st: 10, cook: 14, flag: 'eco_crops' },
  { id: 'koprove_okurky',       name: 'Koprové okurky',       b: 'konzervarna',  in: { okurka: 2, cesnek: 1, kopr: 1 }, min: 18, st: 6, cook: 6, flag: 'eco_crops' },
  { id: 'bylinkova_polevka',    name: 'Bylinková rybí polévka', b: 'rybarna',    in: { plotice: 2, potato: 1, petrzel: 1 }, min: 18, st: 6, cook: 8, flag: 'eco_crops' },
  { id: 'kapr_petrzel',         name: 'Kapr s petrželí',      b: 'rybarna',      in: { kapr: 1, maslo: 1, petrzel: 1 }, min: 22, st: 6, cook: 8, flag: 'eco_crops' },
  { id: 'bolen_kopr',           name: 'Bolen s koprem',       b: 'rybarna',      in: { bolen: 1, maslo: 1, kopr: 1 }, min: 25, st: 6, cook: 15, flag: 'eco_crops' },
  // D – alternativní krmné směsi z vedlejších produktů (vyrábí existující krmivo)
  { id: 'krmivo_slepice__otruby',  name: 'Krmivo pro slepice s otrubami', b: 'krmivarna', out: 'krmivo_slepice', in: { otruby: 1, wheat: 1, corn: 1 }, min: 3, st: 3, cook: 1, flag: 'eco_byproducts' },
  { id: 'krmivo_prasata__pokrutiny', name: 'Krmivo pro prasata s pokrutinami', b: 'krmivarna', out: 'krmivo_prasata', in: { pokrutiny: 1, potato: 1, corn: 1 }, min: 6, st: 7, cook: 4, flag: 'eco_byproducts' },
  { id: 'krmivo_kravy__rizky',     name: 'Krmivo pro krávy s řepnými řízky', b: 'krmivarna', out: 'krmivo_kravy', in: { repne_rizky: 1, corn: 1, carrot: 1 }, min: 6, st: 8, cook: 5, flag: 'eco_byproducts' },
  // návrh St8 → St7 (audit: výlisky vznikají od St4, prasata a jejich krmivo jsou od St7 – dřív to nejde, později by výlisky ležely)
  { id: 'krmivo_prasata__vylisky', name: 'Ovocná krmná směs pro prasata', b: 'krmivarna', out: 'krmivo_prasata', in: { ovocne_vylisky: 1, potato: 1, corn: 1 }, min: 6, st: 7, cook: 7, flag: 'eco_byproducts' },
  // F – mistrovské recepty (cíl pro pokročilé, cena dál z receptu – žádný zdroj neomezeného zisku)
  { id: 'rybi_talir',      name: 'Mistrovský rybí talíř',  b: 'rybarna',    in: { candat: 1, stika: 1, olej: 1, petrzel: 1 }, min: 40, st: 7, cook: 25, flag: 'eco_mastery' },
  { id: 'slavnostni_dort', name: 'Slavnostní ovocný dort', b: 'cukrarna',   in: { mouka: 2, vejce: 2, smetana: 1, visne: 2, cukr: 1 }, min: 45, st: 8, cook: 30, flag: 'eco_mastery' },
  { id: 'hostina',         name: 'Farmářská hostina',      b: 'uzenarstvi', in: { klobasa: 1, uzene: 1, potato: 2, paprika: 1 }, min: 50, st: 8, cook: 40, flag: 'eco_mastery' },
];

// ---- D: sláma – dobrovolné jednorázové vylepšení ohrady (podestýlka). Bez pravidelné spotřeby, bez povinnosti. ----
// cycle = násobič doby krmného cyklu (0,97 = o 3 % víc výrobků za den); platí jen pro ohradu, kterou hráč sám vylepšil.
export const ECO_STRAW = { flag: 'eco_straw', st: 4, item: 'slama', qty: 10, coins: 40, cycle: 0.97, name: 'Podestýlka ze slámy' };

// ---- F: kosmetické ocenění (bez výrobního bonusu) ----
export const ECO_AWARDS = [
  { id: 'mistr_kuchyne', name: 'Mistr údolní kuchyně', skill: 'v', level: 50, icon: 'mistr_kuchyne', text: 'Vaření na nejvyšší úrovni 50.', flag: 'eco_mastery' },
];

// ---- C: plánovač – volba mezi recepty se stejným výsledkem ----
// cena = nejlevnější suroviny, cas = nejkratší doba, rezervy = nejméně sahá do surovin, které má hráč v rezervě skladu
export const PLAN_PREFS = [['cena', 'Nejlevněji'], ['cas', 'Nejrychleji'], ['rezervy', 'Šetřit rezervy']];
export const PLAN_MAX_QTY = 999;
export const PLAN_MAX_DEPTH = 12;
