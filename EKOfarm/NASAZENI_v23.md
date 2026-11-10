# EKOfarm v23 – nasazení (vesničané)

Databáze ani nastavení se nemění: vesničané se ukládají do farmy jako všechno ostatní. `wrangler.toml` v zipu není. Obrázky se nemění.

Zip obsahuje jen změněné soubory.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v23.zip && cd EKOfarm
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
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip EKOfarm/NASAZENI_v22.md
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v23" && git push && cd EKOfarm
```
Pak hru na telefonu zavři a znovu otevři.

## Co je nového: vesničané
- **Koupě:** Obchod → záložka **Vesničané**, jeden stojí 100 mincí a začíná na úrovni 1. Najednou jich můžeš mít až 30.
- **Přiřazení:** otevři budovu. Dole je blok **Pracovník**, ve Skladu **Obchodník**, kde klepneš na volného vesničana. V jedné budově pracuje jeden. Když tam dáš jiného, původní se uvolní. Tlačítkem **Odvolat** ho pošleš pryč.
- **Co dělá:**
  - **Výrobna** (Semenárna, Mlýn, Pekárna…): vybereš, co má vyrábět. Když jsou ve skladu suroviny, sám je vezme, vyrobí a hotové odnese do skladu. „⏸ nic“ ho zastaví.
  - **Ohrada:** krmí zvířata krmivem ze skladu a sbírá vejce, mléko a další do skladu.
  - **Včelín:** sbírá plástve do skladu.
  - **Sklad (obchodník):** vybereš, co má prodávat, a kolik kusů si má vždycky nechat (tlačítka − a +). Prodává za výkupní cenu ze skladu a ukazuje, kolik vydělal.
- **Vylepšení:** na úroveň 2 za 100, na 3 za 200, na 4 za 300 a na 5 za 400 mincí.
  - Vesničan obchází budovu častěji: úroveň 1 každé 2 minuty, 2 každých 90 s, 3 každou minutu, 4 každých 45 s, 5 každých 30 s.
  - Obchodník prodá za jednu obchůzku 3, 5, 8, 12 nebo 16 kusů.
- **Když hru zavřeš,** pracují dál. Po návratu se jejich práce dopočítá, nejvýš za poslední den.
- Za výrobky, které vesničan vybere, dostaneš XP jako za ruční sběr. Počítají se i do denních úkolů.
- Na mapě stojí vesničan u své budovy, a když zrovna pracuje, pohybuje se.
- Popis je i v nápovědě (Menu → Jak hrát → Základy).

**Tip:** Vesničan ve výrobně bere suroviny ze skladu. Když chceš, aby obchodník prodával třeba pšenici, nastav mu „nechá si“ tolik, kolik potřebují výrobny.
