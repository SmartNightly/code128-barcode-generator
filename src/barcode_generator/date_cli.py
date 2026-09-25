"""Generate a Code 128 barcode from an entered calendar date."""

import argparse
from datetime import date, timedelta
from html import escape
from pathlib import Path
from urllib.parse import quote

from .generator import build_payload, render_code128_svg

AGE_DAYS = 181


def parse_date(value: str) -> date:
    """Parse an ISO calendar date and return a helpful error for invalid input."""
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ValueError("date must be a valid calendar date in YYYY-MM-DD format") from error


def calculate_production_date(age_date: date, age_days: int = AGE_DAYS) -> date:
    """Calculate the production date by subtracting the encoded age in days."""
    if age_days < 0:
        raise ValueError("age_days must not be negative")
    return age_date - timedelta(days=age_days)


def encode_production_day(production_date: date) -> str:
    """Encode a production date in the observed YYDDD format."""
    day_of_year = production_date.timetuple().tm_yday
    return f"{production_date.year % 100:02d}{day_of_year:03d}"


def date_to_production_day(age_date: date, age_days: int = AGE_DAYS) -> str:
    """Subtract the age and encode the resulting production date as YYDDD."""
    return encode_production_day(calculate_production_date(age_date, age_days))


def write_html_preview(svg_path: str | Path, payload: str) -> Path:
    """Create an HTML page containing a clickable link and SVG preview."""
    svg = Path(svg_path).resolve()
    html_path = svg.with_suffix(".html")
    svg_name = svg.name
    encoded_href = quote(svg_name)
    document = f"""<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Code-128-Barcode</title>
</head>
<body>
  <h1>Code-128-Barcode</h1>
  <p><a href="{encoded_href}" target="_blank">SVG-Barcode öffnen</a></p>
  <p><a href="{encoded_href}" download>SVG-Barcode herunterladen</a></p>
  <a href="{encoded_href}" target="_blank">
    <img src="{encoded_href}" alt="Code-128-Barcode {escape(payload)}">
  </a>
  <p><code>{escape(payload)}</code></p>
</body>
</html>
"""
    html_path.write_text(document, encoding="utf-8")
    return html_path


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate the Code 128 barcode by subtracting 181 age days from a calendar date."
    )
    parser.add_argument(
        "date",
        nargs="?",
        help="age/reference date in YYYY-MM-DD format; prompts when omitted",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="barcode.svg",
        help="SVG output path (default: barcode.svg)",
    )
    return parser


def main() -> None:
    args = create_parser().parse_args()
    entered_date = args.date or input("Altersdatum eingeben (JJJJ-MM-TT): ").strip()
    try:
        age_date = parse_date(entered_date)
        production_date = calculate_production_date(age_date)
        production_day = encode_production_day(production_date)
        payload = build_payload(production_day)
        output = render_code128_svg(payload, args.output)
        html_output = write_html_preview(output, payload)
    except ValueError as error:
        raise SystemExit(f"Fehler: {error}") from error

    print(f"Produktionsdatum: {production_date.isoformat()} (-{AGE_DAYS} Tage)")
    print(f"Produktionstag: {production_day}")
    print(f"Payload: {payload}")
    print(f"Code-128-Barcode gespeichert: {output}")
    print(f"Klickbare HTML-Seite: {html_output.as_uri()}")


if __name__ == "__main__":
    main()
