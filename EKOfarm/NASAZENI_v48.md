# EKOfarm v48 – nasazení (nové okno výroben, ruční výroba i s pracovníkem)

Navazuje na **v47**. Zip obsahuje jen soubory změněné od v47: kód, testy, nástroje a dokumenty. Žádné nové obrázky. `wrangler.toml` v zipu není.

Nic se neresetuje a migrace databáze **není potřeba**. Recepty, ceny, odemykání, zásoby, fronty, pracovníci a jejich plány zůstávají. Rozjeté ruční i týmové dávky ve výrobnách doběhnou normálně.

## Postup v Codespace
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`

**1. Rozbalit a otestovat**
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v48.zip && cd EKOfarm && rm -f NASAZENI_v47.md
```
```bash
npm test
```
Musí skončit `pass 269` a `fail 0`. (Testy zátěže týmu trvají pár sekund.)

**2. Nasadit**
```bash
npx wrangler deploy
```

### Aktualizace u všech hráčů
- Server po nasazení přijímá jen aplikaci v48.
- Kdo má otevřenou starší verzi (od v38), tomu se hra **sama načte znovu**.

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v48: okno výroben, ruční výroba i s pracovníkem" && git push && cd EKOfarm
```

## Co je nového
| Kde | Novinka |
|---|---|
| Každá výrobna | Nové okno: hlavička s budovou, úrovní a stavem; záložky **Přehled, Tým, Plán výroby, Suroviny** |
| Plán výroby → **Vyrobit sám** | Vlastní fronta hráče (3 místa, víc s úrovní budovy), počet dávek, suroviny a rezervy, čas a „hotovo asi za“, **Zařadit do výroby**, Vyzvednout. Funguje i s Řemeslníkem v budově. |
| Plán výroby → **Automaticky – tým** | Procenta času, cílové zásoby, odhad ks/h (plný i skutečný), stav každého výrobku, souhrn; platí po **Uložit plán** |
| Suroviny | Ve skladu, rezerva, pro tým, spotřeba za hodinu, výdrž, odkud surovina je, volné místo ve skladu |
| Ohrada, včelín, rybník, sad, velké pole, domky | Stejná hlavička se stavem; v ohradě karta **Postarat se sám** (i s chovatelem). Rybník dál otevírá rybaření. |

**Jak to funguje:** výrobna má jednu výrobní linku. Hráčova dávka jde na řadu hned po té, která se právě vyrábí (předběhne dávky týmu, které ještě nezačaly). Tým má svá místa ve frontě a vyrábí dál; hráčovy hotové výrobky neodnáší – čekají na hráče. Za ruční dávku dostane hráč plné XP, za dávku týmu čtvrtinu (jako dřív).

## Kdyby bylo potřeba něco vypnout
V `public/js/eco-config.js` přepni `building_ui_v2` v `ECO_FLAGS_DEFAULT` na `false` a znovu nasaď (se zvednutým `CLIENT_MIN` a `node tools/version.mjs`). Vrátí se původní okno výrobny i původní společná fronta. Uložené farmy zůstanou v pořádku.
