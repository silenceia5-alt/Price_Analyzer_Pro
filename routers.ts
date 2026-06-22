import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),                                     logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  priceAnalyzer: router({
    analyze: publicProcedure
      .input(z.object({
        fileContent: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { parseFileContent, analyzePrice } = await import('./priceAnalysis');
        const records = parseFileContent(input.fileContent);
        const analysis = analyzePrice(records);
        return analysis;
      }),

    downloadCSV: publicProcedure
      .input(z.object({
        fileContent: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { parseFileContent, analyzePrice, exportToCSV } = await import('./priceAnalysis');
        const records = parseFileContent(input.fileContent);
        const analysis = analyzePrice(records);
        const csv = exportToCSV(analysis);
        return {
          content: csv,
          fileName: `price-analysis-${new Date().toISOString().split('T')[0]}.csv`,
        };
      }),

    downloadJSON: publicProcedure
      .input(z.object({
        fileContent: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { parseFileContent, analyzePrice, exportToJSON } = await import('./priceAnalysis');
        const records = parseFileContent(input.fileContent);
        const analysis = analyzePrice(records);
        const json = exportToJSON(analysis);
        return {
          content: json,
          fileName: `price-analysis-${new Date().toISOString().split('T')[0]}.json`,
        };
      }),

    downloadTXT: publicProcedure
      .input(z.object({
        fileContent: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { parseFileContent, analyzePrice, exportToTXT } = await import('./priceAnalysis');
        const records = parseFileContent(input.fileContent);
        const analysis = analyzePrice(records);
        const txt = exportToTXT(analysis);
        return {
          content: txt,
          fileName: `price-analysis-${new Date().toISOString().split('T')[0]}.txt`,
        };
      }),

    // Alpha Vantage integration
    getAssetTypes: publicProcedure
      .query(() => {
        return [
          { value: "forex", label: "Divisas (Forex)" },
          { value: "crypto", label: "Criptomonedas" },
          { value: "stock", label: "Acciones" },
          { value: "index", label: "Índices" },
        ];
      }),

    getAvailableAssets: publicProcedure
      .input(z.object({
        type: z.enum(["forex", "crypto", "stock", "index"]),
      }))
      .query(({ input }) => {
        const { getAvailableAssets } = require('./alphaVantage');
        return getAvailableAssets(input.type);
      }),

    downloadForexData: publicProcedure
      .input(z.object({
        fromSymbol: z.string(),
        toSymbol: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { downloadForexData } = await import('./alphaVantage');
        const { parseFileContent, analyzePrice } = await import('./priceAnalysis');

        const data = await downloadForexData(input.fromSymbol, input.toSymbol);
        const fileContent = data.map(d => `${d.date},${d.apertura},${d.cierre}`).join('\n');
        const records = parseFileContent(fileContent);
        const analysis = analyzePrice(records);

        return analysis;
      }),

    downloadCryptoData: publicProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { downloadCryptoData } = await import('./alphaVantage');
        const { parseFileContent, analyzePrice } = await import('./priceAnalysis');

        const data = await downloadCryptoData(input.symbol);
        const fileContent = data.map(d => `${d.date},${d.apertura},${d.cierre}`).join('\n');
        const records = parseFileContent(fileContent);
        const analysis = analyzePrice(records);

        return analysis;
      }),

    downloadStockData: publicProcedure
      .input(z.object({
        symbol: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { downloadStockData } = await import('./alphaVantage');
        const { parseFileContent, analyzePrice } = await import('./priceAnalysis');

        const data = await downloadStockData(input.symbol);
        const fileContent = data.map(d => `${d.date},${d.apertura},${d.cierre}`).join('\n');
        const records = parseFileContent(fileContent);
        const analysis = analyzePrice(records);

        return analysis;
      }),
  }),
});

export type AppRouter = typeof appRouter;
