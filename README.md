# Code-128-Barcode-Generator

Dieses kleine, abhängigkeitsfreie Python-Projekt erzeugt aus einem bekannten
31-stelligen Datenformat einen 32-stelligen Payload mit Luhn-Prüfziffer und
rendert ihn als Code-128-C-Barcode im SVG-Format.

Eine installierbare Web-App für iPhone und andere Geräte befindet sich im
Ordner `docs`. Sie führt dieselbe Berechnung vollständig lokal im Browser aus,
erzeugt den Barcode und bietet Teilen sowie SVG-Download an.

## Web-App auf dem iPhone

Beim Öffnen startet die Rückkamera (beim ersten Mal den Kamerazugriff erlauben).
Falls Safari den automatischen Start blockiert, „Kamera starten“ antippen.
Ein gültiger 32-stelliger Code-128-Scan wird automatisch übernommen: Produktionstag
an Stellen 6–10 als `JJTTT` auslesen, 30 Kalendertage addieren und die Luhn-Ziffer
neu berechnen. Alle anderen Datenfelder bleiben unverändert. Jahreszahlen werden
als 2000–2099 interpretiert; ungültige Daten und Prüfziffern werden zurückgewiesen.
Nach dem Treffer wird die Kamera beendet. „Nächsten Barcode scannen“ startet sie
erneut. Die manuelle Ablaufdatum-Eingabe bleibt als aufklappbare Alternative erhalten.

Der Scanner nutzt lokal mitgeliefertes ZXing; Kamerabilder verlassen das Gerät nicht.
Scanner-Bundle reproduzieren: `npm ci && npm run build:scanner`.
JavaScript-Tests: `npm test`. Die Lizenzhinweise liegen unter `docs/vendor-licenses`.

Die veröffentlichte App ist unter folgender Adresse erreichbar:

<https://smartnightly.github.io/code128-barcode-generator/>

In Safari kann sie über **Teilen → Zum Home-Bildschirm → Als Web-App öffnen**
installiert werden. Nach dem ersten vollständigen Laden funktioniert sie auch
offline. Berechnung und Barcode-Erzeugung finden ausschließlich auf dem Gerät
statt; das eingegebene Datum wird nicht an einen Server gesendet.

> **Forschungshinweis:** Die Bedeutung von Produkt/Typ und des letzten
> 17-stelligen Feldes ist nicht bestätigt. Das Tool bildet ausschließlich die
> beobachtete Struktur ab und trifft keine Aussage über deren fachliche
> Richtigkeit oder Eignung für produktive Kennzeichnungssysteme.

## Format

| Stellen | Länge | Beispiel | Vermutete Bedeutung |
| --- | ---: | --- | --- |
| 1–5 | 5 | `22972` | Produkt/Typ (unbestätigt) |
| 6–10 | 5 | `26127` | Produktionstag |
| 11–14 | 4 | `0181` | Alter |
| 15–31 | 17 | `55555555566882255` | unbekannt |
| 32 | 1 | `7` | Luhn-Prüfziffer |

Für den Produktionstag `26127` lautet das Ergebnis:

```text
22972 26127 0181 55555555566882255 7
22972261270181555555555668822557
```

## Luhn-Berechnung

Die Prüfziffer wird bei jedem Aufruf berechnet und ist keine Konstante:

1. Die 31 Datenziffern werden von rechts nach links durchlaufen.
2. Beginnend mit der rechten Ziffer wird jede zweite Ziffer verdoppelt.
3. Von zweistelligen Ergebnissen wird `9` abgezogen.
4. Alle Werte werden summiert. Für das Beispiel ergibt sich `113`.
5. Die Prüfziffer ist `(10 - (Summe mod 10)) mod 10`, hier also `7`.

Damit ist die Summe einschließlich Prüfziffer durch 10 teilbar. Diese
Luhn-Prüfziffer ist Teil des Payloads. Zusätzlich enthält jeder Code-128-Barcode
eine eigene, vom Code-128-Standard vorgeschriebene Symbol-Prüfsumme; beide sind
nicht miteinander zu verwechseln.

## Verwendung

Voraussetzung ist Python 3.9 oder neuer. Ohne Installation kann das Tool direkt
aus dem Projekt ausgeführt werden:

```bash
PYTHONPATH=src python3 -m barcode_generator.cli 26127 --output barcode.svg
```

Ausgabe:

```text
22972261270181555555555668822557
Wrote barcode.svg
```

Alternativ kann das Paket lokal installiert werden:

```bash
python3 -m pip install .
generate-barcode 26127 --output barcode.svg
```

Die übrigen beobachteten Felder lassen sich für Forschungszwecke explizit
überschreiben:

```bash
generate-barcode 26127 \
  --product-type 22972 \
  --age 0181 \
  --unknown 55555555566882255 \
  --output barcode.svg
```

Das SVG nutzt Code 128-C, da der Payload ausschließlich aus einer geraden
Anzahl von Ziffern besteht. Der Encoder, die Luhn-Berechnung und die
SVG-Erzeugung verwenden nur die Python-Standardbibliothek.

## Barcode aus einem Altersdatum erzeugen

Das interaktive Skript fragt nach dem Alters-/Bezugsdatum. Davon zieht es die im
Feld `0181` codierten 181 Tage ab und speichert den Barcode als `barcode.svg`:

```bash
PYTHONPATH=src python3 generate_from_date.py
```

Beispiel:

```text
Altersdatum eingeben (JJJJ-MM-TT): 2026-05-07
Produktionsdatum: 2025-11-07 (-181 Tage)
Produktionstag: 25311
Payload: 22972253110181555555555668822555
Code-128-Barcode gespeichert: barcode.svg
Klickbare HTML-Seite: file:///…/barcode.html
```

Im Beispiel ergibt `2026-05-07` minus 181 Tage das Produktionsdatum
`2025-11-07`. Dieses wird als `JJTTT` codiert: die letzten beiden Stellen des
Jahres plus der dreistellige Tag des Jahres. Der 7. November ist der 311. Tag
des Jahres, daher lautet das Feld `25311`. Schaltjahre und Jahreswechsel werden
automatisch berücksichtigt.

Zusätzlich zum SVG erzeugt das Skript eine gleichnamige HTML-Datei. Sie enthält
eine Barcode-Vorschau sowie klickbare Links zum Öffnen und Herunterladen der
SVG-Datei. Die ausgegebene absolute `file://`-Adresse ist in unterstützten
Terminals direkt anklickbar; andernfalls kann `barcode.html` im Browser geöffnet
werden. Unter macOS öffnet das Skript anschließend automatisch den Finder im
Ausgabeordner.

Soll der Finder beispielsweise bei automatisierter Ausführung geschlossen
bleiben, kann das Öffnen deaktiviert werden:

```bash
PYTHONPATH=src python3 generate_from_date.py 2026-05-07 --no-open
```

Das Datum kann auch direkt übergeben und ein anderer Dateiname gewählt werden:

```bash
PYTHONPATH=src python3 generate_from_date.py 2026-05-07 -o barcode-2026-05-07.svg
```

Nach einer lokalen Installation steht derselbe Ablauf als Befehl zur Verfügung:

```bash
generate-barcode-from-date
```

## Tests

```bash
PYTHONPATH=src python3 -m unittest discover -s tests -v
node --test tests/test_web_app.mjs
```

Die Tests prüfen unter anderem ein unabhängiges bekanntes Luhn-Beispiel, beide
bekannten Produktionstage, den Abzug der 181 Tage, Jahreswechsel und Schaltjahr,
Eingabevalidierung, die Code-128-Prüfsumme und die SVG-Ausgabe.

## Lizenz

[MIT](LICENSE)
