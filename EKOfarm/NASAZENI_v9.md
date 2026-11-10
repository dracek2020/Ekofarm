# EKOfarm v9 – nasazení (jen změněné soubory)

Databáze se nemění, farmy hráčů zůstanou. Hra jim sama doplní **Prodejnu strojů** a **Stánek**. Kdo už má traktor nebo kombajn, dostane **Stodolu zdarma** k umístění. `wrangler.toml` v zipu není.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v9.zip && cd EKOfarm
```
```bash
npm test
```
Musí skončit `pass 47` a `fail 0`.
```bash
npx wrangler deploy
```
```bash
cd /workspaces/Ekofarm && git add . && git commit -m "EKOfarm v9" && git push && cd EKOfarm
```
Pak hru v prohlížeči jednou obnov.

## Co je nového
- **Plodiny:** 20 druhů na pole, z toho 13 druhů zeleniny, plus jahody a meloun. Výběr je rozdělený na Obilí, Zeleninu a Ovoce.
- **Sad:** 5 keřů (maliny, rybíz, angrešt, borůvky, réva) a 8 stromů. Celkem 15 druhů ovoce.
- **Zvířata a výroba:** nově prasata a ovce. Nové výrobny: konzervárna, džusárna, marmeládárna, uzenářství a textilka, dohromady 43 výrobků. Každá plodina a ovoce se někde použije.
- **Vylepšování budov:** každou budovu jde vylepšit až na úroveň 10 za suroviny a mince.
  - Úroveň ukazuje modré číslo na budově.
  - Výrobny pak vyrábějí rychleji a mají delší frontu.
  - Do ohrad se vejde víc zvířat.
  - Sklad má víc místa.
- **Statek:** jeho vylepšení odemyká nové budovy. Ostatní budovy nemůžou mít vyšší úroveň než Statek.
- **Stodola:** traktory a kombajny parkují ve stodole. Začíná na 2 místech, každá úroveň přidá 1. Stroje se dají prodat za polovinu ceny.
- **Prodejna strojů:** je teď budova na farmě. Tlačítko Stroje nahradilo tlačítko **Novinky**.
- **Stánek:** nová nabídka každé 2 hodiny. Koupíš v něm, co ti chybí (dráž), a prodáš za lepší cenu než ve výkupu skladu.
- **Pomocník:** najmeš ho ve Statku → Pomocník na 1, 4 nebo 8 hodin.
  - Sám sklízí a zasívá plodinu, kterou mu vybereš.
  - Kolečko a motyka z prodejny a traktor mu práci zrychlí.
- **Farmář:** po farmě chodí panáček a jde dělat práci, kterou mu zadáš.
- **Ekonomika:**
  - Výkup ve skladu platí polovinu ceny.
  - Vydělávat se vyplatí hlavně na zakázkách a ve stánku.
  - Občas přijde „bohatá úroda“ a sklidíš dvakrát víc.
- Ceny všech plodin a výrobků jsou v souboru **EKONOMIKA.md**.
