# EKOfarm v3 – první nasazení na server

Nová, samostatná hra: vlastní Worker a vlastní databáze. **Areny se to nijak nedotkne.** Všechno uděláš z iPadu přes GitHub Codespaces, stejně jako u Areny.

## 1. Nahrání projektu
1. Na GitHubu založ nový repozitář `ekofarm` a otevři v něm Codespace.
2. Nahraj do něj `EKOfarm_v3.zip` (přetažením do průzkumníka) a v terminálu:
   ```bash
   unzip EKOfarm_v3.zip && cd EKOfarm
   ```

## 2. Přihlášení ke Cloudflare
```bash
npx wrangler login
```
Pokud to v Codespace nejde, použij API token jako u Areny: `export CLOUDFLARE_API_TOKEN=...`

## 3. Databáze
```bash
npx wrangler d1 create ekofarm
```
Zkopíruj vypsané `database_id` do `wrangler.toml` místo `SEM_VLOZ_ID_DATABAZE`. Pak:
```bash
npx wrangler d1 execute ekofarm --remote --file=schema.sql
```

## 4. Kontrola a nasazení
```bash
npm test
npx wrangler deploy
```
Testy musí skončit `fail 0` (potřebují Node 22+; v Codespace je). Wrangler vypíše adresu hry, např. `https://ekofarm.<tvůj-účet>.workers.dev`. **Tu si zapiš, budeš ji potřebovat v kroku 5.**

Teď už hra běží s přihlášením jménem a heslem. Tlačítko Google se zobrazí až po kroku 5.

## 5. Přihlášení přes Google
Můžeš použít stejný projekt v Google Cloud jako u Areny (souhlasová obrazovka už je hotová).

1. Otevři **console.cloud.google.com** → vyber projekt z Areny → **APIs & Services → Credentials**.
2. **Create credentials → OAuth client ID** → typ **Web application** → název `EKOfarm`.
3. Do **Authorized JavaScript origins** přidej adresu z kroku 4, třeba `https://ekofarm.<tvůj-účet>.workers.dev` (bez lomítka na konci).
   „Authorized redirect URIs“ nech prázdné.
4. Ulož a zkopíruj **Client ID** (končí na `.apps.googleusercontent.com`). Client secret nepotřebuješ.
5. V `wrangler.toml` vlož Client ID místo `SEM_VLOZ_GOOGLE_CLIENT_ID` a znovu nasaď:
   ```bash
   npx wrangler deploy
   ```

> Pokud má souhlasová obrazovka stav **Testing**, můžou se přes Google přihlásit jen testovací uživatelé, které tam přidáš. Pro kamarády ji přepni na **In production** (pro jméno a e-mail Google ověření nevyžaduje).

## 6. Vyzkoušení
1. Otevři adresu v mobilu. Na úvodní obrazovce uvidíš **Pokračovat přes Google** a pod tím přihlášení jménem a heslem.
2. Nová farma začíná se **Statkem uprostřed** a hned nabídne **sklad zdarma**: posuň ho prstem a potvrď ✓.
3. Přidání na plochu: Safari → Sdílet → **Přidat na plochu**, v Chromu menu → **Přidat na plochu**.
4. Hráč s heslem může farmu propojit s Googlem v **Menu** (tlačítko Google).

## Jak se hraje
- **Posun** tažením po trávě, **přiblížení** dvěma prsty.
- **Setí:** klepni na prázdné pole, vyber plodinu a táhni přes další pole. **Sklizeň:** táhni přes zralá pole.
- **🔨 Stavět:** všechny budovy. Zamčené mají zámek a úroveň, kdy se odemknou. Vybraná budova se objeví jako „duch“: posuň a potvrď ✓.
- **🛒 Obchod:** zvířata, stroje (traktor od úrovně 3, kombajn od 5) a farma (nová pole, větší sklad).
- **Traktor:** klepni na něj, vyber plodinu a zaseje ji na všechna prázdná pole. **Kombajn:** klepnutím sklidí všechna zralá pole.
- **Budovy a ohrady:** klepnutím vybereš hotové a nakrmíš zvířata, jinak se otevře panel s výrobou a tlačítkem Přesunout.
- **Sklad:** klepni na budovu skladu nebo na 🏚️. Prodej, nebo rozšíření.

## Další verze
Pošlu jen změněné soubory. Nahraješ je přes stávající a spustíš `npx wrangler deploy`. Databáze zůstává a hráči o farmy nepřijdou. Když se změní `schema.sql`, napíšu k tomu zvlášť příkaz.
