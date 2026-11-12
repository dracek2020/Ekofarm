# EKOfarm v34 – nasazení (nová sezóna, krmení na 3 hodiny, Řídicí centrum, průvodce, server)

> **Pozor: tahle verze resetuje všechny hráče.** Při prvním načtení po nasazení začne každá farma znovu od úrovně 1 se startovními mincemi. Účty (jméno, heslo, Google) a chat zůstávají. Staré nabídky na tržišti zmizí a nevyplacené prodeje ze staré sezóny se nepřipíšou. Vrátit to jde jen ze zálohy databáze – proto ji udělej (krok 1).

Zip obsahuje jen soubory změněné od v33. `wrangler.toml` v zipu není. Migrace databáze **není potřeba** (schéma se nemění, reset dělá kód).

**Nasazuješ víc verzí najednou?** Rozbal po sobě zipy v28 až v34 a nasaď jednou – reset proběhne tak jako tak.

## Postup v Codespace
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`

**1. Záloha databáze** (staré farmy). Jméno databáze najdeš ve `wrangler.toml` u `database_name`:
```bash
cd /workspaces/Ekofarm/EKOfarm && npx wrangler d1 export JMENO_DATABAZE --remote --output=zaloha_pred_v34.sql
```
Soubor `zaloha_pred_v34.sql` si stáhni k sobě (v Codespace pravým tlačítkem → Download). Na GitHub se nedostane – je v `.gitignore` (jsou v něm zašifrovaná hesla a údaje účtů).

**2. Rozbalit a otestovat**
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v34.zip && cd EKOfarm && rm -f NASAZENI_v33.md
```
```bash
npm test
```
Musí skončit `pass 120` a `fail 0`.

**3. Nasadit**
```bash
npx wrangler deploy
```

### Úklid
```bash
cd /workspaces/Ekofarm && rm -f EKOfarm_v*.zip
```

### Uložení na GitHub
```bash
cd /workspaces/Ekofarm && git add -A && git commit -m "EKOfarm v34" && git push && cd EKOfarm
```

## Co je nového
- **Nová sezóna:**
  - Všichni začínají od úrovně 1 a provede je nový průvodce.
  - Dokud se hráč nepřihlásí, žebříček ho počítá jako úroveň 1 a jeho staré nabídky na tržišti se nikomu neukazují.
- **Zvířata:** jedno krmivo vydrží 3 hodiny (vylepšená ohrada o 5 % za úroveň méně). Zvíře za tu dobu průběžně dá:

  | Zvíře | Výrobky za 1 krmivo |
  |---|---|
  | Slepice | 3 vejce |
  | Kráva | 2 mléka |
  | Prase | 2 masa |
  | Ovce | 2 vlny |

  Sbírat jde kdykoli během cyklu; po posledním výrobku má zvíře zase hlad. Chovatel sbírá stejně a jeho síla obsluhy násobí každý výrobek. Ceny výrobků se nemění.
- **Řídicí centrum** (tlačítko Centrum vlevo):
  - **Přehled:**
    - upozornění (kritické / varování / informace) s tlačítkem na budovu;
    - ekonomika za 24 h;
    - sklad (obsazenost, co dochází, rezervy, cílové zásoby);
    - tým (pracuje, čeká, nemůže, bez přiřazení, místa, lůžka, budovy bez lidí);
    - výroba (v provozu, stojí, co se vyrábí, odhad za hodinu);
    - pole a sady, velká pole;
    - chov.
  - **Hospodaření:** sloupce po hodinách a příjmy a výdaje podle zdroje. Zaznamenává se od v34, nejvýš 48 hodin zpátky.
  - **Chov:** detail každé ohrady (krmivo nad rezervou, spotřeba, výdrž i se sdílením a s Krmivárnou, produkce za hodinu, chovatelé a volná místa, stav, upozornění).
- **Zatímco jsi byl pryč:** po nepřítomnosti delší než 30 minut se po dohnání práce týmu ukáže, co tým sklidil, vyrobil, sebral a prodal. Každý úsek času se počítá jen jednou.
- **Průvodce:** 23 kroků, které se ukazují postupně, jak se části hry odemykají. Kdo ho přeskočí, spustí ho znovu v Menu → Jak hrát.
- **Pole:** rostliny i klíčky sedí uprostřed záhonů.
- **Server:**
  - farma a prodeje se čtou jednou dávkou z databáze;
  - tick bez změny se neukládá;
  - práce týmu se dohání po 1 000 událostech (kratší požadavky).

## Co jsem ověřil a co ne
- **Testy:** 120 z 120, z toho 22 nových scénářů ze zadání s očekávaným a skutečným výsledkem. Podrobně v `TESTY_v34.md`, včetně měření výkonu před a po.
- **V prohlížeči** (telefon i široké okno), testovací verze i lokální server:
  - reset staré farmy a nová farma s průvodcem;
  - Řídicí centrum (všechny záložky) a zpráva o nepřítomnosti;
  - ohrada s novým krmením;
  - všechna okna z v33.
- Nezkoušel jsem skutečný telefon ani nasazený server.
