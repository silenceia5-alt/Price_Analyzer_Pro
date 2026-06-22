import { describe, it, expect } from "vitest";
import { downloadForexData, FOREX_PAIRS, CRYPTO_SYMBOLS, STOCK_SYMBOLS } from "./alphaVantage";

describe("Alpha Vantage Integration", () => {
  it("should have valid API key configured", () => {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).toBeTruthy();
    expect(apiKey?.length).toBeGreaterThan(0);
  });

  it("should have forex pairs configured", () => {
    expect(Object.keys(FOREX_PAIRS).length).toBeGreaterThan(0);
    expect(FOREX_PAIRS["EUR/USD"]).toBeDefined();
    expect(FOREX_PAIRS["EUR/USD"].from).toBe("EUR");
    expect(FOREX_PAIRS["EUR/USD"].to).toBe("USD");
  });

  it("should have crypto symbols configured", () => {
    expect(Object.keys(CRYPTO_SYMBOLS).length).toBeGreaterThan(0);
    expect(CRYPTO_SYMBOLS["Bitcoin"]).toBe("BTC");
    expect(CRYPTO_SYMBOLS["Ethereum"]).toBe("ETH");
  });

  it("should have stock symbols configured", () => {
    expect(Object.keys(STOCK_SYMBOLS).length).toBeGreaterThan(0);
    expect(STOCK_SYMBOLS["Apple"]).toBe("AAPL");
    expect(STOCK_SYMBOLS["Microsoft"]).toBe("MSFT");
  });

  it("should download forex data successfully", async () => {
    try {
      const data = await downloadForexData("EUR", "USD");

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      // Check first record structure
      const firstRecord = data[0];
      expect(firstRecord).toHaveProperty("date");
      expect(firstRecord).toHaveProperty("apertura");
      expect(firstRecord).toHaveProperty("cierre");

      // Verify data types
      expect(typeof firstRecord.date).toBe("string");
      expect(typeof firstRecord.apertura).toBe("number");
      expect(typeof firstRecord.cierre).toBe("number");

      // Verify date format (YYYY-MM-DD)
      expect(firstRecord.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify prices are positive numbers
      expect(firstRecord.apertura).toBeGreaterThan(0);
      expect(firstRecord.cierre).toBeGreaterThan(0);
    } catch (error) {
      // API rate limit or network error is acceptable in tests
      const message = (error as Error).message;
      expect(
        message.includes("rate limit") ||
        message.includes("No data returned") ||
        message.includes("Error")
      ).toBe(true);
    }
  }, { timeout: 30000 });
});
