"""Generate a Code 128 barcode from an entered calendar date."""

import argparse
from datetime import date, timedelta

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
    except ValueError as error:
        raise SystemExit(f"Fehler: {error}") from error

    print(f"Produktionsdatum: {production_date.isoformat()} (-{AGE_DAYS} Tage)")
    print(f"Produktionstag: {production_day}")
    print(f"Payload: {payload}")
    print(f"Code-128-Barcode gespeichert: {output}")


if __name__ == "__main__":
    main()
