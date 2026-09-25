"""Command-line interface for barcode generation."""

import argparse

from .generator import build_payload, render_code128_svg


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generate the structured payload and a Code 128-C SVG barcode.")
    parser.add_argument("production_day", help="five-digit production day, for example 26127")
    parser.add_argument("-o", "--output", default="barcode.svg", help="SVG output path (default: barcode.svg)")
    parser.add_argument("--product-type", default="22972", help="five-digit product/type field")
    parser.add_argument("--age", default="0181", help="four-digit age field")
    parser.add_argument("--unknown", default="55555555566882255", help="17-digit unknown field")
    return parser


def main() -> None:
    args = create_parser().parse_args()
    try:
        payload = build_payload(args.production_day, args.product_type, args.age, args.unknown)
        output = render_code128_svg(payload, args.output)
    except ValueError as error:
        raise SystemExit(f"error: {error}") from error
    print(payload)
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()

