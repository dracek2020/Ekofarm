# EKOfarm v17 – nasazení (kontrola grafiky a plynulejší mapa)

Databáze ani nastavení se nemění. `wrangler.toml` v zipu není.

Zip obsahuje změněný kód a 126 znovu připravených obrázků (dohromady asi 1,3 MB).

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v17.zip && cd EKOfarm
```
```bash
npm test
```
Musí skončit `pass 64` a `fail 0`.
```bash
npx wrangler deploy
```

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip EKOfarm/NASAZENI_v16.md
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v17" && git push && cd EKOfarm
```
Pak hru v prohlížeči jednou obnov. Na telefonu ji zavři a znovu otevři z plochy (obrázky se stáhnou nově).

## Co jsem opravil v grafice
- **Ikony a obrázky se teď řežou z celých archů po celých objektech.** Výřezy v mřížce některé věci ořízly: kolečko bylo useknuté, ohrady byly zmenšené a zvířata zvětšená (neostré). Teď jsou celé a ostřejší.
- **Rybník** sedí uprostřed svých 3×3 políček (dřív byl posunutý nahoru).
- **Keře v sadu** (maliny, rybíz, angrešt, borůvky, réva) jsou menší než stromy.
- **Zvířata** chodí ve výběhu před přístřeškem, ne přes střechu ani přes přední plot.
- **Uschlý strom** má nad sebou bublinu se sekerou (dřív jen malá tečka).
- **Stodola**: zmizely malé „hračkové“ stroje před vraty (na obrázku už traktor je).
- **Městečko**: 9 domků rozmístěných tak, aby žádný nezakrýval Stánek, Prodejnu strojů ani Tržiště. Popisky budov jsou vždy navrchu a před budovami nerostou stromy.
- **Louka** je i za okrajem mapy (dřív tam byla jednobarevná zelená plocha).
- **Lesní stromy** mají na zemi měkký stín.

## Optimalizace
- **Země se kreslí jednou do zásoby** a při posouvání mapy se jen kopíruje, dokresluje se jen nový pruh na okraji. Dřív se každý snímek kreslily stovky až tisíce dlaždic znovu.
- **Prochází se jen políčka, která jsou opravdu na obrazovce** (dřív zhruba dvojnásobek).
- Ikony v oknech neproblikávají při obnovování.
- Měřil jsem to v prohlížeči bez grafické karty se 4× zpomaleným procesorem (velikost iPhonu a iPadu, i při největším oddálení): v17 stihne 2–3× víc snímků za sekundu než v16. Na skutečném telefonu jsem to změřit nemohl, tam bude rozdíl nejvíc znát při posouvání oddálené mapy a na výdrži baterie.

## Co je špatně už v obrázcích od ChatGPT (potřebuje nové obrázky)
Tohle opravit neumím, chyba je přímo v kresbě:
1. **Sója a hrách** – všechny 3 fáze jsou stejný obrázek jako okurka.
2. **Salát a zelí** – stejné obrázky.
3. **Lesní stromy A, B, C** (arch 7, spodní řada) – koruna je dole rovně uříznutá a smrk nemá kmen. Ve hře jsem to zmírnil stínem.
4. **6 ryb a 5 jídel z v15** nemá malovanou ikonu (karas, cejn, amur, úhoř, bolen, jeseter; rybí karbanátky, amur na grilu, uzený úhoř, bolen na bylinkách, kaviár) – zatím mají staré jednoduché ikony.

Méně důležité: meloun a dýně mají první dvě fáze stejné jako okurka, třešeň a višeň mají stejný obrázek „roste“ a „suchý“.
