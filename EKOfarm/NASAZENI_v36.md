# EKOfarm v36 – nasazení (události, stroje, rybníky, pes, deník, soutěž, pomoc kamarádovi, nové rostliny)

Nic se neresetuje, farmy hráčů zůstávají. **Migrace databáze není potřeba** (soutěž i pomoc kamarádovi se ukládají do farmy).

Zip obsahuje jen soubory změněné od v35. `wrangler.toml` v zipu není.

## Postup v Codespace
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`

**1. Rozbalit a otestovat**
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v36.zip && cd EKOfarm && rm -f NASAZENI_v35.md
```
```bash
npm test
```
Musí skončit `pass 131` a `fail 0`.

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
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v36" && git push && cd EKOfarm
```

## Co je nového
- **Rostliny na polích:** každá rostlina roste zvlášť ze své hrudky hlíny. Na malém poli je jich 9 ve třech řadách (dýně, meloun a zelí 4), na velkém poli stejně na každém políčku. Všechny tři fáze (klíček, rostlina, zralá) jsou nově nakreslené.
- **Události (od úrovně 3):** dvakrát denně (dopoledne 7–11 h, odpoledne 15–21 h) se na farmě něco přihodí. Je jich 24 (liška, bouřka, jarmark, potulný obchodník, zloděj, sucho, včelí roj…) a každá má 4 odpovědi.
  - Odpověď hned přidá nebo vezme mince, zboží nebo zkušenosti.
  - Často na **3 hodiny** změní farmu: růst, výrobu, zvířata, práci strojů, výkupní ceny nebo rybaření. Platí pro to, co během té doby začneš.
  - U odpovědí s 🎲 rozhoduje štěstí.
  - Událost se ukáže sama. Pak čeká pod tlačítkem **Událost** vlevo, dokud ji nenahradí další. Do telefonu přijde upozornění.
- **Prodejna strojů** má záložky Traktory, Kombajny, Náčiní a Udice. Lepší stroje mají výhody a pracuje vždy ten nejlepší, který máš:

  | Druh | Kolik | Výhody lepších |
  |---|---|---|
  | Traktory | 10 (Brázda 60 až Obr 450) | rychlost 6 až 34 políček/min, pole, které zasejí, dá až o 20 % víc |
  | Kombajny | 10 (Klas 4 až Zlatý klas 30) | rychlost 6 až 35 políček/min, sklidí až o 20 % víc |
  | Secí stroje | 5 | setí 2× až 3,5× rychleji, úspora osiva až 20 % |
  | Pluhy | 5 | zorané pole 1,5× až 2× úroda, orba až 2× rychleji |
  | Lisy | 5 | 0,5 až 1 balík na políčko, až 2× rychleji |
  | Udice | 10 (Lísková až Zlatý prut) | snazší držení ryby, vzácnější a větší ryby, šance ušetřit návnadu |

  Koupené stroje zůstávají. Karbonová udice je teď 5. z 10.
- **Rybníky ve 4 velikostech:**

  | Rybník | Velikost | Statek | Ryb |
  |---|---|---|---|
  | Rybník | 3×3 | 3 | 5 |
  | Větší rybník | 4×4 | 5 | 8 |
  | Velký rybník | 5×5 | 7 | 15 |
  | Jezero | 6×6 | 10 | 20 |

  Větší voda = vzácnější ryby. Vylepšení rybníku teď zrychluje doplňování ryb, ale jejich počet nezvyšuje. Kdo už měl rybník vylepšený, má v něm zase nejvýš 5 ryb.
- **Farmářský pes** (Obchod → Zvířata, od úrovně 6, 800 mincí): chodí s farmářem. U lišky, zloděje, myší, větru a utečených zvířat zvýší šanci na dobrý konec a ztráty i zhoršení zmírní na polovinu.
- **Rybářský deník** (v okně rybníku): odměna za první úlovek každé ryby, za 10 úlovků jednoho druhu (mistr), za celou sbírku a za mistra všech ryb. Ryby s dřívějším rekordem se počítají jako ulovené, ale bez odměny.
- **Týdenní soutěž** (Úkoly → Soutěž):
  - Každý týden se soutěží v něčem jiném: sklizeň, výroba, dary zvířat, rybaření, zakázky, ovoce nebo výdělek.
  - Počítá se jen to, co hráč získá sám (nákupy a dárky ne).
  - V pondělí dostanou první tři odměnu: 2000, 1200 a 700 mincí plus zkušenosti.
- **Pomoc kamarádovi:**
  - Na návštěvě cizí farmy je tlačítko **Pomoct**. Jednou denně urychlí kamarádovi nejdelší výrobu, velké pole nebo rostoucí pole o 30 % (nejvýš o hodinu).
  - Oba dostanete pár mincí a zkušeností. Jedné farmě můžou denně pomoct nejvýš 3 lidé.
  - Kamarád se o pomoci dozví, až otevře hru.

## Co jsem ověřil a co ne
- **Testy:** 131 z 131, z toho 11 nových pro v36:
  - řady strojů a jejich výhody na velkém poli;
  - rybníky;
  - události (dvakrát denně, stejné na serveru i v prohlížeči, dopad 3 h, pes);
  - deník a soutěž;
  - pomoc kamarádovi i přes API.
- **V prohlížeči** (testovací verze, široké okno i telefon):
  - pole s rostlinami ve všech fázích, velké pole, všechny 4 rybníky, pes;
  - událost a výsledek odpovědi;
  - prodejna (všechny záložky), deník v rybníku, záložka Soutěž, obchod se psem.
- **Neověřeno:**
  - pomoc kamarádovi a žebříček soutěže na nasazeném serveru (jen přes testovací databázi);
  - přepnutí týdne s odměnou na skutečných datech;
  - skutečný telefon.
