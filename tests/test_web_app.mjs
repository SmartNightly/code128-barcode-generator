import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("keeps the native date field inside its mobile grid", async () => {
  const css = await readFile(new URL("../docs/styles.css", import.meta.url), "utf8");
  assert.match(css, /\.date-row\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /input\[type="date"\]\s*\{[^}]*width:\s*auto[^}]*justify-self:\s*stretch[^}]*max-width:\s*100%/s);
  assert.match(css, /input\[type="date"\]\s*\{[^}]*-webkit-appearance:\s*none[^}]*overflow:\s*hidden/s);
});

test("loads fresh web assets before using the offline cache", async () => {
  const serviceWorker = await readFile(new URL("../docs/sw.js", import.meta.url), "utf8");
  assert.match(serviceWorker, /networkFirst\(event\.request\)/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: "no-cache" \}\)/);
});
