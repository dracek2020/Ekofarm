# EKOfarm v11 – nasazení (jen změněné soubory)

Tahle verze potřebuje tři věci navíc:

1. **Novou tabulku v databázi** pro upozornění (`push_subs`). Stávající tabulky ani farmy hráčů se nemění.
2. **Klíče pro upozornění.** Vygeneruješ je jednou a uložíš jako tajné hodnoty v Cloudflare.
3. **Časovač ve `wrangler.toml`.** Ten v zipu není, takže do něj musíš ručně dopsat 2 řádky.

Hra bez kroků 2 a 3 funguje taky, jen nebudou chodit upozornění.

## Postup v Codespace (po jednom)
Pokud je potřeba, nejdřív token: `export CLOUDFLARE_API_TOKEN=...`
```bash
cd /workspaces/Ekofarm && unzip -o EKOfarm_v11.zip && cd EKOfarm
```
```bash
npm test
```
Musí skončit `pass 60` a `fail 0`.
```bash
npx wrangler d1 execute ekofarm --remote --file=schema.sql
```

### Klíče pro upozornění (jen jednou, při příští verzi už ne)
```bash
node tools/vapid.mjs
```
Vypíše dva klíče. Pak spusť tyhle dva příkazy. Každý se zeptá na hodnotu, do prvního vlož **veřejný** klíč a do druhého **soukromý** klíč.
```bash
npx wrangler secret put VAPID_PUBLIC
```
```bash
npx wrangler secret put VAPID_PRIVATE
```
Soukromý klíč nikomu neposílej a nikam neukládej, je jen v Cloudflare.

### Časovač (jen jednou)
Otevři `wrangler.toml` a na konec dopiš:
```toml
[triggers]
crons = ["*/10 * * * *"]
```
Každých 10 minut se pak zkontroluje, co je na farmách hotové, a hráčům přijde upozornění.

### Nasazení
```bash
npx wrangler deploy
```
```bash
cd /workspaces/Ekofarm && git add . && git commit -m "EKOfarm v11" && git push && cd EKOfarm
```
Pak hru v prohlížeči jednou obnov.

### Zapnutí upozornění v telefonu
- **Android:** Menu → Zapnout upozornění → povolit.
- **iPhone a iPad:** v Safari Sdílet → **Přidat na plochu**, otevřít hru z plochy a teprve tam Menu → Zapnout upozornění. Funguje to od iOS 16.4.

## Co je nového
- **Rybník** (od Statku 2, nejvýš 2 rybníky):
  - **Udici** koupíš v Prodejně strojů. **Návnadu** vyrobíš v Krmivárně: 1 pšenice + 1 kukuřice = 3 návnady.
  - Klepni na rybník → Rybařit. Počkej, až ryba **zabere**, a rychle klepni.
  - Pak **drž prst**, aby zelená čárka zůstala u ryby: držíš = stoupá, pustíš = klesá. Když se žlutý ukazatel naplní, ryba je tvoje. Když spadne na nulu, uteče.
  - Těžší ryby víc uhýbají. **Karbonová udice** (úroveň 10) má širší čárku a častěji na ni zabere vzácná ryba.
  - V rybníku je jen pár ryb, každých 10 minut jedna přibude. Vylepšený rybník jich má víc.
- **8 ryb:** plotice, kapr, lín, okoun, pstruh, candát, štika, sumec. Dají se prodat. Nová **Rybárna** z nich vaří jídla a Uzenářství udí pstruhy.
- **Včelín** (od Statku 3):
  - Včely samy dělají **plástve medu**.
  - Květiny, kvetoucí strom nebo sad do 4 políček je zrychlí.
  - Sady blízko včelína dají při sklizni o 1 plod víc.
  - Nová **Medárna** dělá med a svíčky, Pekárna z medu peče perník a medovník.
- **Upozornění do telefonu:** přijdou, když je úroda zralá, výroba hotová, zvířata nebo sad mají hotovo, včelín je plný, pomocník skončil, nebo když ti někdo koupí zboží na tržišti.
- **Průvodce pro nové hráče:** karta nahoře provede prvními kroky a dá se přeskočit.
- **Menu → Jak hrát a pravidla:**
  - **Základy:** jak se hraje.
  - **Statek:** co která úroveň Statku odemkne.
  - **Úrovně:** co odemyká úroveň hráče.
  - **Městečko a tržiště.**
  - **Rybník a včely.**
  - **Upozornění:** jak je zapnout.

  Tabulky se počítají přímo z pravidel hry, takže budou vždycky aktuální. Odtud jde průvodce spustit znovu.
