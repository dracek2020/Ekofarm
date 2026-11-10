# EKOfarm v19 – nasazení (vykopání stromu a doplněná grafika)

Databáze ani nastavení se nemění. `wrangler.toml` v zipu není.

Zip obsahuje jen změněné soubory: kód a 21 obrázků (plodiny, lesní stromy, ikony ryb a jídel).

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v19.zip && cd EKOfarm
```
```bash
npm test
```
Musí skončit `pass 65` a `fail 0`.
```bash
npx wrangler deploy
```

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip EKOfarm/NASAZENI_v18.md
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v19" && git push && cd EKOfarm
```
Pak hru na telefonu zavři a znovu otevři, aby se stáhly nové obrázky.

## Co je nového

### Vykopání stromu
- V okně sadu je u rostoucího stromu tlačítko **Vykopat a zasadit jiný strom**. Hra se nejdřív zeptá, jestli to myslíš vážně, a napíše, co dostaneš zpátky.
- **Dokud strom nedal žádnou úrodu**, vrátí se ti sazenice do skladu, nebo mince, když jsi sazenici kupoval.
- Když už strom plodil, vykopat ho jde, ale nic se nevrací.
- Strom se zralým ovocem jde vykopat, až ovoce sklidíš.
- Po vykopání se okno rovnou přepne na výběr nového stromu.
- U stromů zasazených před touto verzí hra neví, jak se za ně platilo, takže se za ně nic nevrací.
- Suchý strom jde vykopat jako dřív, klepnutím na něj.

### Grafika z tvých archů 17–19
- **Sója, hrách a salát** mají vlastní obrázky ve všech 3 fázích. Na poli mají stejnou velikost jako ostatní plodiny.
- **Lesní stromy** (dub, smrk, bříza) jsou celé, i s kmenem.
- **Malované ikony** mají: karas, cejn, amur, úhoř, bolen, jeseter, rybí karbanátky, amur na grilu a bolen na bylinkách.

### Co v archu 19 chybělo
Dvě jídla v archu byla jiná, než se zadávalo: místo uzeného úhoře grilovaný filet s bramborami a místo kaviáru rybí polévka. Tyhle dva obrázky jsem nepoužil. **Uzený úhoř** a **Kaviár** mají zatím dál staré jednoduché ikony. Pokud chceš, nech v ChatGPT nakreslit ještě tyto dva (stejný styl jako arch 19):
- Uzený úhoř – kousky uzeného úhoře (zlatohnědá kůže) na dřevěném prkénku.
- Kaviár – skleněná miska černého kaviáru se lžičkou, podložená ledem.
