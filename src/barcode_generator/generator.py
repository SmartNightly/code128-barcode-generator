"""Build the known payload format and encode it as Code 128-C SVG."""

from html import escape
from pathlib import Path

PRODUCT_TYPE = "22972"
AGE = "0181"
UNKNOWN = "55555555566882255"

# Module widths for Code 128 values 0..106. Value 106 is the stop symbol.
CODE128_PATTERNS = (
    "212222", "222122", "222221", "121223", "121322", "131222",
    "122213", "122312", "132212", "221213", "221312", "231212",
    "112232", "122132", "122231", "113222", "123122", "123221",
    "223211", "221132", "221231", "213212", "223112", "312131",
    "311222", "321122", "321221", "312212", "322112", "322211",
    "212123", "212321", "232121", "111323", "131123", "131321",
    "112313", "132113", "132311", "211313", "231113", "231311",
    "112133", "112331", "132131", "113123", "113321", "133121",
    "313121", "211331", "231131", "213113", "213311", "213131",
    "311123", "311321", "331121", "312113", "312311", "332111",
    "314111", "221411", "431111", "111224", "111422", "121124",
    "121421", "141122", "141221", "112214", "112412", "122114",
    "122411", "142112", "142211", "241211", "221114", "413111",
    "241112", "134111", "111242", "121142", "121241", "114212",
    "124112", "124211", "411212", "421112", "421211", "212141",
    "214121", "412121", "111143", "111341", "131141", "114113",
    "114311", "411113", "411311", "113141", "114131", "311141",
    "411131", "211412", "211214", "211232", "2331112",
)


def _require_digits(value: str, length: int, field: str) -> None:
    if len(value) != length or not value.isascii() or not value.isdigit():
        raise ValueError(f"{field} must contain exactly {length} ASCII digits")


def calculate_luhn_check_digit(number: str) -> str:
    """Return the Luhn digit that makes ``number + digit`` valid."""
    if not number or not number.isascii() or not number.isdigit():
        raise ValueError("number must contain ASCII digits only")
    total = 0
    for index, character in enumerate(reversed(number)):
        digit = int(character)
        if index % 2 == 0:
            digit *= 2
            if digit > 9:
                digit -= 9
        total += digit
    return str((-total) % 10)


def build_payload(
    production_day: str,
    product_type: str = PRODUCT_TYPE,
    age: str = AGE,
    unknown: str = UNKNOWN,
) -> str:
    """Build the 31 data digits and append their calculated Luhn digit."""
    _require_digits(product_type, 5, "product_type")
    _require_digits(production_day, 5, "production_day")
    _require_digits(age, 4, "age")
    _require_digits(unknown, 17, "unknown")
    data = product_type + production_day + age + unknown
    return data + calculate_luhn_check_digit(data)


def code128_values(payload: str) -> list[int]:
    """Encode an even-length numeric payload using compact Code 128-C."""
    if not payload or len(payload) % 2 or not payload.isascii() or not payload.isdigit():
        raise ValueError("Code 128-C payload must contain an even number of ASCII digits")
    data_values = [int(payload[index : index + 2]) for index in range(0, len(payload), 2)]
    start_code_c = 105
    checksum = (start_code_c + sum(position * value for position, value in enumerate(data_values, 1))) % 103
    return [start_code_c, *data_values, checksum, 106]


def render_code128_svg(payload: str, output: str | Path, module: int = 2, height: int = 80) -> Path:
    """Render a standards-compliant Code 128-C barcode to an SVG file."""
    if module < 1 or height < 1:
        raise ValueError("module and height must be positive integers")
    values = code128_values(payload)
    quiet_zone = 10 * module
    symbol_width = sum(sum(int(width) for width in CODE128_PATTERNS[value]) for value in values) * module
    total_width = symbol_width + 2 * quiet_zone
    bars: list[str] = []
    x = quiet_zone
    for value in values:
        for index, width_character in enumerate(CODE128_PATTERNS[value]):
            width = int(width_character) * module
            if index % 2 == 0:
                bars.append(f'<rect x="{x}" y="0" width="{width}" height="{height}"/>')
            x += width
    label_y = height + 18
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{total_width}" height="{height + 26}" '
        f'viewBox="0 0 {total_width} {height + 26}" role="img" aria-label="Code 128: {escape(payload)}">\n'
        f'  <rect width="100%" height="100%" fill="white"/>\n'
        f'  <g fill="black">{"".join(bars)}</g>\n'
        f'  <text x="{total_width / 2:g}" y="{label_y}" text-anchor="middle" '
        f'font-family="monospace" font-size="12">{escape(payload)}</text>\n'
        f'</svg>\n'
    )
    destination = Path(output)
    destination.write_text(svg, encoding="utf-8")
    return destination

