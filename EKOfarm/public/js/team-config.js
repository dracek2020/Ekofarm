// EKOfarm – čísla Farmářského týmu. Jen data, žádné importy: vyvažuje se tady, ne v kódu.

// výkon podle úrovně 1–12: úroveň 12 udělá za stejný čas 12× víc práce než úroveň 1 (geometricky, pomalý start)
const MULT = [0];
for (let L = 1; L <= 12; L++) MULT.push(Math.round(Math.pow(12, (L - 1) / 11) * 100) / 100);

export const TEAM = {
  maxTeam: 30,                      // víc lidí na farmě nebude, i kdyby bylo víc lůžek
  // kolik pracovníků může být v budově podle její úrovně 1–10 (v31): výrobna 1 / 2 / 3 / 4 od úrovně 1 / 4 / 7 / 10,
  // ohrada 1 a od úrovně 5 dva; včelín a sklad 1
  cap: {
    factory: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4],
    pen:     [1, 1, 1, 1, 2, 2, 2, 2, 2, 2],
    hive:    [1],
    trader:  [1],
  },
  // síla obsluhy: pracovníci seřazení podle výkonu přispívají 100 %, 60 %, 40 %, 30 % (druhý člověk výrobu nezdvojnásobí)
  // výrobna: součet = kolik kusů jde do jedné dávky; ohrada: výnos z jednoho krmení (druhý chovatel přidá čtvrtinu svého)
  crew: { factory: [1, 0.6, 0.4, 0.3], pen: [1, 0.25] },
  // slučování práce (výkon výpočtu): jeden úkon = nejvýš 12 políček / zvířat a nejvýš 30 s práce
  batch: { max: 12, ms: 30000 },
  areaPer: 4,                       // oblast polí a sadů: 1 pracovník na každá 4 políčka (6 → 1, 8 → 2, 12 → 3)
  usedWindowH: 4,                   // procenta = podíl výrobního času; pamatuje si asi poslední 4 h výroby
  logH: 6,                          // přehled výroby za posledních 6 hodin
  // profese = obor, ve kterém se pracovník učí naplno (mimo něj poloviční zkušenosti a 90 % výkonu)
  profs: {
    pole:   { name: 'Pěstitel',  icon: 'farmer', text: 'pole a sady' },
    chov:   { name: 'Chovatel',  icon: 'hen',    text: 'zvířata a včely' },
    vyroba: { name: 'Řemeslník', icon: 'chleb',  text: 'výrobny' },
    sklad:  { name: 'Skladník',  icon: 'market', text: 'prodej na trhu' },
  },
  offProf: { xp: 0.5, power: 0.9 },
  maxLvl: 12,
  // kolik zkušeností je potřeba na úroveň (index = úroveň). Při nepřetržité práci asi:
  // úroveň 2 za 1 h, 5 za 14 h, 8 za 75 h, 10 za 190 h, 12 za 480 h – za týden nikdo dvanáctku mít nebude.
  xpLvl: [0, 0, 40, 140, 400, 950, 2100, 4500, 9000, 18000, 35000, 70000, 140000],
  mult: MULT,                       // [_, 1, 1.25, 1.57, 1.97, 2.47, 3.09, 3.87, 4.86, 6.09, 7.63, 9.57, 12]
  // délka úkonu na úrovni 1 (s); dělí se výkonem. Pole: 12 s na políčko, na úrovni 12 jen 1 s.
  work: { harvest: 12, plant: 12, pick: 15, dig: 24, sapling: 24, haul: 9, load: 9, feed: 7, gather: 7, comb: 12 },
  xpValue: 0.1,                     // zkušenosti = hodnota hotového výrobku × 0,1 (těžší věci = víc zkušeností)
  xpTrade: 0.05,                    // skladník: tržba × 0,05
  playerXp: 0.25,                   // hráč dostane z práce týmu čtvrtinu XP, jakou by dostal za ruční práci
  // náročnost: [nejvyšší úroveň hráče, od které se věc odemyká, potřebná úroveň pracovníka]
  need: [[4, 1], [7, 2], [10, 4], [13, 6], [999, 8]],
  // chov: kolik produktů dá zvíře za jedno krmení (úroveň 1 → 1, úroveň 12 → 3)
  penYield: MULT.map((_, L) => (L ? Math.round((1 + 2 * (L - 1) / 11) * 100) / 100 : 0)),
  trade: {
    iv: 30 * 60 * 1000,             // trh každou půlhodinu
    cap: MULT.map(m => Math.round(30 * m / 5) * 5),             // kusů na jeden trh: 30 … 360
    bonus: [0, 0, 2, 4, 6, 8, 10, 12, 14, 17, 20, 22, 25],      // o kolik % lepší cena
    rows: [0, 4, 5, 5, 6, 7, 8, 8, 9, 10, 11, 12, 12],          // kolik druhů zboží zvládne
  },
  traits: {
    ucenlivy:   { name: 'Učenlivý',   text: '+25 % zkušeností', xp: 1.25 },
    sikovny:    { name: 'Šikovný',    text: '+6 % rychlost práce', work: 1.06 },
    peclivy:    { name: 'Pečlivý',    text: '+5 % výrobků, úrody od zvířat a zboží na trh', out: 1.05 },
    vsestranny: { name: 'Všestranný', text: 'mimo svou profesi pracuje naplno', any: true },
  },
  // nástěnka v Městečku
  board: {
    waitMin: 20, perMember: 5,      // uchazeči přijdou za 20 min + 5 min za každého člena týmu
    stayH: 24,                      // pak čekají 24 h
    // pohoštění podle velikosti týmu: do kolika členů → dvě možnosti
    offers: [
      { upTo: 1,  opts: [[['wheat', 4]], [['redkvicka', 4]]] },
      { upTo: 4,  opts: [[['chleb', 3]], [['vejce', 3]]] },
      { upTo: 8,  opts: [[['kolac', 2]], [['dzus_jablko', 2]]] },
      { upTo: 14, opts: [[['syr', 2]], [['marmelada', 2]]] },
      { upTo: 99, opts: [[['syr', 2], ['kolac', 2]], [['marmelada', 2], ['med', 2]]] },
    ],
  },
  // pověst farmy: body a 10 stupňů
  rep: {
    order: 3, quest: 1,
    tiers:    [0, 20, 60, 120, 220, 360, 550, 800, 1100, 1500],
    cands:    [2, 2, 3, 3, 3, 3, 4, 4, 4, 4],
    startLvl: [[1, 1], [1, 1], [1, 2], [1, 2], [1, 3], [1, 3], [2, 3], [2, 4], [2, 4], [3, 5]],
    selfH:    [0, 0, 48, 48, 24, 24, 24, 12, 12, 12],           // jak často se někdo ozve sám (h), 0 = ne
    ads:      [1, 1, 1, 1, 2, 2, 2, 2, 2, 2],                   // kolik inzerátů může viset najednou
  },
  // zásluhy pro vylepšení Statku na danou úroveň (navíc k mincím a surovinám)
  statek: [null, null,
    { player: 3,  k: 'harvest', n: 40 },
    { player: 5,  k: 'orders',  n: 10 },
    { player: 7,  k: 'animal',  n: 30 },
    { player: 9,  k: 'rep',     n: 4 },
    { player: 11, k: 'produce', n: 150 },
    { player: 13, k: 'rep',     n: 6 },
    { player: 15, k: 'produce', n: 400 },
    { player: 17, k: 'rep',     n: 8 },
    { player: 19, k: 'produce', n: 1000 },
  ],
  meritText: { harvest: 'Sklizeno plodin', orders: 'Doručeno zakázek', animal: 'Nasbíráno od zvířat', produce: 'Vyrobeno výrobků', rep: 'Pověst farmy' },
};
