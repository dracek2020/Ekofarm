# EKOfarm v25 – nasazení (farmáři, pracovní oblasti a zásoby)

Databáze ani nastavení se nemění. Semena a sazenice, které hráči mají ve Skladu, se při prvním spuštění samy přestěhují do Statku. `wrangler.toml` v zipu není. Obrázky se nemění.

Zip obsahuje jen změněné soubory.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v25.zip && cd EKOfarm
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
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip EKOfarm/NASAZENI_v24.md
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v25" && git push && cd EKOfarm
```

## Co je nového

### Zásoby ve Statku
- **Semena a sazenice** se ukládají ve **Statku** (záložka Zásoby), ne ve Skladu. Ve Skladu tím zůstane víc místa.
- **Kapacita:** na každé pole a každý sad se vejdou **3 kusy**. Například 12 polí a 2 sady = 42 kusů.
- **Plní je:** Semenárna (semena) a Školka (sazenice). Hotové výrobky jdou rovnou do Statku.
- **Nákup za mince:** ve Stánku v městečku je nová záložka **Zásoby** se semeny, sazenicemi a krmivem. Krmivo jde do Skladu.

| Co | Cena za kus |
|---|---|
| Semena | jako zasazení plodiny |
| Sazenice | cena stromu |
| Krmivo | jeho cena |

- Nabízí se jen to, co máš na své úrovni odemčené.

### Farmáři a pracovní oblasti
- **Koupě:** Statek → záložka **Farmáři**, nejvýš **5** po 100 mincích. Vylepšují se stejně jako ostatní vesničané (100, 200, 300, 400 mincí).
- **Pracovní oblast** tvoří aspoň **4 pole vedle sebe** (sousedé přes hranu, ne přes roh). Stejně to platí pro **4 sady**.
  - Přikoupené pole hned vedle oblast zvětší, nezruší ji.
  - 4 pole o kus dál udělají novou oblast 2.
  - Na mapě je u oblasti s farmářem zelené (pole) nebo oranžové (sad) kolečko s číslem a stojí tam farmář.
- **V záložce Farmáři** přiřadíš farmáře k oblasti (v jedné oblasti pracuje jeden) a vybereš:
  - u polí, **co má sázet**;
  - u sadu, **jaký strom zasadit** místo suchého.
  - „⏸ jen sklízet“ znamená, že jen sklízí.
- **Co farmář dělá:** sklízí zralé do Skladu, v sadu vykopává suché stromy a sází, ale **jen ze zásob ve Statku**. Když semena nebo sazenice dojdou, nesází a v okně je odkaz na dokoupení.

| Úroveň | Obchůzka | Najednou obslouží |
|---|---|---|
| 1 | každé 2 min | 4 políčka |
| 2 | každých 90 s | 6 políček |
| 3 | každou minutu | 9 políček |
| 4 | každých 45 s | 12 políček |
| 5 | každých 30 s | 16 políček |

- **Pomocník** (Statek → Pomocník) zůstává jako dřív.
