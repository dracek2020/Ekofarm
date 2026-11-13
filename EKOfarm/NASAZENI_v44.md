# EKOfarm v44 – nasazení (dovednosti rostou mnohem pomaleji)

Navazuje na **v43**. Zip obsahuje jen soubory změněné od v43. `wrangler.toml` v zipu není.

Migrace databáze **není potřeba**. Dovednosti se každé farmě přepočítají samy při prvním načtení.

> Pozn.: dřív poslaný `EKOfarm_v44_priprava.zip` (ovoce) **není** tahle verze. Ovoce teď ponese číslo v45.

## Postup v Codespace
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`

**1. Rozbalit a otestovat**
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v44.zip && cd EKOfarm && rm -f NASAZENI_v43.md
```
```bash
npm test
```
Musí skončit `pass 166` a `fail 0`.

**2. Nasadit**
```bash
npx wrangler deploy
```

### Aktualizace u všech hráčů
- Server po nasazení přijímá jen aplikaci v44.
- Kdo má otevřenou starší verzi (od v38), tomu se hra **sama načte znovu**.

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v44" && git push && cd EKOfarm
```

## Co je nového
- **Nová křivka:**
  - úroveň 10 = 8 100 XP (dřív 1 000);
  - úroveň 20 = 36 100 XP (dřív 3 000);
  - úroveň 50 = 240 100 XP.
- **Zkušenosti za kus podle náročnosti práce, ne podle ceny.** Je to stejně jako zkušenosti hráče za ruční práci:
  - pšenice 0,5 za kus;
  - mléko 4 (dřív 18);
  - chléb 3;
  - úlovek ×5 (rybaří jen hráč).
- **Práce týmu se počítá čtvrtinou.** Platí pro sklizeň, chov i výrobu týmem, včetně dávek, které tým vyrobil a hráč jen vybral.
- **Přepočet dosavadních hráčů (jednou):**
  - Dovednosti se spočítají znovu ze statistik farmy. Předpokládá se, že asi 80 % práce udělal tým.
  - Úrovně klesnou, například Farmaření z 20 asi na 5–8.
  - Koupené stroje a udice zůstanou.
  - Recepty a vzácnější ryby se znovu odemknou, až dovednost doroste. Tým je mezitím přestane vyrábět, rozjeté výroby doběhnou.

### Jak rychle to teď roste
Změřeno na simulaci 24 h farmy s týmem:
- **Tým 8 lidí:** Farmaření asi +470 XP a Vaření +80 XP za den. Úroveň 10 za 2–3 týdny, s vlastním hraním dřív.
- **Tým 15 lidí:** Farmaření asi +1 800 XP a Vaření +760 XP za den. Úroveň 10 za 4–5 dní, 20 za necelé 3 týdny.
- **Jen ruční hraní nepřetržitě celý den** (6 polí pšenice) dá Farmaření 10. Běžné hraní je výrazně méně.

## Co jsem ověřil a co ne
- **Testy:** 166 ze 166. Z toho 4 nové (`test/v44.test.js`):
  - křivka;
  - zkušenosti za kus;
  - den nepřetržitého ručního sázení dá méně než úroveň 15;
  - jednorázový přepočet dosavadních hráčů.
- **V testovací verzi v prohlížeči:** okno Dovednosti po přepočtu. Farma se Farmařením 20 podle starých pravidel spadla na úroveň 6.
- **Neověřeno:** nasazený server a skutečný telefon. Tempo u skutečných hráčů se ukáže až za pár dní. Dá se doladit jedním číslem (`SKILL_K` v `public/js/rules.js`).
