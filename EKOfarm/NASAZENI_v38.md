# EKOfarm v38 – nasazení (úrovně 8× pomaleji, dovednosti, zrušení výsevu, vynucená nová verze)

Nic se neresetuje. **Úroveň ani postup nikdo neztratí.** Migrace databáze **není potřeba**: XP i dovednosti se převedou samy při prvním načtení farmy.

Zip obsahuje jen soubory změněné od v37. `wrangler.toml` v zipu není.

## Postup v Codespace
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`

**1. Rozbalit a otestovat**
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v38.zip && cd EKOfarm && rm -f NASAZENI_v37.md
```
```bash
npm test
```
Musí skončit `pass 144` a `fail 0`.

**2. Nasadit**
```bash
npx wrangler deploy
```

### Co se stane po nasazení (vynucená nová verze)
- Server od teď přijímá jen aplikaci v38. Starší verze nesmí nic uložit, takže nikdo nebude hrát se starými pravidly.
- **Kdo má hru otevřenou ve staré verzi**, uvidí hlášku *„Je tu nová verze hry. Zavři ji a otevři znovu.“*
  - Stará verze se neumí obnovit sama, proto stačí hru jednou zavřít a znovu otevřít.
  - Když se ani potom nenačte nová verze, pomůže v prohlížeči obnovit stránku.
- Od v38 dál se hra při další takové aktualizaci **načte znovu sama**: stačí v `public/js/rules.js` zvednout `CLIENT_MIN`.
- Rozdělané akce se neztratí. Odešlou se, jakmile se načte nová verze.

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v38" && git push && cd EKOfarm
```

## Co je nového
- **Úrovně hráče rostou 8× pomaleji než původně.** Úroveň 10 = 2 560 XP (ve v37 to bylo 960), úroveň 20 = 16 800 XP.
  - Dosavadní hráči si úroveň i rozdělaný postup ponechají; XP se přepočítají jednou.
  - Žebříček počítá stejně i ty, kdo se ještě nepřihlásili.
- **Nové dovednosti** (klepni na svou úroveň vlevo nahoře). Rostou samy, počítá se i práce týmu. Nákupy a dárky se nepočítají.

  | Dovednost | Roste za | Odemyká |
  |---|---|---|
  | Farmaření | sklizeň plodin a ovoce, produkty zvířat | traktory, kombajny, secí stroje, pluhy, lisy |
  | Rybaření | úlovky | lepší udice a vzácnější druhy ryb |
  | Vaření | výrobky z výroben | další recepty ve výrobnách |

  - Maximální úroveň každé dovednosti je 50.
  - V každé výrobně jde jeden recept vyrábět hned. Krmivo, návnada, semena a sazenice jsou vždy odemčené.
  - Staří hráči dostanou počáteční dovednosti podle svých statistik (kolik sklidili, ulovili a vyrobili).
- **Přísnější zamykání pro všechny:**
  - Stroje už neodemyká úroveň hráče, ale Farmaření. Kdo si stroj už koupil, má ho dál.
  - **První udici koupíš až s rybníkem.**
  - Ryby i recepty jsou zamčené podle dovedností. Zakázky, Stánek a tým nabízejí jen to, co už umíš.
- **Zrušení výsevu:**
  - Na malém poli klepni dvakrát na rostoucí políčko → **Zrušit výsev**.
  - Na velkém poli klepni na pole → **Zrušit osetí**.
  - Osivo i mince propadnou, ale pole je hned volné k novému setí. U velkého pole propadne i zorání.
  - Nejde to u zralé úrody ani u pole, na kterém zrovna pracuje tým.
- **Nová okna:**
  - okno Dovednosti;
  - hláška, když dovednost stoupne a něco nového odemkne;
  - zámky v Prodejně strojů (např. „Farmaření 9“, „nejdřív rybník“), ve výrobnách („Vaření 4“) a v Rybářském deníku („Rybaření 7“);
  - nápověda Menu → Jak hrát → Úrovně (záložky nápovědy mají kratší názvy, ať se vejdou).

## Co jsem ověřil a co ne
- **Testy:** 144 ze 144, z toho 9 nových (`test/v38.test.js`):
  - dovednosti a jejich přírůstky;
  - převod starých farem;
  - udice až s rybníkem, stroje podle Farmaření;
  - ryby podle Rybaření a recepty podle Vaření;
  - zrušení výsevu (malé i velké pole);
  - server vrátí staré aplikaci chybu `old_client` a postup zůstane.
- **V testovací verzi v prohlížeči (iPhone 13):**
  - okno Dovednosti;
  - zrušení výsevu na malém i velkém poli;
  - hláška nové úrovně dovednosti;
  - zámky udic bez rybníku;
  - nápověda Úrovně.
- **Neověřeno:**
  - nasazený server ani skutečný telefon;
  - automatické znovunačtení u v38 klienta proti serveru s vyšším `CLIENT_MIN`. To se poprvé uplatní až u další vynucené verze.
