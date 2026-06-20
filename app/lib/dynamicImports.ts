export function loadChartLibrary() {
  return import(/* webpackChunkName: "vendors-charts" */ "recharts");
}

export function loadD3Scale() {
  return import(/* webpackChunkName: "vendors-charts" */ "d3-scale");
}

export function loadCryptoSDK() {
  return import(
    /* webpackChunkName: "vendors-crypto" */ "@stellar/stellar-sdk"
  );
}

export const CRYPTO_CHUNK = "vendors-crypto";
export const CHARTS_CHUNK = "vendors-charts";
export const UI_CHUNK = "vendors-ui";
