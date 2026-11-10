# EKOfarm v22 – nasazení (přesouvání budov a polí)

Databáze ani nastavení se nemění. `wrangler.toml` v zipu není. Obrázky se nemění.

Zip obsahuje jen změněné soubory.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v22.zip && cd EKOfarm
```
```bash
npm test
```
Musí skončit `pass 66` a `fail 0`.
```bash
npx wrangler deploy
```

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip EKOfarm/NASAZENI_v21.md
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v22" && git push && cd EKOfarm
```
Pak hru na telefonu zavři a znovu otevři.

## Co je nového
- **Podrž prst na budově nebo poli** (asi půl vteřiny). Zvedne se, na Androidu telefon krátce zavibruje, a můžeš ho rovnou táhnout jinam. Dole se objeví lišta: ✓ potvrdí nové místo, ✕ přesun zruší.
  - Zelený obrys znamená, že se tam vejde. Červený, že ne.
  - Krátké klepnutí funguje jako dřív: otevře budovu nebo vybere plodinu.
- **Přesunout jde všechno:** Statek, Sklad, stodola, výrobny, ohrady se zvířaty, sady se stromy, rybník, včelín, ozdoby, velká pole i malá pole.
- **Malé pole** se přesune i s tím, co na něm roste, a růst pokračuje.
- Na zralé pole nebo zralý strom podržení nefunguje, tam se dál sklízí přejetím prstem.
- **Statek a Sklad** mají v okně i tlačítko „↔ Přesunout“ (u Statku v záložce Statek). Ostatní budovy ho měly už dřív.
- Tip je v okně Stavět a v nápovědě (Menu → Jak hrát → Základy).
