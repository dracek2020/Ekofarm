# EKOfarm v35 – nasazení (nové budovy „pestrá farma“)

Jen nový vzhled budov – pravidla, ceny, časy ani uložené farmy se nemění. **Nic se neresetuje**, migrace databáze není potřeba.

Zip obsahuje jen soubory změněné od v34. `wrangler.toml` v zipu není.

## Postup v Codespace
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`

**1. Rozbalit a otestovat**
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v35.zip && cd EKOfarm && rm -f NASAZENI_v34.md
```
```bash
npm test
```
Musí skončit `pass 120` a `fail 0`.

**2. Nasadit**
```bash
npx wrangler deploy
```

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v35" && git push && cd EKOfarm
```

## Co je nového
- **45 nových budov.** Každá má vlastní střechu, materiál a poznávací znak, takže se dají rozeznat i na telefonu z dálky:

  | Budova | Jak ji poznáš |
  |---|---|
  | Statek 1–10 | bílé hrázděné stavení, červené tašky, kohout na střeše; roste o patro, křídlo, věžičku s hodinami až po panský statek se zlatými ozdobami a fontánou |
  | Sklad 1–10 | modrošedá kůlna s plechovou střechou; vyšší úrovně přidají půdu s kladkou, sila a jeřáb |
  | Semenárna | mátové stěny, zelená šindelová střecha, pařeniště se sazeničkami |
  | Pekárna | oranžové tašky, velká pec na chleba, preclík nad dveřmi |
  | Krmivárna | rezavá plechová střecha, silo s násypkou |
  | Mlýn | větrný mlýn s lopatkami |
  | Školka stromků | skleník se stromky v květináčích |
  | Džusárna | tyrkysová střecha, pruhovaná markýza, lis na ovoce |
  | Mlékárna | bílé stěny, modrá střecha, konve na mléko a sýry |
  | Konzervárna | cihly, břidlice, regály se sklenicemi |
  | Olejna | žlutá střecha, lis, slunečnice |
  | Marmeládárna | růžové stěny, malinová střecha, kotel s marmeládou |
  | Cukrovar | cihlový komín, cukrová řepa, pytle cukru |
  | Uzenářství | tmavé dřevo, kouř, šunky a klobásy |
  | Textilka | levandulové stěny, fialová střecha, kolovrat a látky |
  | Kurník, Kravín, Prasečák, Ovčín | prázdné výběhy (zvířata kreslí hra jako dosud): kurník na kůlech, červená stodola s pastvinou, blátivý výběh s přístřeškem, kamenný ovčín se zídkou |
  | Stodola | dlouhá zelená stodola s modrou plechovou střechou |
  | Rybník, Včelín, Rybárna, Medárna | molo s loďkou, barevné úly, modrá rybářská chata se sítěmi, medová chaloupka |
  | Chatrč, Chata, Dům | plechová bouda, útulná chata, dvoupatrový dům |

- Nové jsou i ikony Statku, Skladu, Stodoly, Rybníka a Včelína v rozhraní (spodní lišta Sklad, Centrum).
- Hra po nasazení stáhne nové obrázky sama (nová verze mezipaměti obrázků v23).

## Co jsem ověřil a co ne
- **Testy:** 120 z 120.
- **V prohlížeči** (testovací verze, široké okno i telefon): farma se všemi 45 budovami, Statek úrovně 1 i 10, ohrady se zvířaty, okno Stavět. Podstavec každé budovy sedí na jejích políčkách, i u Stodoly 3×2.
- Nezkoušel jsem skutečný telefon ani nasazený server.
