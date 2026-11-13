# EKOfarm v42 – nasazení (setí ze zásob osiva, nebo za mince)

Navazuje na **v41**. Zip obsahuje jen soubory změněné od v41, takže v41 musí být nasazená. Pokud ještě není, rozbal nejdřív `EKOfarm_v40.zip` (pokud chybí i ta), pak `EKOfarm_v41.zip` a nakonec tenhle.

`wrangler.toml` v zipu není. Nic se neresetuje a migrace databáze **není potřeba**.

## Postup v Codespace
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`

**1. Rozbalit a otestovat**
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v42.zip && cd EKOfarm && rm -f NASAZENI_v41.md
```
```bash
npm test
```
Musí skončit `pass 159` a `fail 0`.

**2. Nasadit**
```bash
npx wrangler deploy
```

### Aktualizace u všech hráčů
- Server po nasazení přijímá jen aplikaci v42.
- Kdo má otevřenou v38 až v41, tomu se hra **sama načte znovu**. Postup zůstane.

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v42" && git push && cd EKOfarm
```

## Co je nového
### Okno „Co zasadit?“ má dvě skupiny
- **Ze zásob osiva** (nahoře): jen plodiny, na které má hráč osivo, s počtem kusů. Setí nestojí mince, osivo ubude ze zásob.
  - Když osivo nemá, ukáže se tip, že ho vyrábí Semenárna.
- **Za mince** (pod tím, podle kategorií jako dřív): platí se mincemi a **osivo ve zásobách zůstane týmu**.
- Setí tažením prstu pokračuje stejným způsobem, jak hráč začal. Lišta dole ukazuje „ze zásob (zbývá N)“, nebo „za X mincí“.
- Když při tažení dojde osivo nebo mince, setí skončí s hláškou.

### Stroje
- U **velkého pole** a u **Zasít vše** traktorem (Prodejna strojů → Traktory) je přepínač, čím zaplatit setí:
  - „Nejdřív osivo ze zásob“: jako dřív, co chybí, doplatí mince;
  - „Jen za mince“: osivo zůstane týmu.
- Hra si volbu pamatuje.

## Co jsem ověřil a co ne
- **Testy:** 159 ze 159. Z toho 3 nové (`test/v42.test.js`):
  - setí za mince nechá osivo ve zásobách;
  - setí ze zásob nestojí mince a bez osiva nejde (`no_seeds`);
  - traktor na malá pole a velké pole s „Jen za mince“.
- **V testovací verzi v prohlížeči (iPhone 13):**
  - obě skupiny v okně „Co zasadit?“;
  - zasazení ze zásob (osivo 12 → 11, mince beze změny);
  - zasazení za mince (osivo zůstalo, −1 mince);
  - lišta setí;
  - přepínač u velkého pole.
- **Neověřeno:** nasazený server a skutečný telefon. Tažení prstem přes víc polí jsem nezkoušel na dotykovém displeji.
