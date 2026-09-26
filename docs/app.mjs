const PRODUCT_TYPE = "22972";
const AGE = "0181";
const AGE_DAYS = 181;
const UNKNOWN = "55555555566882255";

const CODE128_PATTERNS = [
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
];

export function calculateLuhnCheckDigit(number) {
  if (!/^\d+$/.test(number)) throw new Error("Die Nutzdaten müssen aus Ziffern bestehen.");
  let total = 0;
  [...number].reverse().forEach((character, index) => {
    let digit = Number(character);
    if (index % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    total += digit;
  });
  return String((10 - (total % 10)) % 10);
}

export function parseIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Bitte ein gültiges Datum auswählen.");
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new Error("Bitte ein gültiges Datum auswählen.");
  }
  return parsed;
}

export function calculateBarcodeData(ageDateValue) {
  const ageDate = parseIsoDate(ageDateValue);
  const productionDate = new Date(ageDate.getTime());
  productionDate.setUTCDate(productionDate.getUTCDate() - AGE_DAYS);
  const year = productionDate.getUTCFullYear();
  const startOfYear = Date.UTC(year, 0, 1);
  const dayOfYear = Math.floor((productionDate.getTime() - startOfYear) / 86400000) + 1;
  const productionDay = `${String(year).slice(-2)}${String(dayOfYear).padStart(3, "0")}`;
  const base = PRODUCT_TYPE + productionDay + AGE + UNKNOWN;
  return {
    productionDate: productionDate.toISOString().slice(0, 10),
    productionDay,
    payload: base + calculateLuhnCheckDigit(base),
  };
}

export function code128Values(payload) {
  if (!/^\d+$/.test(payload) || payload.length % 2 !== 0) {
    throw new Error("Code 128-C benötigt eine gerade Anzahl von Ziffern.");
  }
  const data = payload.match(/\d{2}/g).map(Number);
  const checksum = (105 + data.reduce((sum, value, index) => sum + (index + 1) * value, 0)) % 103;
  return [105, ...data, checksum, 106];
}

export function advanceScannedBarcode(payload) {
  if (!/^\d{32}$/.test(payload)) throw new Error("Bitte einen 32-stelligen Code-128-Barcode scannen.");
  if (calculateLuhnCheckDigit(payload.slice(0, 31)) !== payload[31]) {
    throw new Error("Die Prüfziffer stimmt nicht. Bitte erneut scannen.");
  }
  // The two-digit year is interpreted within 2000–2099.
  const year = 2000 + Number(payload.slice(5, 7));
  const day = Number(payload.slice(7, 10));
  const original = new Date(Date.UTC(year, 0, day));
  if (day < 1 || original.getUTCFullYear() !== year) {
    throw new Error("Der Barcode enthält einen ungültigen Produktionstag.");
  }
  const shifted = new Date(original);
  shifted.setUTCDate(shifted.getUTCDate() + 30);
  if (shifted.getUTCFullYear() > 2099) throw new Error("Das neue Datum liegt außerhalb von 2000–2099.");
  const dayOfYear = Math.round((shifted - Date.UTC(shifted.getUTCFullYear(), 0, 1)) / 86400000) + 1;
  const productionDay = `${String(shifted.getUTCFullYear() % 100).padStart(2, '0')}${String(dayOfYear).padStart(3, '0')}`;
  const base = payload.slice(0, 5) + productionDay + payload.slice(10, 31);
  return {
    originalDate: original.toISOString().slice(0, 10),
    productionDate: shifted.toISOString().slice(0, 10),
    productionDay,
    payload: base + calculateLuhnCheckDigit(base),
  };
}

export function buildCode128Svg(payload) {
  const moduleWidth = 2;
  const quietZone = 20;
  const height = 86;
  const values = code128Values(payload);
  const symbolWidth = values.reduce(
    (total, value) => total + [...CODE128_PATTERNS[value]].reduce((sum, width) => sum + Number(width), 0) * moduleWidth,
    0,
  );
  const totalWidth = symbolWidth + quietZone * 2;
  let x = quietZone;
  const bars = [];
  for (const value of values) {
    [...CODE128_PATTERNS[value]].forEach((widthCharacter, index) => {
      const width = Number(widthCharacter) * moduleWidth;
      if (index % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${width}" height="${height}"/>`);
      x += width;
    });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" role="img" aria-label="Code 128: ${payload}"><rect width="100%" height="100%" fill="white"/><g fill="black">${bars.join("")}</g></svg>`;
}

function formatGermanDate(isoDate) {
  return new Intl.DateTimeFormat("de-CH", { dateStyle: "medium", timeZone: "UTC" }).format(parseIsoDate(isoDate));
}

function downloadSvg(svg, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function initialize() {
  const dateInput = document.querySelector("#age-date");
  const generateButton = document.querySelector("#generate");
  const result = document.querySelector("#result");
  const error = document.querySelector("#error");
  const shareButton = document.querySelector("#share");
  const downloadButton = document.querySelector("#download");
  let current = null;

  const video = document.querySelector('#camera');
  const scanStatus = document.querySelector('#scan-status');
  const startButton = document.querySelector('#start-camera');
  const stopButton = document.querySelector('#stop-camera');
  let controls;
  let session = 0;

  function stopCamera() {
    session++;
    controls?.stop();
    controls = null;
    video.srcObject?.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    video.hidden = true;
    startButton.disabled = false;
    stopButton.hidden = true;
  }

  function showResult(data) {
    current = data;
    current.svg = buildCode128Svg(current.payload);
    document.querySelector('#production-date').textContent = formatGermanDate(current.productionDate);
    document.querySelector('#production-day').textContent = current.productionDay;
    document.querySelector('#barcode').innerHTML = current.svg;
    document.querySelector('#payload').textContent = current.payload;
    const change = document.querySelector('#date-change');
    change.textContent = data.originalDate ? `${formatGermanDate(data.originalDate)} → ${formatGermanDate(data.productionDate)} (+30 Tage)` : '';
    change.hidden = !data.originalDate;
    result.hidden = false;
    error.hidden = true;
  }

  async function startCamera() {
    stopCamera();
    const activeSession = session;
    startButton.disabled = true;
    stopButton.hidden = false;
    scanStatus.textContent = 'Kamera wird gestartet …';
    try {
      const { createScanner } = await import('./scanner.mjs');
      if (session !== activeSession) return;
      video.hidden = false;
      const opened = await createScanner().decodeFromConstraints({audio: false, video: {
        facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 },
      }}, video, (decoded, failure, scanControls) => {
        if (session !== activeSession) { scanControls.stop(); return; }
        if (!decoded) return;
        try {
          const data = advanceScannedBarcode(decoded.getText());
          scanControls.stop();
          stopCamera();
          showResult(data);
          scanStatus.textContent = 'Erkannt. Neuer Barcode mit Produktionsdatum +30 Tage erstellt.';
          startButton.textContent = 'Nächsten Barcode scannen';
          result.scrollIntoView({block: 'nearest'});
        } catch (problem) { scanStatus.textContent = problem.message; }
      });
      if (session !== activeSession) { opened.stop(); return; }
      controls = opened;
      scanStatus.textContent = 'Den vollständigen Barcode ruhig vor die Rückkamera halten.';
    } catch (problem) {
      if (session !== activeSession) return;
      stopCamera();
      scanStatus.textContent = problem.name === 'NotAllowedError'
        ? 'Bitte Kamerazugriff in Safari erlauben und „Kamera starten“ antippen.'
        : 'Kamera konnte nicht starten. Bitte „Kamera starten“ antippen oder das Datum manuell eingeben.';
    }
  }
  startButton.addEventListener('click', startCamera);
  stopButton.addEventListener('click', () => { stopCamera(); scanStatus.textContent = 'Kamera angehalten.'; });
  window.addEventListener('pagehide', stopCamera);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopCamera(); });
  window.addEventListener('pageshow', () => { if (!current && !controls) startCamera(); });

  const generate = () => {
    try {
      const data = calculateBarcodeData(dateInput.value);
      stopCamera();
      showResult(data);
    } catch (problem) {
      error.textContent = problem.message;
      error.hidden = false;
      result.hidden = true;
    }
  };

  generateButton.addEventListener("click", generate);
  dateInput.addEventListener("change", generate);

  downloadButton.addEventListener("click", () => {
    if (current) downloadSvg(current.svg, `barcode-${current.productionDay}.svg`);
  });

  if (!navigator.share) shareButton.hidden = true;
  shareButton.addEventListener("click", async () => {
    if (!current) return;
    const file = new File([current.svg], `barcode-${current.productionDay}.svg`, { type: "image/svg+xml" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "Code-128-Barcode", text: current.payload, files: [file] });
      } else {
        await navigator.share({ title: "Code-128-Barcode", text: current.payload });
      }
    } catch (problem) {
      if (problem.name !== "AbortError") error.textContent = "Teilen ist auf diesem Gerät nicht verfügbar.";
    }
  });
}

if (typeof document !== "undefined") initialize();
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
}
