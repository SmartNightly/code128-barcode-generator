import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat } from '@zxing/library';

export function createScanner() {
  const reader = new BrowserMultiFormatReader();
  reader.possibleFormats = [BarcodeFormat.CODE_128];
  return reader;
}
