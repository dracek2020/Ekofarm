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
  // v47 – rybaření a pečivo (balíček EKOfarm_Rybareni_8_navnad_a_pecivo)
  fishing_minigame_v2: true,   // nová minihra: nahození, čekání, záběr, navíjení se šipkou v zelené zóně; druh ryby skrytý do vylovení (server)
  fishing_baits_v2: true,      // 8 návnad ze skladu s preferencemi ryb, okénko „Vyber návnadu“ (jen s novou minihrou)
  fishing_fish_pack_v2: true,  // 10 nových druhů ryb ve stávajících rybnících + 16 rybích receptů
  bakery_extra_v2: true,       // 19 druhů pečiva, žito, mák, žitná mouka, mletý mák, tvaroh
};
const ECO_OVER = (typeof globalThis !== 'undefined' && globalThis.EKO_FLAGS) || {};
export const ECO_FLAGS = Object.fromEntries(Object.keys(ECO_FLAGS_DEFAULT).map(k => [k, k in ECO_OVER ? !!ECO_OVER[k] : ECO_FLAGS_DEFAULT[k]]));
export const ecoOn = flag => !flag || (Array.isArray(flag) ? flag.some(f => !!ECO_FLAGS[f]) : !!ECO_FLAGS[flag]);   // pole = stačí jedna ze skupin

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

// =========================================================================================================
// v47: rybaření – 8 návnad, nová minihra, 10 ryb, 16 rybích receptů; pečivo – 19 receptů, žito, mák, tvaroh
// =========================================================================================================
const BAIT_F = 'fishing_baits_v2', FISH_F = 'fishing_fish_pack_v2', BAKE_F = 'bakery_extra_v2';

// Nové druhy ryb (stávajících 14 zůstává). lv = Rybaření, pond = nejmenší vodní plocha (rybnik < rybnik2 < rybnik3 < rybnik4),
// kg = rozpětí váhy. Cena, obtížnost a četnost se dopočítají z dosavadních ryb podle úrovně Rybaření (rules.js).
export const ECO_FISH = [
  { id: 'perlin',      name: 'Perlín ostrobřichý', lv: 2,  pond: 'rybnik',  kg: [0.1, 1],    color: '#c9a23a', flag: FISH_F },
  { id: 'ouklej',      name: 'Ouklej obecná',      lv: 4,  pond: 'rybnik',  kg: [0.02, 0.08], color: '#c8d4dc', fem: true, flag: FISH_F },
  { id: 'cejnek',      name: 'Cejnek malý',        lv: 6,  pond: 'rybnik',  kg: [0.1, 0.8],  color: '#b8bec4', flag: FISH_F },
  { id: 'jezdik',      name: 'Ježdík obecný',      lv: 7,  pond: 'rybnik',  kg: [0.02, 0.15], color: '#8a8a4a', flag: FISH_F },
  { id: 'tloust',      name: 'Jelec tloušť',       lv: 8,  pond: 'rybnik2', kg: [0.3, 4],    color: '#a89a6a', flag: FISH_F },
  { id: 'jesen',       name: 'Jelec jesen',        lv: 12, pond: 'rybnik2', kg: [0.3, 3],    color: '#b0a070', flag: FISH_F },
  { id: 'tolstolobik', name: 'Tolstolobik bílý',   lv: 15, pond: 'rybnik3', kg: [2, 30],     color: '#c0c8cc', flag: FISH_F },
  { id: 'siven',       name: 'Siven americký',     lv: 20, pond: 'rybnik4', kg: [0.2, 2],    color: '#6a7a4a', flag: FISH_F },
  { id: 'marena',      name: 'Síh maréna',         lv: 27, pond: 'rybnik4', kg: [0.3, 3],    color: '#9ab0c0', flag: FISH_F },
  { id: 'mnik',        name: 'Mník jednovousý',    lv: 35, pond: 'rybnik4', kg: [0.5, 5],    color: '#7a6a3a', flag: FISH_F },
];

// Nové skladové věci, které se nevyrábí: kupují se ve Stánku (Zásoby) za běžné mince
export const ECO_SUPPLY = [
  { id: 'cerv',    name: 'Červ',    price: 4,  flag: BAIT_F },
  { id: 'trpytka', name: 'Třpytka', price: 18, flag: BAIT_F },
];

// 8 návnad: item = skladová položka (jediná identita – Těsto je dosavadní „navnada“, Hrášek je plodina Hrách,
// Rohlík je pečivo z Pekárny), st = Statek, lv = Rybaření, pref = ryby, které na ni berou častěji (nikdy jistě)
export const BAITS = [
  { id: 'cerv',    item: 'cerv',           name: 'Červ',           st: 3, lv: 1,  pref: ['plotice', 'karas', 'cejn', 'perlin', 'ouklej', 'jezdik', 'okoun'] },
  { id: 'kukurice', item: 'corn',          name: 'Kukuřice',       st: 3, lv: 1,  pref: ['kapr', 'amur', 'cejn', 'tolstolobik', 'karas'] },
  { id: 'testo',   item: 'navnada',        name: 'Těsto',          st: 3, lv: 1,  pref: ['plotice', 'karas', 'lin', 'cejnek', 'cejn', 'marena'] },
  { id: 'rohlik',  item: 'rohlik',         name: 'Rohlík',         st: 3, lv: 2,  pref: ['kapr', 'perlin', 'tloust', 'jesen'] },
  { id: 'hrasek',  item: 'hrach',          name: 'Hrášek',         st: 5, lv: 4,  pref: ['amur', 'kapr', 'tolstolobik', 'lin'] },
  { id: 'syr',     item: 'syr',            name: 'Sýr',            st: 5, lv: 8,  pref: ['lin', 'tloust', 'jesen', 'mnik'] },
  { id: 'maso',    item: 'masova_navnada', name: 'Masová návnada', st: 7, lv: 12, pref: ['sumec', 'uhor', 'mnik', 'jeseter'] },
  { id: 'trpytka', item: 'trpytka',        name: 'Třpytka',        st: 7, lv: 12, pref: ['stika', 'okoun', 'candat', 'bolen', 'pstruh', 'siven'] },
];
export const BAIT_FLAG = BAIT_F;
export const BAIT_PREF = { like: 1.6, other: 0.85 };   // násobek četnosti druhu: oblíbená návnada / ostatní (nikdy 0)
export const BAIT_DEFAULT = 'testo';                  // dosavadní návnada (bez volby = jako dřív)

// Minihra: pevný krok 30 za sekundu (nezávisí na FPS), stejný výpočet v prohlížeči i na serveru (přehrání klepnutí).
// Šipka: klepnutí přidá rychlost, bez klepání sjíždí doleva. Zelená zóna se plynule pohybuje (ze serverového semínka).
// p = profil obtížnosti 1–3 (neprozrazuje druh), tier = řada udice, sk = Rybaření.
export const FIGHT = {
  hz: 30, maxS: 35, startX: 0.3, tap: 0.55, damp: 3, drift: 0.3, gap: 2,   // gap = nejmenší odstup klepnutí v krocích (proti automatu)
  width: [0.24, -0.035, 0.006, 0.0015], wMin: 0.13, wMax: 0.32,           // šířka = a + b·(p−1) + c·(tier−1) + d·min(sk, 40)
  amp: [0.17, 0.06], speed: [0.55, 0.25],                                  // pohyb zóny: amplituda a rychlost podle profilu
  gain: [11, -1.5, 0.3], loss: 3.5, tens0: 10, tensUp: [10, 3, -0.5], tensDown: 8,
  bite: [1500, 4500], biteShow: 600, slack: 400,                           // čekání na záběr (ms, náhodně na serveru), „Záběr!“ před soubojem
  pull: [0.25, 0.45, 0.7], pullLen: 0.7, pullGap: [2.5, 5],               // výpady ryby: navíc táhne šipku doleva (podle profilu), délka a rozestupy (s)
};

// Rybí recepty (16) – stejné pole jako ECO_RECIPES výš (rules.js je přidá stejně), skupina ryb
export const FISH_RECIPES = [
  { id: 'rybi_jednohubky',      name: 'Rybí jednohubky',          b: 'rybarna',    in: { ouklej: 2, chleb: 1 }, min: 12, st: 6, cook: 3, flag: FISH_F },
  { id: 'perlin_cesnek',        name: 'Perlín na česneku',        b: 'rybarna',    in: { perlin: 2, cesnek: 1 }, min: 15, st: 6, cook: 5, flag: FISH_F },
  { id: 'cejnek_testicko',      name: 'Cejnek v těstíčku',        b: 'rybarna',    in: { cejnek: 2, vejce: 1, mouka: 1 }, min: 15, st: 6, cook: 6, flag: FISH_F },
  { id: 'polevka_jezdik',       name: 'Polévka z ježdíka',        b: 'rybarna',    in: { jezdik: 2, potato: 1, cibule: 1 }, min: 18, st: 6, cook: 7, flag: FISH_F },
  { id: 'tloust_cibule',        name: 'Tloušť na cibuli',         b: 'rybarna',    in: { tloust: 1, cibule: 1 }, min: 20, st: 6, cook: 8, flag: FISH_F },
  { id: 'rybi_pomazanka',       name: 'Rybí pomazánka',           b: 'rybarna',    in: { plotice: 2, smetana: 1, cibule: 1 }, min: 18, st: 6, cook: 9, flag: FISH_F },
  { id: 'jesen_zelenina',       name: 'Jesen se zeleninou',       b: 'rybarna',    in: { jesen: 1, paprika: 1, carrot: 1 }, min: 22, st: 6, cook: 12, flag: FISH_F },
  { id: 'pstruh_maslo',         name: 'Pstruh na másle',          b: 'rybarna',    in: { pstruh: 1, maslo: 1 }, min: 20, st: 6, cook: 13, flag: FISH_F },
  { id: 'rybi_kolac',           name: 'Rybí koláč',               b: 'pekarna',    in: { pstruh: 1, mouka: 2, vejce: 1 }, min: 25, st: 6, cook: 14, flag: FISH_F },
  { id: 'tolstolobik_zelenina', name: 'Tolstolobik na zelenině',  b: 'rybarna',    in: { tolstolobik: 1, rajce: 1, cibule: 1 }, min: 25, st: 7, cook: 15, flag: FISH_F },
  { id: 'uzeny_tolstolobik',    name: 'Uzený tolstolobik',        b: 'uzenarstvi', in: { tolstolobik: 2 }, min: 28, st: 8, cook: 16, flag: FISH_F },
  { id: 'siven_cesnek',         name: 'Siven na česneku',         b: 'rybarna',    in: { siven: 1, cesnek: 1, maslo: 1 }, min: 25, st: 10, cook: 21, flag: FISH_F },
  { id: 'uzena_marena',         name: 'Uzená maréna',             b: 'uzenarstvi', in: { marena: 2 }, min: 30, st: 10, cook: 28, flag: FISH_F },
  { id: 'pecena_marena',        name: 'Pečená maréna',            b: 'rybarna',    in: { marena: 1, cibule: 1, cesnek: 1 }, min: 30, st: 10, cook: 30, flag: FISH_F },
  { id: 'mnik_maslo',           name: 'Mník na másle',            b: 'rybarna',    in: { mnik: 1, maslo: 1, cibule: 1 }, min: 30, st: 10, cook: 35, flag: FISH_F },
  { id: 'rybi_misa',            name: 'Slavnostní rybí mísa',     b: 'rybarna',    in: { siven: 1, marena: 1, tolstolobik: 1, potato: 1 }, min: 45, st: 10, cook: 40, flag: FISH_F },
  // návnady z výroby: masová návnada (Krmivárna) a Rohlík (Pekárna – zároveň pečivo, jediná skladová položka)
  { id: 'masova_navnada', name: 'Masová návnada', b: 'krmivarna', in: { maso: 1 }, qty: 3, min: 5, st: 7, cook: 1, flag: BAIT_F },
  { id: 'rohlik',         name: 'Rohlík',         b: 'pekarna',   in: { wheat: 2 }, min: 4, st: 1, cook: 1, flag: [BAIT_F, BAKE_F] },
];

// Pečivo (18 + Rohlík výš) a mezivýrobky; nové plodiny žito a mák
export const BAKERY_CROPS = [
  { id: 'zito', name: 'Žito', cat: 'obili', st: 3, min: 20, harvester: 'combine', flag: BAKE_F },
  { id: 'mak',  name: 'Mák',  cat: 'obili', st: 4, min: 24, harvester: 'combine', flag: BAKE_F },
];
export const BAKERY_RECIPES = [
  { id: 'zitna_mouka',        name: 'Žitná mouka',          b: 'mlyn',     in: { zito: 3 }, min: 5, st: 3, cook: 1, flag: BAKE_F },
  { id: 'mlety_mak',          name: 'Mletý mák',            b: 'mlyn',     in: { mak: 3 }, min: 6, st: 4, cook: 1, flag: BAKE_F },
  { id: 'tvaroh',             name: 'Tvaroh',               b: 'mlekarna', in: { mleko: 2 }, min: 12, st: 5, cook: 1, flag: BAKE_F },
  { id: 'pletynka',           name: 'Pletýnka',             b: 'pekarna',  in: { wheat: 3, vejce: 1 }, min: 8, st: 2, cook: 4, flag: BAKE_F },
  { id: 'cibulova_placka',    name: 'Cibulová placka',      b: 'pekarna',  in: { mouka: 1, cibule: 1 }, min: 10, st: 3, cook: 5, flag: BAKE_F },
  { id: 'preclik',            name: 'Preclík',              b: 'pekarna',  in: { mouka: 2, vejce: 1 }, min: 12, st: 3, cook: 5, flag: BAKE_F },
  { id: 'zitny_bochnik',      name: 'Žitný bochník',        b: 'pekarna',  in: { zitna_mouka: 2, wheat: 1 }, min: 14, st: 3, cook: 5, flag: BAKE_F },
  { id: 'cesnekova_bulka',    name: 'Česneková bulka',      b: 'pekarna',  in: { mouka: 1, cesnek: 1 }, min: 10, st: 3, cook: 6, flag: BAKE_F },
  { id: 'tresnovy_satecek',   name: 'Třešňový šáteček',     b: 'pekarna',  in: { mouka: 1, tresne: 2 }, min: 15, st: 3, cook: 6, flag: BAKE_F },
  { id: 'makovy_kolacek',     name: 'Makový koláček',       b: 'pekarna',  in: { mouka: 1, mlety_mak: 1 }, min: 15, st: 4, cook: 8, flag: BAKE_F },
  { id: 'syrova_houska',      name: 'Sýrová houska',        b: 'pekarna',  in: { mouka: 1, syr: 1 }, min: 15, st: 5, cook: 8, flag: BAKE_F },
  { id: 'dynova_bulka',       name: 'Dýňová bulka',         b: 'pekarna',  in: { mouka: 1, dyne: 1 }, min: 15, st: 5, cook: 9, flag: BAKE_F },
  { id: 'hroznovy_kolac',     name: 'Hroznový koláč',       b: 'pekarna',  in: { mouka: 2, hrozny: 2, vejce: 1 }, min: 18, st: 5, cook: 9, flag: BAKE_F },
  { id: 'tvarohovy_satecek',  name: 'Tvarohový šáteček',    b: 'pekarna',  in: { mouka: 1, tvaroh: 1, vejce: 1 }, min: 18, st: 5, cook: 10, flag: BAKE_F },
  { id: 'malinovy_croissant', name: 'Malinový croissant',   b: 'pekarna',  in: { mouka: 1, smetana: 1, maliny: 2 }, min: 20, st: 5, cook: 11, flag: BAKE_F },
  { id: 'orechove_susenky',   name: 'Ořechové sušenky',     b: 'pekarna',  in: { mouka: 1, orech: 2, med: 1 }, min: 18, st: 6, cook: 13, flag: BAKE_F },
  { id: 'jahodova_rolada',    name: 'Jahodová roláda',      b: 'pekarna',  in: { mouka: 2, jahody: 2, smetana: 1 }, min: 24, st: 6, cook: 14, flag: BAKE_F },
  { id: 'makovy_zavin',       name: 'Makový závin',         b: 'pekarna',  in: { mouka: 2, mlety_mak: 2, cukr: 1 }, min: 22, st: 8, cook: 16, flag: BAKE_F },
  { id: 'visnova_kapsa',      name: 'Višňová kapsa',        b: 'pekarna',  in: { mouka: 1, visne: 2, cukr: 1 }, min: 20, st: 8, cook: 17, flag: BAKE_F },
  { id: 'vanocka',            name: 'Vánočka',              b: 'pekarna',  in: { mouka: 2, vejce: 1, mleko: 1, cukr: 1 }, min: 30, st: 8, cook: 20, flag: BAKE_F },
  { id: 'orechovy_venec',     name: 'Mistrovský ořechový věnec', b: 'pekarna', in: { mouka: 2, tvaroh: 1, med: 1, orech: 2 }, min: 40, st: 10, cook: 30, flag: BAKE_F },
];
