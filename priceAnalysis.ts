/**
 * Price analysis logic - all calculations based strictly on uploaded data
 */

export interface PriceRecord {
  date: string; // YYYY-MM-DD
  apertura: number;
  cierre: number;
}

export interface MonthlyData {
  month: string; // YYYY-MM
  cierre: number;
  apertura: number;
  volatilidad: number; // diferencia entre cierre y apertura del mes
  rendimientoMensual?: number; // % change from previous month
  cambioAnual?: number; // % change from same month previous year
  mediaMovil12M?: number; // 12-month moving average
}

export interface AnalysisResult {
  records: PriceRecord[];
  totalRecords: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  monthsAnalyzed: number;

  // Promedios
  promedioApertura: number;
  promedioCierre: number;
  promedioTotal: number;

  // Extremos
  picoMasAlto: { date: string; cierre: number };
  valleMasBajo: { date: string; apertura: number };

  // Análisis mensual
  monthlyData: MonthlyData[];

  // Estadísticas
  mejorMes: { month: string; rendimiento: number };
  peorMes: { month: string; rendimiento: number };
  mesesAlcistas: number;
  mesesBajistas: number;
  cambioPromedioAnual: number;

  // Volatilidad
  mayorVolatilidad: { month: string; diferencia: number };
  menorVolatilidad: { month: string; diferencia: number };
}

/**
 * Parse CSV/TXT file content into price records
 * Expected format: YYYY-MM-DD,apertura,cierre
 */
export function parseFileContent(content: string): PriceRecord[] {
  const lines = content.trim().split('\n').filter(line => line.trim());
  const records: PriceRecord[] = [];

  for (const line of lines) {
    const parts = line.trim().split(',');
    if (parts.length !== 3) {
      throw new Error(`Invalid format: "${line}". Expected: YYYY-MM-DD,apertura,cierre`);
    }

    const [date, aperturaStr, cierreStr] = parts;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error(`Invalid date format: "${date}". Expected: YYYY-MM-DD`);
    }

    const apertura = parseFloat(aperturaStr);
    const cierre = parseFloat(cierreStr);

    if (isNaN(apertura) || isNaN(cierre)) {
      throw new Error(`Invalid price values in line: "${line}". Prices must be numbers.`);
    }

    records.push({ date, apertura, cierre });
  }

  if (records.length === 0) {
    throw new Error("No valid price records found in file");
  }

  return records;
}

/**
 * Calculate all analysis metrics from price records
 */
export function analyzePrice(records: PriceRecord[]): AnalysisResult {
  if (records.length === 0) {
    throw new Error("No records to analyze");
  }

  // Sort by date
  const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));

  // Calculate promedios
  const promedioApertura = sortedRecords.reduce((sum, r) => sum + r.apertura, 0) / sortedRecords.length;
  const promedioCierre = sortedRecords.reduce((sum, r) => sum + r.cierre, 0) / sortedRecords.length;
  const promedioTotal = (promedioApertura + promedioCierre) / 2;

  // Find extremos
  let picoMasAlto = { date: sortedRecords[0].date, cierre: sortedRecords[0].cierre };
  let valleMasBajo = { date: sortedRecords[0].date, apertura: sortedRecords[0].apertura };

  for (const record of sortedRecords) {
    if (record.cierre > picoMasAlto.cierre) {
      picoMasAlto = { date: record.date, cierre: record.cierre };
    }
    if (record.apertura < valleMasBajo.apertura) {
      valleMasBajo = { date: record.date, apertura: record.apertura };
    }
  }

  // Group by month
  const monthlyMap = new Map<string, PriceRecord[]>();
  for (const record of sortedRecords) {
    const month = record.date.substring(0, 7); // YYYY-MM
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, []);
    }
    monthlyMap.get(month)!.push(record);
  }

  const months = Array.from(monthlyMap.keys()).sort();

  // Calculate monthly data
  const monthlyData: MonthlyData[] = [];
  const rendimientos: number[] = [];
  const cambiosAnuales: number[] = [];

  for (let i = 0; i < months.length; i++) {
    const month = months[i];
    const monthRecords = monthlyMap.get(month)!;

    // Get closing price for the month (last record) and opening (first record)
    const cierre = monthRecords[monthRecords.length - 1].cierre;
    const apertura = monthRecords[0].apertura;

    // Volatility = difference between closing and opening of the month
    const volatilidad = cierre - apertura;

    const data: MonthlyData = {
      month,
      cierre,
      apertura,
      volatilidad,
    };

    // Calculate rendimiento mensual (from previous month's closing)
    if (i > 0) {
      const prevMonthRecords = monthlyMap.get(months[i - 1])!;
      const prevCierre = prevMonthRecords[prevMonthRecords.length - 1].cierre;
      data.rendimientoMensual = ((cierre - prevCierre) / prevCierre) * 100;
      rendimientos.push(data.rendimientoMensual);
    }

    // Calculate cambio anual (from same month previous year)
    const prevYearMonth = `${parseInt(month.substring(0, 4)) - 1}-${month.substring(5)}`;
    const prevYearData = monthlyMap.get(prevYearMonth);
    if (prevYearData) {
      const prevYearCierre = prevYearData[prevYearData.length - 1].cierre;
      data.cambioAnual = ((cierre - prevYearCierre) / prevYearCierre) * 100;
      cambiosAnuales.push(data.cambioAnual);
    }

    monthlyData.push(data);
  }

  // Calculate 12-month moving average
  for (let i = 0; i < monthlyData.length; i++) {
    if (i >= 11) {
      const sum = monthlyData.slice(i - 11, i + 1).reduce((sum, m) => sum + m.cierre, 0);
      monthlyData[i].mediaMovil12M = sum / 12;
    }
  }

  // Find best and worst months (based on rendimiento mensual)
  let mejorMes = { month: monthlyData[0].month, rendimiento: monthlyData[0].rendimientoMensual ?? 0 };
  let peorMes = { month: monthlyData[0].month, rendimiento: monthlyData[0].rendimientoMensual ?? 0 };

  for (let i = 1; i < monthlyData.length; i++) {
    const rend = monthlyData[i].rendimientoMensual ?? 0;
    if (rend > mejorMes.rendimiento) {
      mejorMes = { month: monthlyData[i].month, rendimiento: rend };
    }
    if (rend < peorMes.rendimiento) {
      peorMes = { month: monthlyData[i].month, rendimiento: rend };
    }
  }

  // Count bullish vs bearish months
  let mesesAlcistas = 0;
  let mesesBajistas = 0;
  for (let i = 1; i < monthlyData.length; i++) {
    const rend = monthlyData[i].rendimientoMensual ?? 0;
    if (rend > 0) mesesAlcistas++;
    else if (rend < 0) mesesBajistas++;
  }

  // Calculate average annual change (from cambio anual values)
  const cambioPromedioAnual = cambiosAnuales.length > 0
    ? cambiosAnuales.reduce((sum, c) => sum + c, 0) / cambiosAnuales.length
    : 0;

  // Find volatility extremes
  let mayorVolatilidad = monthlyData[0];
  let menorVolatilidad = monthlyData[0];

  for (const m of monthlyData) {
    if (m.volatilidad > mayorVolatilidad.volatilidad) {
      mayorVolatilidad = m;
    }
    if (m.volatilidad < menorVolatilidad.volatilidad) {
      menorVolatilidad = m;
    }
  }

  return {
    records: sortedRecords,
    totalRecords: sortedRecords.length,
    dateRangeStart: sortedRecords[0].date,
    dateRangeEnd: sortedRecords[sortedRecords.length - 1].date,
    monthsAnalyzed: months.length,
    promedioApertura,
    promedioCierre,
    promedioTotal,
    picoMasAlto,
    valleMasBajo,
    monthlyData,
    mejorMes,
    peorMes,
    mesesAlcistas,
    mesesBajistas,
    cambioPromedioAnual,
    mayorVolatilidad: { month: mayorVolatilidad.month, diferencia: mayorVolatilidad.volatilidad },
    menorVolatilidad: { month: menorVolatilidad.month, diferencia: menorVolatilidad.volatilidad },
  };
}

/**
 * Export analysis to CSV format
 */
export function exportToCSV(analysis: AnalysisResult): string {
  const lines: string[] = [];

  // Summary section
  lines.push("RESUMEN");
  lines.push(`Total de Registros,${analysis.totalRecords}`);
  lines.push(`Rango de Fechas,${analysis.dateRangeStart},hasta,${analysis.dateRangeEnd}`);
  lines.push(`Meses Analizados,${analysis.monthsAnalyzed}`);
  lines.push("");

  lines.push("PROMEDIOS");
  lines.push(`Promedio Apertura,${analysis.promedioApertura.toFixed(8)}`);
  lines.push(`Promedio Cierre,${analysis.promedioCierre.toFixed(8)}`);
  lines.push(`Promedio Total,${analysis.promedioTotal.toFixed(8)}`);
  lines.push("");

  lines.push("EXTREMOS");
  lines.push(`Pico Más Alto,${analysis.picoMasAlto.date},${analysis.picoMasAlto.cierre.toFixed(8)}`);
  lines.push(`Valle Más Bajo,${analysis.valleMasBajo.date},${analysis.valleMasBajo.apertura.toFixed(8)}`);
  lines.push("");

  lines.push("ESTADÍSTICAS");
  lines.push(`Mejor Mes,${analysis.mejorMes.month},${analysis.mejorMes.rendimiento.toFixed(4)}%`);
  lines.push(`Peor Mes,${analysis.peorMes.month},${analysis.peorMes.rendimiento.toFixed(4)}%`);
  lines.push(`Meses Alcistas,${analysis.mesesAlcistas}`);
  lines.push(`Meses Bajistas,${analysis.mesesBajistas}`);
  lines.push(`Cambio Promedio Anual,${analysis.cambioPromedioAnual.toFixed(4)}%`);
  lines.push("");

  lines.push("VOLATILIDAD");
  lines.push(`Mayor Volatilidad,${analysis.mayorVolatilidad.month},${analysis.mayorVolatilidad.diferencia.toFixed(8)}`);
  lines.push(`Menor Volatilidad,${analysis.menorVolatilidad.month},${analysis.menorVolatilidad.diferencia.toFixed(8)}`);
  lines.push("");

  lines.push("ANÁLISIS DE TENDENCIAS");
  lines.push("Mes,Cierre,Rendimiento Mensual,Cambio Anual,Media Móvil 12M");
  for (const m of analysis.monthlyData) {
    const rend = m.rendimientoMensual !== undefined ? m.rendimientoMensual.toFixed(4) + "%" : "—";
    const cambio = m.cambioAnual !== undefined ? m.cambioAnual.toFixed(4) + "%" : "—";
    const media = m.mediaMovil12M !== undefined ? m.mediaMovil12M.toFixed(8) : "—";
    lines.push(`${m.month},${m.cierre.toFixed(8)},${rend},${cambio},${media}`);
  }
  lines.push("");

  lines.push("REGISTROS DE PRECIOS");
  lines.push("Fecha,Apertura,Cierre");
  for (const r of analysis.records) {
    lines.push(`${r.date},${r.apertura.toFixed(8)},${r.cierre.toFixed(8)}`);
  }

  return lines.join("\n");
}

/**
 * Export analysis to JSON format
 */
export function exportToJSON(analysis: AnalysisResult): string {
  return JSON.stringify(analysis, null, 2);
}

/**
 * Export analysis to TXT format
 */
export function exportToTXT(analysis: AnalysisResult): string {
  const lines: string[] = [];

  lines.push("═".repeat(80));
  lines.push("PRICE ANALYZER PRO - ANÁLISIS COMPLETO DE PRECIOS");
  lines.push("═".repeat(80));
  lines.push("");

  lines.push("RESUMEN GENERAL");
  lines.push("-".repeat(80));
  lines.push(`Total de Registros: ${analysis.totalRecords}`);
  lines.push(`Rango de Fechas: ${analysis.dateRangeStart} hasta ${analysis.dateRangeEnd}`);
  lines.push(`Meses Analizados: ${analysis.monthsAnalyzed}`);
  lines.push("");

  lines.push("PROMEDIOS");
  lines.push("-".repeat(80));
  lines.push(`Promedio Apertura: ${analysis.promedioApertura.toFixed(8)}`);
  lines.push(`Promedio Cierre: ${analysis.promedioCierre.toFixed(8)}`);
  lines.push(`Promedio Total: ${analysis.promedioTotal.toFixed(8)}`);
  lines.push("");

  lines.push("EXTREMOS");
  lines.push("-".repeat(80));
  lines.push(`Pico Más Alto: ${analysis.picoMasAlto.date} (Cierre: ${analysis.picoMasAlto.cierre.toFixed(8)})`);
  lines.push(`Valle Más Bajo: ${analysis.valleMasBajo.date} (Apertura: ${analysis.valleMasBajo.apertura.toFixed(8)})`);
  lines.push("");

  lines.push("ESTADÍSTICAS");
  lines.push("-".repeat(80));
  lines.push(`Mejor Mes: ${analysis.mejorMes.month} (Rendimiento: +${analysis.mejorMes.rendimiento.toFixed(4)}%)`);
  lines.push(`Peor Mes: ${analysis.peorMes.month} (Rendimiento: ${analysis.peorMes.rendimiento.toFixed(4)}%)`);
  lines.push(`Meses Alcistas: ${analysis.mesesAlcistas}`);
  lines.push(`Meses Bajistas: ${analysis.mesesBajistas}`);
  lines.push(`Cambio Promedio Anual: ${analysis.cambioPromedioAnual.toFixed(4)}%`);
  lines.push("");

  lines.push("VOLATILIDAD");
  lines.push("-".repeat(80));
  lines.push(`Mayor Volatilidad: ${analysis.mayorVolatilidad.month} (Diferencia: ${analysis.mayorVolatilidad.diferencia.toFixed(8)})`);
  lines.push(`Menor Volatilidad: ${analysis.menorVolatilidad.month} (Diferencia: ${analysis.menorVolatilidad.diferencia.toFixed(8)})`);
  lines.push("");

  lines.push("ANÁLISIS DE TENDENCIAS MENSUALES");
  lines.push("-".repeat(80));
  lines.push(
    "Mes          | Cierre       | Rend. Mensual | Cambio Anual | Media Móvil 12M"
  );
  lines.push("-".repeat(80));
  for (const m of analysis.monthlyData) {
    const rend = m.rendimientoMensual !== undefined ? m.rendimientoMensual.toFixed(4).padStart(8) + "%" : "       —";
    const cambio = m.cambioAnual !== undefined ? m.cambioAnual.toFixed(4).padStart(8) + "%" : "       —";
    const media = m.mediaMovil12M !== undefined ? m.mediaMovil12M.toFixed(8) : "—";
    lines.push(`${m.month} | ${m.cierre.toFixed(8).padStart(12)} | ${rend} | ${cambio} | ${media}`);
  }
  lines.push("");

  return lines.join("\n");
}
