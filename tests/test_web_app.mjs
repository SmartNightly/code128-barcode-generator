import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildCode128Svg,
  calculateBarcodeData,
  calculateLuhnCheckDigit,
  code128Values,
  parseIsoDate,
  advanceScannedBarcode,
  calculateExpirationDate,
  readAutoCameraPreference,
} from "../docs/app.mjs";

test('expiration date follows encoded age and manual date round-trips', () => {
  const manual = calculateBarcodeData('2026-05-07');
  assert.equal(calculateExpirationDate(manual.productionDate, manual.payload), '2026-05-07');
  const shifted = advanceScannedBarcode(manual.payload);
  assert.equal(calculateExpirationDate(shifted.productionDate, shifted.payload), '2026-06-06');
  assert.equal(calculateExpirationDate('2024-02-28', scanned('24059', '000255555555566882255')), '2024-03-01');
});

test('automatic camera preference defaults on and restores stored off', () => {
  assert.equal(readAutoCameraPreference({ getItem: () => null }), true);
  assert.equal(readAutoCameraPreference({ getItem: () => 'false' }), false);
  assert.equal(readAutoCameraPreference({ getItem: () => 'true' }), true);
  assert.equal(readAutoCameraPreference(undefined), true);
});

function scanned(day, fields = '018155555555566882255') {
  const base = '22972' + day + fields;
  return base + calculateLuhnCheckDigit(base);
}

test('scan advances production by 30 days and preserves other fields', () => {
  const original = scanned('26127');
  const result = advanceScannedBarcode(original);
  assert.equal(result.originalDate, '2026-05-07');
  assert.equal(result.productionDate, '2026-06-06');
  assert.equal(result.productionDay, '26157');
  assert.equal(result.payload.slice(10, 31), original.slice(10, 31));
  assert.equal(result.payload[31], calculateLuhnCheckDigit(result.payload.slice(0, 31)));
});

test('scan handles year rollover and leap day', () => {
  assert.equal(advanceScannedBarcode(scanned('25365')).productionDate, '2026-01-30');
  assert.equal(advanceScannedBarcode(scanned('24031')).productionDate, '2024-03-01');
  assert.equal(advanceScannedBarcode(scanned('26031')).productionDate, '2026-03-02');
});

test('scan rejects invalid dates, bad checksums and unsupported input', () => {
  assert.throws(() => advanceScannedBarcode(scanned('26366')), /ungültigen/);
  assert.throws(() => advanceScannedBarcode(scanned('26000')), /ungültigen/);
  assert.throws(() => advanceScannedBarcode(scanned('99365')), /außerhalb/);
  assert.throws(() => advanceScannedBarcode('123'), /32-stelligen/);
  const valid = scanned('26127');
  assert.throws(() => advanceScannedBarcode(valid.slice(0, 31) + ((Number(valid[31]) + 1) % 10)), /Prüfziffer/);
});

test('ZXing decodes the generated Code 128 bars back to the shifted payload', async () => {
  const { BinaryBitmap, HybridBinarizer, RGBLuminanceSource, MultiFormatReader } = await import('@zxing/library');
  const payload = advanceScannedBarcode(scanned('26127')).payload;
  const svg = buildCode128Svg(payload);
  const width = 462, height = 126;
  const pixels = new Uint8ClampedArray(width * height).fill(255);
  for (const match of svg.matchAll(/<rect x="(\d+)" y="0" width="(\d+)" height="86"/g)) {
    for (let y = 20; y < 106; y++) pixels.fill(0, y * width + Number(match[1]), y * width + Number(match[1]) + Number(match[2]));
  }
  const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels, width, height)));
  assert.equal(new MultiFormatReader().decode(bitmap).getText(), payload);
});

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

test("scales the complete barcode into the mobile result card", async () => {
  const css = await readFile(new URL("../docs/styles.css", import.meta.url), "utf8");
  assert.match(css, /\.barcode\s*\{[^}]*width:\s*100%[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.barcode svg\s*\{[^}]*width:\s*100%[^}]*min-width:\s*0[^}]*max-width:\s*100%/s);
  assert.doesNotMatch(css, /\.barcode svg\s*\{[^}]*min-width:\s*32rem/s);
});
