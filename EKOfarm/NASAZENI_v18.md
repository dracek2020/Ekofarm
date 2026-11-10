# EKOfarm v18 – nasazení (oprava spuštění hry)

Databáze ani nastavení se nemění. `wrangler.toml` v zipu není.

**Tentokrát je v zipu výjimečně celá hra** (asi 4 MB), ne jen změněné soubory. Je to schválně: ať je v repozitáři cokoli, po rozbalení bude všechno kompletní a ve správné verzi.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v18.zip && cd EKOfarm
```
```bash
npm test
```
Musí skončit `pass 64` a `fail 0`.
```bash
npx wrangler deploy
```
Na konci musí být řádek s adresou `https://ekofarm.xxarenaxx.workers.dev`. Když tam místo toho bude chyba, pošli mi ji.

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip EKOfarm/NASAZENI_v16.md EKOfarm/NASAZENI_v17.md
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v18" && git push && cd EKOfarm
```
Pak hru na iPadu zavři a znovu otevři.

## Co bylo špatně a co jsem opravil
Na tvou hru jsem se odsud nedostal (server ani tvůj iPad nejsou z mého prostředí dostupné), takže příčinu nemám potvrzenou přímo. Našel jsem ale chybu, která tomu přesně odpovídá:

- Od v16 hra při startu čekala, až se připraví všech asi 180 obrázků, a to až 15 sekund. Zároveň běžel hlídač, který po 15 sekundách napíše „Hra se nenačetla“. Když příprava obrázků na iPadu trvala dlouho nebo zůstala viset, hra vypadala jako rozbitá, i když na serveru bylo všechno v pořádku.
- **Teď** se přihlášení ukáže hned a hra se spustí, jakmile má to, co je vidět na obrazovce. Nejdéle čeká 6 sekund a pak se spustí tak jako tak; zbytek obrázků se dokreslí, až dorazí.
- Nová rychlejší kresba země z v17 má pojistku: kdyby ji prohlížeč nezvládl, hra se sama přepne na původní způsob kreslení.

Vyzkoušel jsem start ve 12 nepříznivých situacích (obrázky se nenačtou, obrázky visí, chybí soubor na serveru, …). Hra se pokaždé spustila, nebo napsala přesný důvod.

## Kdyby se hra ani teď nespustila
Nově **napíše chybu přímo na obrazovku**:
- Při startu: „Hra se nenačetla“ a pod tím důvod. Když na serveru chybí některý soubor, napíše který.
- Za běhu: červený rámeček dole.

V tom případě mi pošli snímek obrazovky a napiš, jestli jde o hru na serveru, nebo o testovací verzi tady v chatu.
