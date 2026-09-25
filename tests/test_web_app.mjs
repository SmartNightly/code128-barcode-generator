import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCode128Svg,
  calculateBarcodeData,
  calculateLuhnCheckDigit,
  code128Values,
  parseIsoDate,
} from "../docs/app.mjs";

test("calculates the independent Luhn reference", () => {
  assert.equal(calculateLuhnCheckDigit("7992739871"), "3");
});

test("subtracts 181 days and builds the verified payload", () => {
  assert.deepEqual(calculateBarcodeData("2026-05-07"), {
    productionDate: "2025-11-07",
    productionDay: "25311",
    payload: "22972253110181555555555668822555",
  });
});

test("handles leap years and year boundaries in UTC", () => {
  assert.equal(calculateBarcodeData("2025-01-01").productionDate, "2024-07-04");
});

test("rejects invalid calendar dates", () => {
  assert.throws(() => parseIsoDate("2026-02-30"), /gültiges Datum/);
});

test("encodes the Code 128 checksum and a complete SVG", () => {
  const payload = calculateBarcodeData("2026-05-07").payload;
  const values = code128Values(payload);
  assert.deepEqual(values.slice(-2), [66, 106]);
  const svg = buildCode128Svg(payload);
  assert.match(svg, /^<svg/);
  assert.match(svg, new RegExp(payload));
  assert.match(svg, /<rect/);
});
