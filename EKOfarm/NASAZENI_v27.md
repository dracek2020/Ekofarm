# EKOfarm v27 – nasazení (vesničané pracují průběžně podle tabulek)

Databáze ani nastavení se nemění. `wrangler.toml` v zipu není. Obrázky se nemění.

Zip obsahuje jen změněné soubory.

Uložené hry se převedou samy při prvním otevření: kdo měl vesničanovi vybraný jeden výrobek nebo plodinu, bude ji mít v tabulce na 100 %. Obchodník dostane u každého zboží 50 % a rezervu, kterou měl nastavenou.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v27.zip && cd EKOfarm
```
```bash
npm test
```
Musí skončit `pass 79` a `fail 0`.
```bash
npx wrangler deploy
```

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip EKOfarm/NASAZENI_v26.md
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v27" && git push && cd EKOfarm
```

## Co je nového
- **Vesničané pracují pořád:**
  - Obchůzky po dvou minutách jsou pryč. Každý vesničan dělá úkon za úkonem a další si bere hned, jak je co dělat.
  - Úkon trvá podle druhu práce (sklizeň a setí 20 s, naložení výroby 15 s, krmení 12 s…) a podle úrovně vesničana. Úroveň 5 pracuje 2,5× rychleji.
  - Co potřebuje (semínko, suroviny, krmivo), si vezme na začátku úkonu. Dva vesničané se tak o totéž nepřetahují.
- **Farmář má plán v procentech:**
  - Ve Statku na záložce Farmáři nastavíš, jakou část oblasti čím osázet, třeba 50 % pšenice a 30 % kukuřice. Zbytek nechá ležet.
  - Co dozraje, hned sklidí. Prázdné pole hned osází tím, čeho je proti plánu nejméně a na co má ve Statku semena.
  - V sadu stejně: sází sazenice podle plánu, trhá ovoce a vykopává suché stromy.
  - U každého řádku vidíš, kolik polí to dělá, kolik jich teď je a kolik semen zbývá.
- **Dělník ve výrobně má tabulku výrobků:**
  - U každého výrobku nastavíš podíl výroby v procentech. Dělník je spravedlivě střídá.
  - Strop zásoby: nastavíš třeba 20 kusů a víc jich dělat nebude, dokud neubudou.
  - Vyšší úroveň zrychluje i samotnou výrobu, až o 30 %. Totéž platí pro zvířata v ohradě.
- **Obchodník chodí na trh:**
  - Trh je každou půlhodinu (v celou a v půl).
  - U každého zboží nastavíš, kolik procent zásoby má prodat a kolik kusů si má nechat.
  - Úroveň určuje, kolik unese (30 / 50 / 80 / 120 / 180 kusů), jakou cenu vyjedná (až +25 %) a kolik druhů zboží zvládne (4 až 12).
  - Okno Skladu ukazuje odpočet do trhu, odhad příštího prodeje a co prodal naposledy.
- **Vidíš, co kdo dělá:**
  - V okně budovy a u farmáře je řádek se stavem: co právě dělá a jak daleko je, nebo proč stojí (chybí suroviny, semena, krmivo, plný sklad, prázdná tabulka).
  - Na mapě má pracující vesničan nad hlavou kolečko s průběhem, stojící vykřičník. Farmář chodí k poli, na kterém pracuje.
  - U každého vesničana je tabulka úrovní: co která úroveň přinese.
- **Návrat do hry:**
  - Když jsi byl pryč, vesničané práci doženou během chvilky (dole svítí proužek, kolik zbývá). Dopočítá se nejvýš den.
  - Okno nové úrovně se ukáže jednou, až je dohnáno.
- **Drobnost:** dlouhá čísla v horní liště (třeba sklad 399/400) se zmenší, aby se vešla.

## Co jsem ověřil a co ne
- Testy: 79 z 79. Nové hlídají plány, podíly, strop zásoby, trh, průběžnou práci, střet s hráčem, převod uložené hry a to, že výsledek nezávisí na tom, jak často se hra dopočítává.
- V prohlížeči (telefonní rozměr) proti stejnému API jako na serveru: převod uložené hry z v26, dohnání 10 hodin za necelé 2 s na 5 požadavků, úprava plánu a shoda se serverem.
- Na skutečném telefonu ani na nasazeném serveru jsem to nezkoušel. Jedna dávka dohánění trvala na mém stroji nejvýš 30 ms, na Cloudflare ji neznám.
