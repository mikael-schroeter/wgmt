# Zählwerk – D2D-Quoten und Teamaufbau

Mobile Web-App für Zielplanung und Tracking im Haustürvertrieb (Strom/Gas).
Sie bildet die Tabelle **„2026 VP Tracking Vorlage V3“** ab und ergänzt, was dort fehlt: die Quoten.

## Was die App kann

| Bereich | Inhalt | Entspricht in der Tabelle |
|---|---|---|
| **Heute** | Große Zahlen mit +/–-Tasten für Klingeln, Entscheider, Abrechnungen, Kunden, Zähler, Stunden. Provision D2D und abseits D2D, Netto, Notiz | Tageszeile „Eigenumsatz“ |
| **Woche** | Wochenergebnis gegen Ziel mit Ampel (<80 % rot, 80–99 % gelb, ≥100 % grün), Storno-Quote, Netto, Tagesliste | Zeilen „Wochenergebnis“ und „Target“ |
| **Quoten** | Trichter Klingeln → Entscheider → Abrechnungen → Kunden → Zähler, Effizienz (€/h, Klingeln/h, Zähler/Kunde …), Netto pro Woche, Jahresziel | neu |
| **Team** | Teamaufbau (gepitcht → terminiert → präsentiert → VP registriert → Folgetermin 1), Wochenziele, Monate (VPs, Aufträge). „Mein Team“: Wochensummen deiner VPs | Blatt „Teamumsatz“ |
| **Ziele** | Jahresziel, Meilensteine, Standard-Wochenziele, Standard-Storno, Export für Google Tabellen, Sicherung | Kopfbereich „Goal“, „Meilensteine“ |

Rechenregeln wie in der Tabelle: Brutto gesamt = D2D + abseits D2D, Netto = Brutto × (1 − Storno-Quote der Woche),
KW nach ISO (KW 1/2026 beginnt am 29.12.2025). Hervorhebung: Tage über 500 € Provision, Wochen über 2.500 € netto,
Storno ab 35 % gelb und ab 40 % rot.

## Daten

- **Lokal zuerst:** Alles wird sofort auf dem Gerät gespeichert (localStorage), funktioniert offline.
- **Als Claude-Artifact:** Zusätzlich private Sicherung im Claude-Konto (`data/users/<id>/state`) und Team-Ansicht:
  Jeder VP schreibt seine Wochensummen nach `team/<id>`, nur der Besitzer der App kann sie lesen.
  Einzelne Tage und Notizen werden nicht geteilt.
- **Später: eigenes Backend.** `supabase/migrations/0001_init.sql` enthält Schema und Zugriffsregeln (RLS):
  Teams mit Einladungscode, Rollen Leiter/Mitglied, jeder schreibt nur seine Daten, Leiter lesen die ihres Teams.

## Entwicklung

```bash
cd app
npm install
npm run dev          # Entwicklungsserver (im WLAN auch vom Handy erreichbar)
npm test             # Rechenlogik-Tests
npm run build        # PWA-Build nach app/dist (für Vercel, Netlify, GitHub Pages)
npm run build:single # eine einzige HTML-Datei nach app/dist-single (Artifact / offline)
```

Stack: React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, Lucide-Icons, Schrift Barlow / Barlow Condensed.
