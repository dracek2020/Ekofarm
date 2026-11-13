# EKOfarm v48 – audit grafiky a původu nového okna budov

Stav k 13. 11. 2026. Interní dokument (nejde do hry).

## Nové soubory grafiky
**Žádné.** v48 nepřidala obrázek, ikonu, písmo, zvuk ani knihovnu (`package.json` beze změny, `public/img` beze změny).

## Z čeho je nové okno složené
| Prvek | Zdroj | Původ / licence |
|---|---|---|
| Karty, záložky, posuvník, štítky stavu, pásy fronty, patní tlačítka | vlastní CSS (`public/css/style.css`, sekce v48) | napsané pro EKOfarm, barvy a tvary z dosavadního vzhledu hry (pergamen, dřevo, mechově zelená) |
| Obrázek budovy v hlavičce | stávající obrázek budovy v `public/img/b` (stejný jako na mapě) | Scenario (GPT Image 2.5 Flare), viz `AUTORSKA_PRAVA.md` (v32, v35, v45) |
| Ikony výrobků, surovin, záložek | stávající `public/img/i/*.webp` (`:house:`, `:helper:`, `:box:`, `:up:`, `:gear:`, `:bell:`, `:clock:`, `:hammer:`, `:barn:` a ikony výrobků) | dtto |
| Nadpisy | stávající písmo Grandstander | OFL 1.1, licence v `public/fonts` (od v33) |
| Rámeček okna, zavírací tlačítko | stávající `public/img/u` | Scenario (v33) |

## Referenční obrázek od autora hry
`06_REFERENCE/EKOfarm_reference_UI_pekarna.png` (941 × 1672) byl použit **jen jako předloha rozvržení a nálady** (pořadí: hlavička s budovou → 4 záložky → karty receptů s procenty, odhadem a cílovou zásobou → shrnutí a upozornění → suroviny → tlačítka). Nic se z něj nevyřezávalo, neobkreslovalo ani nevkládalo; ve hře ani v repozitáři není. Čísla z obrázku (2/3 pracovníci, 40/25/20/15 %, 49 ks/h, kg, ceny, mouka u chleba, diamanty) se **nepřevzala** – okno ukazuje data z pravidel hry. Žádná nová měna.

## Cizí hry
Ovládací principy (záložky, posuvník procent, fronta výroby) jsou obecné herní konvence. Žádný screenshot, kód ani grafika cizí hry nebyla použita. Ve hře, kódu a běžných dokumentech se žádná jiná hra nejmenuje (kontrola textů v48). Konečné právní posouzení před vydáním zůstává na právníkovi (viz `EKOFARM_LEGAL_CHECKLIST.md`).

## Výkon grafiky
Seznamy používají malé ikony (40–60 px) ze stávajícího atlasu; velký obrázek je jen jeden (budova v hlavičce, už načtený pro mapu). Testovací verze (artefakt) zůstává pod 16 MB.
