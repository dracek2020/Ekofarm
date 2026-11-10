# EKOfarm v21 – nasazení (nový vzhled)

Databáze ani nastavení se nemění. `wrangler.toml` v zipu není. Obrázky se nemění.

Zip obsahuje jen změněné soubory (kód a styly).

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v21.zip && cd EKOfarm
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
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip EKOfarm/NASAZENI_v20.md
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v21" && git push && cd EKOfarm
```
Pak hru na telefonu zavři a znovu otevři.

## Co je nového (podle tvých 4 návrhů)
- **Celkový vzhled:** krémová okna s hnědým rámem a lístky, zelená tlačítka, zlaté mince a větší zaoblené písmo. Na iPhonu a iPadu je to zaoblené písmo systému, na Androidu běžné písmo telefonu.
- **Horní lišta:** úroveň s modrým kolečkem, mince a sklad mají zelené „+“. Klepnutí na mince nebo sklad otevře Sklad, kde se prodává a rozšiřuje.
- **Tlačítka na mapě:**
  - Novinky a Počasí jsou vlevo, Městečko a Chat vpravo, jako čtverečky s popiskem.
  - Když je otevřené okno, zmenší se na kulatá tlačítka nad ním.
- **Spodní lišta:** je přes celou šířku. Tlačítko otevřeného okna svítí zeleně, bez okna svítí Stavět.
- **Okna:** v hlavičce je kulatý medailon s ikonou, u budov s obrázkem budovy, a velký název.
- **Stavět:**
  - Záložky Farma, Výrobny, Zvířata a Ozdoby.
  - Každá stavba má obrázek, velikost, cenu a zelené tlačítko Postavit.
  - Zamčené stavby mají štítek se zámkem a úrovní Statku.
  - Na postavenou budovu klepni a otevře se, například kvůli vylepšení.
- **Obchod se zvířaty:** u každého zvířete je obrázek, cena a řádek „Potřebuje Kurník ✓“, takže hned vidíš, jestli máš ohradu.
- **Výrobny:**
  - Nahoře je fronta. Volné místo má „+“ a rozpracovaný výrobek ukazuje ukazatel s časem.
  - Pod ní je „Vyber, co vyrobit“: recepty pod sebou se surovinami, chybějící jsou červeně, a s tlačítkem Vyrobit.
- **Průvodce a lišta stavění** jsou dole nad lištou, krátké zprávy nahoře.

Ostatní okna (Úkoly, Sklad, Statek, Sad, Rybník…) mají stejné barvy, rámy a tlačítka. Jejich rozložení zůstalo stejné.
