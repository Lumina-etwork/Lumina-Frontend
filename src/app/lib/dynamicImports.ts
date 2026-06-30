export function loadChartLibrary() {
  return import("recharts");
}

export function loadD3Scale() {
  return import("d3-scale");
}

export function loadCryptoSDK() {
  return import("@stellar/stellar-sdk");
}

export const CRYPTO_CHUNK = "vendors-crypto";
export const CHARTS_CHUNK = "vendors-charts";
export const UI_CHUNK = "vendors-ui";
