# Code-128-Barcode-Generator

Dieses kleine, abhängigkeitsfreie Python-Projekt erzeugt aus einem bekannten
31-stelligen Datenformat einen 32-stelligen Payload mit Luhn-Prüfziffer und
rendert ihn als Code-128-C-Barcode im SVG-Format.

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

## Tests

```bash
PYTHONPATH=src python3 -m unittest discover -s tests -v
```

Die Tests prüfen unter anderem ein unabhängiges bekanntes Luhn-Beispiel, beide
bekannten Produktionstage, Eingabevalidierung, die Code-128-Prüfsumme und die
SVG-Ausgabe.

## Lizenz

[MIT](LICENSE)
