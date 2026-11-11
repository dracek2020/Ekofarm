# EKOfarm v26 – nasazení (nová úroveň, deník farmáře, rybaření)

Databáze ani nastavení se nemění. `wrangler.toml` v zipu není. Obrázky se nemění.

Zip obsahuje jen změněné soubory.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v26.zip && cd EKOfarm
```
```bash
npm test
```
Musí skončit `pass 69` a `fail 0`.
```bash
npx wrangler deploy
```

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip EKOfarm/NASAZENI_v25.md
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v26" && git push && cd EKOfarm
```

## Co je nového
- **Okno nové úrovně:**
  - Vyskočí velká zlatá hvězda s číslem úrovně, točícími se paprsky a padajícími konfetami.
  - Pod ní jsou dlaždice se vším, co se odemklo: plodiny, stromy, zvířata, výrobky a stroje.
  - Objeví se, i když úroveň stoupne díky práci vesničanů. Zavřeš ho tlačítkem „Super!“.
- **Co je která surovina:**
  - U vylepšení budovy jsou potřebné suroviny tlačítka. Stejně tak u zakázek ve Statku.
  - Klepnutím se otevře karta suroviny: kolik jí máš, kde ji získáš (pole, strom, zvíře, výrobna i s recepturou, rybník, Stánek), k čemu je a od jaké úrovně ji jde mít.
  - Tlačítko „← Zpět“ tě vrátí do okna, odkud jsi přišel.
- **Deník farmáře:**
  - Nové tlačítko vpravo pod Chatem.
  - Všechny suroviny po záložkách: Plodiny, Ovoce, Zvířata, Výrobky, Ryby, Zásoby.
  - Zamčené jsou šedé s nápisem „od úrovně N“. Klepnutím na kteroukoli otevřeš její kartu.
  - V kartě jdou proklikávat suroviny dál, třeba z pšenice na mouku a z mouky na chleba.
- **Rybaření je hezčí:**
  - Rybník má vlny, odlesk a rákosí po stranách.
  - Kolem splávku se dělají kroužky, při záběru rychlejší.
  - Ryba se na ukazateli mrská a zelená zóna svítí, když je ryba v ní.
  - Ukazatel úlovku je zlatý a úlovek se ukáže s paprsky.
  - Ovládání se nemění.
