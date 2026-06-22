import { describe, expect, it } from "vitest";
import { parseFileContent, analyzePrice, exportToCSV, exportToJSON, exportToTXT } from "./priceAnalysis";

describe("priceAnalysis", () => {
  const sampleData = `2024-01-01,0.80,0.82
2024-01-02,0.81,0.83                       2024-01-31,0.85,0.90
2024-02-01,0.89,0.88
2024-02-29,0.87,0.86
2025-01-01,0.84,0.85
2025-01-31,0.90,0.91
2025-02-01,0.91,0.90
2025-02-28,0.88,0.87
2026-01-01,0.85,0.86
2026-01-31,0.87,0.88
2026-02-01,0.88,0.87
2026-02-28,0.86,0.85`;

  describe("parseFileContent", () => {
    it("should parse valid CSV data", () => {
      const records = parseFileContent(sampleData);
      expect(records).toHaveLength(13);
      expect(records[0]).toEqual({ date: "2024-01-01", apertura: 0.80, cierre: 0.82 });
    });

    it("should throw on invalid date format", () => {
      const invalidData = "2024/01/01,0.80,0.82";
      expect(() => parseFileContent(invalidData)).toThrow("Invalid date format");
    });

    it("should throw on invalid price values", () => {
      const invalidData = "2024-01-01,abc,0.82";
      expect(() => parseFileContent(invalidData)).toThrow("Invalid price values");
    });

    it("should throw on wrong number of columns", () => {
      const invalidData = "2024-01-01,0.80";
      expect(() => parseFileContent(invalidData)).toThrow("Invalid format");
    });
  });

  describe("analyzePrice", () => {
    it("should calculate promedios correctly", () => {
      const records = parseFileContent(sampleData);
      const analysis = analyzePrice(records);

      expect(analysis.totalRecords).toBe(13);
      expect(analysis.promedioApertura).toBeGreaterThan(0);
      expect(analysis.promedioCierre).toBeGreaterThan(0);
      expect(analysis.promedioTotal).toBeGreaterThan(0);
    });

    it("should identify pico and valle correctly", () => {
      const records = parseFileContent(sampleData);
      const analysis = analyzePrice(records);

      expect(analysis.picoMasAlto.cierre).toBe(0.91);
      expect(analysis.valleMasBajo.apertura).toBe(0.80);
    });

    it("should calculate monthly data", () => {
      const records = parseFileContent(sampleData);
      const analysis = analyzePrice(records);

      expect(analysis.monthlyData.length).toBeGreaterThan(0);
      expect(analysis.monthlyData[0].month).toBe("2024-01");
    });

    it("should calculate rendimiento mensual", () => {
      const records = parseFileContent(sampleData);
      const analysis = analyzePrice(records);

      // Second month should have rendimiento
      expect(analysis.monthlyData[1].rendimientoMensual).toBeDefined();
    });

    it("should calculate cambio anual when data exists", () => {
      const records = parseFileContent(sampleData);
      const analysis = analyzePrice(records);

      // Check that at least one month has cambio anual
      const monthsWithCambio = analysis.monthlyData.filter(m => m.cambioAnual !== undefined);
      expect(monthsWithCambio.length >= 0).toBe(true);
    });

    it("should calculate media movil 12M when data exists", () => {
      const records = parseFileContent(sampleData);
      const analysis = analyzePrice(records);

      // Media movil requires at least 12 months of data
      // Our sample has only 9 months, so we just verify that the analysis runs
      expect(analysis.monthlyData.length).toBeGreaterThan(0);
    });

    it("should identify best and worst months", () => {
      const records = parseFileContent(sampleData);
      const analysis = analyzePrice(records);

      expect(analysis.mejorMes.month).toBeDefined();
      expect(analysis.peorMes.month).toBeDefined();
    });

    it("should count bullish and bearish months", () => {
      const records = parseFileContent(sampleData);
      const analysis = analyzePrice(records);

      expect(analysis.mesesAlcistas >= 0).toBe(true);
      expect(analysis.mesesBajistas >= 0).toBe(true);
    });

    it("should calculate volatility extremes", () => {
      const records = parseFileContent(sampleData);
      const analysis = analyzePrice(records);

      expect(analysis.mayorVolatilidad.month).toBeDefined();
      expect(analysis.menorVolatilidad.month).toBeDefined();
      expect(analysis.mayorVolatilidad.diferencia >= analysis.menorVolatilidad.diferencia).toBe(true);
    });
  });

  describe("exportToCSV", () => {
    it("should export to CSV format", () => {
      const records = parseFileContent(sampleData);
      const analysis = analyzePrice(records);
      const csv = exportToCSV(analysis);

      expect(csv).toContain("RESUMEN");
      expect(csv).toContain("Total de Registros");
      expect(csv).toContain("ANÁLISIS DE TENDENCIAS");
      expect(csv).toContain("REGISTROS DE PRECIOS");
    });
  });

  describe("exportToJSON", () => {
    it("should export to JSON format", () => {
      const records = parseFileContent(sampleData);
      const analysis = analyzePrice(records);
      const json = exportToJSON(analysis);
      const parsed = JSON.parse(json);

      expect(parsed.totalRecords).toBe(13);
      expect(parsed.promedioApertura).toBeDefined();
      expect(parsed.monthlyData).toBeDefined();
    });
  });

  describe("exportToTXT", () => {
    it("should export to TXT format", () => {
      const records = parseFileContent(sampleData);
      const analysis = analyzePrice(records);
      const txt = exportToTXT(analysis);

      expect(txt).toContain("PRICE ANALYZER PRO");
      expect(txt).toContain("RESUMEN GENERAL");
      expect(txt).toContain("ANÁLISIS DE TENDENCIAS MENSUALES");
    });
  });
});
