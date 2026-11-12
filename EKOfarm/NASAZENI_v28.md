# EKOfarm v28 – jen dokumenty (návrh Farmářského týmu a právní checklist)

**Kód hry se nemění, nasazovat na server není potřeba.** `wrangler.toml` v zipu není. Obrázky se nemění.

Zip obsahuje jen změněné soubory: dva nové dokumenty, upravený `STAV.md` a `AUTORSKA_PRAVA.md` a tento návod.

## Postup v Codespace (po jednom)
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v28.zip && cd EKOfarm
```
```bash
npm test
```
Musí skončit `pass 79` a `fail 0` (stejně jako ve v27).

`npx wrangler deploy` tentokrát **není potřeba**.

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip EKOfarm/NASAZENI_v27.md
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v28: návrh Farmářského týmu, právní checklist" && git push && cd EKOfarm
```

## Co je nového
- **`TYM_NAVRH.md` – analýza a plán Farmářského týmu:**
  - co hra už umí (v27) a co chybí;
  - profese a vlastnosti pracovníků, kapacity pracovišť;
  - výpočty zkušeností, efektivity a výkonu výrobny při více pracovnících, s tabulkou příkladů;
  - procenta jako podíl výrobního času, nevyužitá kapacita, cílové zásoby, rezervy skladu;
  - návrh obrazovky Farmářský tým a okna pracoviště;
  - převod uložených her;
  - plán balíčků v29–v32 a testy;
  - **8 rozhodnutí R1–R8, která potřebuju od tebe** (oddíl 11).
- **`EKOFARM_LEGAL_CHECKLIST.md` – interní právní checklist:**
  - evidence grafiky, kódu a služeb s licencemi;
  - seznam neprověřených položek;
  - podobnosti s jinými hrami a jak je snížit;
  - stav kontroly názvu (neověřeno, název je spíš popisný);
  - otázky pro právníka;
  - co vyřešit před vydáním mimo autorské právo.
  - Je to předběžné posouzení, ne právní rada.
- **`STAV.md`:** z úvodu zmizela zmínka o jiné hře, přibyl záznam v28 a odkazy na nové dokumenty.
- **`AUTORSKA_PRAVA.md`:** upozornění, že aktuální evidence je v checklistu.
