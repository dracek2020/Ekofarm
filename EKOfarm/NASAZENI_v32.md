# EKOfarm v32 – nasazení (pohádková grafika celé hry)

Mění se jen vzhled. Pravidla, ekonomika, databáze ani uložené hry se nemění (`RULES_VERSION` zůstává 19). `wrangler.toml` v zipu není.

Zip obsahuje jen soubory změněné od v31:
- všech 368 obrázků v `public/img` (stejné názvy, přepíšou se) a 4 nové (`b/chatrc`, `b/chata`, `b/dum`, `b/nastenka`);
- `public/js/*.js` (číslo verze 32; kreslení stromů, cedule a nástěnky), `public/sw.js`, `public/index.html`;
- `tools/fantasy.py`, `tools/building_sizes.json`, `art/portret_01–12.webp` (portréty zatím mimo hru);
- dokumenty.

**Nasazuješ víc verzí najednou?** Rozbal po sobě zipy v28, v29, v30, v31 a v32 a nasaď jednou.

Stará grafika je v gitu (značka `v31`). Nespouštěj `tools/assets.py` – je to starý převod a přepsal by novou grafiku.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v32.zip && cd EKOfarm && rm -f NASAZENI_v31.md
```
```bash
npm test
```
Musí skončit `pass 98` a `fail 0`.
```bash
npx wrangler deploy
```

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v32" && git push && cd EKOfarm
```

## Co je nového
- **Celá grafika v útulném pohádkovém stylu:**
  - Statek 1–10, Sklad 1–10, 13 výroben, 4 ohrady, stodola, rybník, včelín, Městečko;
  - zvířata, stroje, farmář a pomocník;
  - stromy v sadu a v lese, 20 plodin ve třech fázích;
  - tráva, louka, cesty, dlažba, pole, plot a cedule;
  - 177 ikon a ikona aplikace.
- **Nové obrázky** domků týmu (chatrč, chata, dům) a Nástěnky.
- **Kreslení** (jen vzhled):
  - stromy mají větší plátno (192×256) a stojí v trsu trávy;
  - cedule „Na prodej“ má text na nové tabuli;
  - nástěnka se kreslí jako budova.
- **Mezipaměť obrázků** v telefonu se po nasazení vymění sama (`IMG_CACHE` v20). Kdyby někdo viděl staré obrázky, stačí hru jednou nebo dvakrát znovu načíst.
- Hra je o něco větší: grafika má asi 6 MB místo 4 MB. Budovy se dál načítají, až když jsou na farmě.

## Co jsem ověřil a co ne
- Testy: 98 z 98 (pravidla se neměnila).
- V prohlížeči (telefon a širší okno), testovací verze i lokální server:
  - farma se všemi druhy budov, ohrady se zvířaty;
  - sad se stromy ve všech stavech, pole se všemi plodinami;
  - les, Městečko a cedule pozemků;
  - okna Stavět a Sklad (ikony);
  - nová hra (registrace), umístění Skladu.
- Bez chyb v konzoli a bez chybějících obrázků.
- Nezkoušel jsem skutečný telefon a nasazený server.
- **Licence:** grafika je ze Scenario (model GPT Image 2.5 Flare). Před komerčním vydáním ulož snímek licence modelu a exportuj prompty (`EKOFARM_LEGAL_CHECKLIST.md`, oddíl 3, bod 8).
