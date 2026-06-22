/**
 * Alpha Vantage API integration for downloading price data
 */

import { ENV } from "./_core/env";

export interface AlphaVantageResponse {
  "Meta Data"?: Record<string, string>;
  "Time Series FX (Daily)"?: Record<string, PriceData>;
  "Time Series (Daily)"?: Record<string, PriceData>;
  "Time Series Crypto (Daily)"?: Record<string, CryptoPriceData>;
  "Error Message"?: string;
  "Note"?: string;
  "Information"?: string;
}

export interface PriceData {
  "1. open": string;
  "2. high": string;
  "3. low": string;
  "4. close": string;
}

export interface CryptoPriceData {
  "1a. open (USD)"?: string;
  "1b. open (USD)"?: string;
  "4a. close (USD)"?: string;
  "4b. close (USD)"?: string;
}

export interface AssetData {
  date: string;
  apertura: number;
  cierre: number;
}

export type AssetType = "forex" | "crypto" | "stock" | "index";

/**
 * Forex pairs configuration
 */
export const FOREX_PAIRS = {
  "EUR/USD": { from: "EUR", to: "USD" },
  "GBP/USD": { from: "GBP", to: "USD" },
  "USD/JPY": { from: "USD", to: "JPY" },
  "USD/CHF": { from: "USD", to: "CHF" },
  "AUD/USD": { from: "AUD", to: "USD" },
  "USD/CAD": { from: "USD", to: "CAD" },
  "NZD/USD": { from: "NZD", to: "USD" },
  "EUR/GBP": { from: "EUR", to: "GBP" },
  "EUR/JPY": { from: "EUR", to: "JPY" },
  "GBP/JPY": { from: "GBP", to: "JPY" },
};

/**
 * Cryptocurrency symbols
 */
export const CRYPTO_SYMBOLS = {
  "Bitcoin": "BTC",
  "Ethereum": "ETH",
  "Litecoin": "LTC",
  "Bitcoin Cash": "BCH",
  "Ripple": "XRP",
  "Cardano": "ADA",
  "Solana": "SOL",
  "Polkadot": "DOT",
  "Dogecoin": "DOGE",
  "Monero": "XMR",
};

/**
 * Stock symbols (popular examples)
 */
export const STOCK_SYMBOLS = {
  "Apple": "AAPL",
  "Microsoft": "MSFT",
  "Google": "GOOGL",
  "Amazon": "AMZN",
  "Tesla": "TSLA",
  "Meta": "META",
  "Nvidia": "NVDA",
  "Intel": "INTC",
  "IBM": "IBM",
  "Oracle": "ORCL",
};

/**
 * Index symbols (popular examples)
 */
export const INDEX_SYMBOLS = {
  "S&P 500": "^GSPC",
  "Dow Jones": "^DJI",
  "Nasdaq": "^IXIC",
  "Russell 2000": "^RUT",
  "VIX": "^VIX",
};

/**
 * Download forex data from Alpha Vantage
 */
export async function downloadForexData(
  fromSymbol: string,
  toSymbol: string
): Promise<AssetData[]> {
  const apiKey = ENV.alphaVantageApiKey;
  if (!apiKey) {
    throw new Error("Alpha Vantage API key not configured");
  }

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.append("function", "FX_DAILY");
  url.searchParams.append("from_symbol", fromSymbol);
  url.searchParams.append("to_symbol", toSymbol);
  url.searchParams.append("outputsize", "full");
  url.searchParams.append("apikey", apiKey);

  const response = await fetch(url.toString());
  const data: AlphaVantageResponse = await response.json();

  if (data["Error Message"]) {
    throw new Error(`Alpha Vantage error: ${data["Error Message"]}`);
  }

  if (data["Note"]) {
    throw new Error(`API rate limit reached: ${data["Note"]}`);
  }

  if (data["Information"]) {
    throw new Error(`API information: ${data["Information"]}`);
  }

  const timeSeries = data["Time Series FX (Daily)"];
  if (!timeSeries) {
    throw new Error("No data returned from Alpha Vantage for this pair");
  }

  return parseTimeSeries(timeSeries);
}

/**
 * Download cryptocurrency data from Alpha Vantage
 */
export async function downloadCryptoData(symbol: string): Promise<AssetData[]> {
  const apiKey = ENV.alphaVantageApiKey;
  if (!apiKey) {
    throw new Error("Alpha Vantage API key not configured");
  }

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.append("function", "CRYPTO_DAILY");
  url.searchParams.append("symbol", symbol);
  url.searchParams.append("market", "USD");
  url.searchParams.append("outputsize", "full");
  url.searchParams.append("apikey", apiKey);

  const response = await fetch(url.toString());
  const data: AlphaVantageResponse = await response.json();

  if (data["Error Message"]) {
    throw new Error(`Alpha Vantage error: ${data["Error Message"]}`);
  }

  if (data["Note"]) {
    throw new Error(`API rate limit reached: ${data["Note"]}`);
  }

  if (data["Information"]) {
    throw new Error(`API information: ${data["Information"]}`);
  }

  const timeSeries = data["Time Series Crypto (Daily)"];
  if (!timeSeries) {
    throw new Error("No data returned from Alpha Vantage for this cryptocurrency");
  }

  return parseCryptoTimeSeries(timeSeries);
}

/**
 * Download stock or index data from Alpha Vantage
 */
export async function downloadStockData(symbol: string): Promise<AssetData[]> {
  const apiKey = ENV.alphaVantageApiKey;
  if (!apiKey) {
    throw new Error("Alpha Vantage API key not configured");
  }

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.append("function", "TIME_SERIES_DAILY");
  url.searchParams.append("symbol", symbol);
  url.searchParams.append("outputsize", "full");
  url.searchParams.append("apikey", apiKey);

  const response = await fetch(url.toString());
  const data: AlphaVantageResponse = await response.json();

  if (data["Error Message"]) {
    throw new Error(`Alpha Vantage error: ${data["Error Message"]}`);
  }

  if (data["Note"]) {
    throw new Error(`API rate limit reached: ${data["Note"]}`);
  }

  if (data["Information"]) {
    throw new Error(`API information: ${data["Information"]}`);
  }

  const timeSeries = data["Time Series (Daily)"];
  if (!timeSeries) {
    throw new Error("No data returned from Alpha Vantage for this symbol");
  }

  return parseTimeSeries(timeSeries);
}

/**
 * Parse standard time series format
 */
function parseTimeSeries(timeSeries: Record<string, PriceData>): AssetData[] {
  const data: AssetData[] = [];

  for (const [date, priceData] of Object.entries(timeSeries)) {
    const apertura = parseFloat(priceData["1. open"]);
    const cierre = parseFloat(priceData["4. close"]);

    if (!isNaN(apertura) && !isNaN(cierre)) {
      data.push({
        date,
        apertura,
        cierre,
      });
    }
  }

  return data.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Parse cryptocurrency time series format
 */
function parseCryptoTimeSeries(
  timeSeries: Record<string, CryptoPriceData>
): AssetData[] {
  const data: AssetData[] = [];

  for (const [date, priceData] of Object.entries(timeSeries)) {
    // Try both possible field names for open and close
    const openStr = priceData["1a. open (USD)"] || priceData["1b. open (USD)"];
    const closeStr = priceData["4a. close (USD)"] || priceData["4b. close (USD)"];

    if (openStr && closeStr) {
      const apertura = parseFloat(openStr);
      const cierre = parseFloat(closeStr);

      if (!isNaN(apertura) && !isNaN(cierre)) {
        data.push({
          date,
          apertura,
          cierre,
        });
      }
    }
  }

  return data.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get available assets for a given type
 */
export function getAvailableAssets(type: AssetType) {
  switch (type) {
    case "forex":
      return Object.entries(FOREX_PAIRS).map(([label, { from, to }]) => ({
        label,
        from,
        to,
      }));
    case "crypto":
      return Object.entries(CRYPTO_SYMBOLS).map(([label, symbol]) => ({
        label,
        symbol,
      }));
    case "stock":
      return Object.entries(STOCK_SYMBOLS).map(([label, symbol]) => ({
        label,
        symbol,
      }));
    case "index":
      return Object.entries(INDEX_SYMBOLS).map(([label, symbol]) => ({
        label,
        symbol,
      }));
    default:
      return [];
  }
}
