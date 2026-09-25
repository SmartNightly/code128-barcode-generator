import tempfile
import unittest
from datetime import date
from pathlib import Path

from barcode_generator.date_cli import (
    calculate_production_date,
    date_to_production_day,
    encode_production_day,
    parse_date,
)
from barcode_generator.generator import (
    build_payload,
    calculate_luhn_check_digit,
    code128_values,
    render_code128_svg,
)


class LuhnTests(unittest.TestCase):
    def test_wikipedia_example(self) -> None:
        self.assertEqual(calculate_luhn_check_digit("7992739871"), "3")

    def test_known_payload_is_calculated(self) -> None:
        self.assertEqual(build_payload("26127"), "22972261270181555555555668822557")

    def test_payload_changes_when_production_day_changes(self) -> None:
        self.assertEqual(build_payload("26067"), "22972260670181555555555668822559")

    def test_rejects_invalid_field_length(self) -> None:
        with self.assertRaisesRegex(ValueError, "exactly 5"):
            build_payload("127")


class DateTests(unittest.TestCase):
    def test_age_days_are_subtracted_before_encoding(self) -> None:
        age_date = date(2026, 5, 7)
        self.assertEqual(calculate_production_date(age_date), date(2025, 11, 7))
        self.assertEqual(date_to_production_day(age_date), "25311")

    def test_leap_year_is_respected_when_encoding(self) -> None:
        self.assertEqual(encode_production_day(date(2024, 12, 31)), "24366")

    def test_subtraction_can_cross_a_year_boundary(self) -> None:
        self.assertEqual(calculate_production_date(date(2025, 1, 1)), date(2024, 7, 4))

    def test_negative_age_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "must not be negative"):
            calculate_production_date(date(2026, 5, 7), -1)

    def test_invalid_calendar_date_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "YYYY-MM-DD"):
            parse_date("2026-02-30")


class BarcodeTests(unittest.TestCase):
    def test_code128_values_include_start_checksum_and_stop(self) -> None:
        values = code128_values(build_payload("26127"))
        self.assertEqual(values[0], 105)
        self.assertEqual(values[-2:], [4, 106])

    def test_svg_contains_payload_and_bars(self) -> None:
        payload = build_payload("26127")
        with tempfile.TemporaryDirectory() as directory:
            output = render_code128_svg(payload, Path(directory) / "barcode.svg")
            svg = output.read_text(encoding="utf-8")
        self.assertIn(payload, svg)
        self.assertIn("<rect", svg)
        self.assertIn("aria-label=", svg)


if __name__ == "__main__":
    unittest.main()
