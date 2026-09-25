"""Generate a Code 128 barcode from an entered calendar date."""

import argparse
from datetime import date

from .generator import build_payload, render_code128_svg


def parse_date(value: str) -> date:
    """Parse an ISO calendar date and return a helpful error for invalid input."""
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ValueError("date must be a valid calendar date in YYYY-MM-DD format") from error


def date_to_production_day(value: date) -> str:
    """Convert a date to the observed YYDDD production-day format."""
    day_of_year = value.timetuple().tm_yday
    return f"{value.year % 100:02d}{day_of_year:03d}"


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate the structured Code 128 barcode from a calendar date."
    )
    parser.add_argument(
        "date",
        nargs="?",
        help="calendar date in YYYY-MM-DD format; prompts when omitted",
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
    entered_date = args.date or input("Datum eingeben (JJJJ-MM-TT): ").strip()
    try:
        calendar_date = parse_date(entered_date)
        production_day = date_to_production_day(calendar_date)
        payload = build_payload(production_day)
        output = render_code128_svg(payload, args.output)
    except ValueError as error:
        raise SystemExit(f"Fehler: {error}") from error

    print(f"Produktionstag: {production_day}")
    print(f"Payload: {payload}")
    print(f"Code-128-Barcode gespeichert: {output}")


if __name__ == "__main__":
    main()

