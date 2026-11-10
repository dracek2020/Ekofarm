# EKOfarm v24 – nasazení (obchodník prodává jednou za 30 minut)

Databáze ani nastavení se nemění. `wrangler.toml` v zipu není. Obrázky se nemění.

Zip obsahuje jen změněné soubory.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v24.zip && cd EKOfarm
```
```bash
npm test
```
Musí skončit `pass 68` a `fail 0`.
```bash
npx wrangler deploy
```

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip EKOfarm/NASAZENI_v23.md
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v24" && git push && cd EKOfarm
```

## Co je nového
- **Obchodník ve skladu** prodává jednou za delší dobu a prodá najednou víc kusů:

  | Úroveň | Prodává jednou za | Najednou prodá |
  |---|---|---|
  | 1 | 30 min | 10 ks |
  | 2 | 25 min | 15 ks |
  | 3 | 20 min | 20 ks |
  | 4 | 15 min | 30 ks |
  | 5 | 10 min | 40 ks |

- **Vesničané ve výrobnách, ohradách a včelínech** se nemění: obchůzka každé 2 min až každých 30 s.
- V okně vesničana je napsané, co přinese další úroveň.
