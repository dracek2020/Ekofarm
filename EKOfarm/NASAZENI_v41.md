# EKOfarm v41 – nasazení (hra všude chce jen to, co hráč může mít)

Navazuje na **v40**. Zip obsahuje jen soubory změněné od v40, takže v40 musí být nasazená. Pokud ještě není, rozbal nejdřív `EKOfarm_v40.zip` a pak tenhle.

`wrangler.toml` v zipu není. Nic se neresetuje a migrace databáze **není potřeba**.

## Postup v Codespace
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`

**1. Rozbalit a otestovat**
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v41.zip && cd EKOfarm && rm -f NASAZENI_v40.md
```
```bash
npm test
```
Musí skončit `pass 156` a `fail 0`.

**2. Nasadit**
```bash
npx wrangler deploy
```

### Aktualizace u všech hráčů
- Server po nasazení přijímá jen aplikaci v41.
- Kdo má otevřenou v38, v39 nebo v40, tomu se hra **sama načte znovu**. Postup zůstane.
- Kdo by měl v37 nebo starší, uvidí hlášku *„Je tu nová verze hry. Zavři ji a otevři znovu.“*

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v41" && git push && cd EKOfarm
```

## Co je nového
**Pravidlo:** hra chce jen zboží, které hráči už odemkl Statek a jeho dovednosti Vaření a Rybaření. Musí se dát vyrobit ze surovin, ke kterým se taky dostane. Budovu možná ještě musí postavit (třeba Mlékárnu na sýr, když už má Statek 5).

- **Zakázky:**
  - Chtějí jen takové zboží. Příklad: uzeného pstruha až s Rybařením 7, protože pstruh dřív nebere.
  - Staré zakázky, které chtěly něco nedostupného, se při prvním načtení farmy samy vymění za nové. Ostatní zůstanou.
- **Stánek** nabízí a vykupuje jen dostupné zboží.
- **Dárky z událostí a příběhu** (náhodný výrobek) jsou jen z dostupného.
- **Pohoštění na nástěnce:**
  - Když jedna z možností chce něco nedostupného, nabídne se místo toho jiné dostupné zboží podobné hodnoty. Bere se nejdražší dostupné, které je stejně drahé nebo levnější, kusů víc (nejvýš 20).
  - Příklad: tým 2–4 lidé na Statku 1 nabídne chléb, nebo kukuřici místo vajec.
  - Obě možnosti se vždy liší.
- **Události a příběh:** odpověď, která potřebuje věc, kterou hráč ještě nemůže mít, se neukáže. Příklad: past s návnadou před Krmivárnou. Každá událost má pořád aspoň dvě odpovědi.
- **Týdenní soutěž:**
  - Od pondělí 16. 11. 2026 se soutěží jen v tom, co zvládne každý od začátku. Úkoly se střídají po týdnech: sklizeň plodin, zakázky, výdělek z prodeje, setí.
  - Rozjetý týden (výdělek z prodeje) se nemění.
- **Beze změny:**
  - Suroviny na vylepšení budov (opravené ve v40), aby se ceny rozjetých vylepšení neměnily.
  - Denní úkoly už dřív dávaly jen to, na co má hráč budovu, zvířata nebo rybník.

## Co jsem ověřil a co ne
- **Testy:** 156 ze 156. Z toho 6 nových (`test/v41.test.js`):
  - dostupné zboží podle Statku, Vaření, Rybaření a surovin;
  - zakázky ve 6 různých stavech farmy, každý 30×, a výměna starých zakázek;
  - Stánek na Statku 1–9;
  - pohoštění pro různě velké týmy včetně vyvěšení inzerátu s náhradou;
  - skryté odpovědi ve všech událostech;
  - týdenní soutěž.
- **V testovací verzi v prohlížeči (iPhone 13):** na Statku 1 se zakázka na sýr a med vyměnila, pohoštění nabídlo kukuřici místo vajec a Stánek má jen plodiny a chléb.
- **Neověřeno:** nasazený server a skutečný telefon.
