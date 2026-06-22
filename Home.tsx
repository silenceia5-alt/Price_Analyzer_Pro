import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";                                      import { Card } from "@/components/ui/card";                                          import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Upload, TrendingUp, TrendingDown, Download, AlertCircle, Loader2, Cloud } from "lucide-react";
import { useLocation } from "wouter";

interface AnalysisResult {
  records: Array<{ date: string; apertura: number; cierre: number }>;
  totalRecords: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  monthsAnalyzed: number;
  promedioApertura: number;
  promedioCierre: number;
  promedioTotal: number;
  picoMasAlto: { date: string; cierre: number };
  valleMasBajo: { date: string; apertura: number };
  monthlyData: Array<{
    month: string;
    cierre: number;
    apertura: number;
    volatilidad: number;
    rendimientoMensual?: number;
    cambioAnual?: number;
    mediaMovil12M?: number;
  }>;
  mejorMes: { month: string; rendimiento: number };
  peorMes: { month: string; rendimiento: number };
  mesesAlcistas: number;
  mesesBajistas: number;
  cambioPromedioAnual: number;
  mayorVolatilidad: { month: string; diferencia: number };
  menorVolatilidad: { month: string; diferencia: number };
}

export default function Home() {
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const analyzeMutation = trpc.priceAnalyzer.analyze.useMutation();
  const downloadCSVMutation = trpc.priceAnalyzer.downloadCSV.useMutation();
  const downloadJSONMutation = trpc.priceAnalyzer.downloadJSON.useMutation();
  const downloadTXTMutation = trpc.priceAnalyzer.downloadTXT.useMutation();

  const handleFileSelect = async (file: File) => {
    if (!file.name.match(/\.(txt|csv)$/i)) {
      toast.error("Por favor selecciona un archivo .txt o .csv");
      return;
    }

    setFileName(file.name);
    setIsLoading(true);

    try {
      const content = await file.text();
      const result = await analyzeMutation.mutateAsync({
        fileContent: content,
        fileName: file.name,
      });
      setAnalysis(result);
      toast.success("Archivo analizado correctamente");
    } catch (error) {
      toast.error((error as Error).message || "Error al procesar el archivo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const downloadFile = async (format: "csv" | "json" | "txt") => {
    if (!analysis) return;

    setIsDownloading(true);
    try {
      const mutation = format === "csv" ? downloadCSVMutation : format === "json" ? downloadJSONMutation : downloadTXTMutation;
      const result = await mutation.mutateAsync({ fileContent: analysis.records.map(r => `${r.date},${r.apertura},${r.cierre}`).join('\n') });

      const blob = new Blob([result.content], {
        type: format === "csv" ? "text/csv" : format === "json" ? "application/json" : "text/plain",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Descargado: ${result.fileName}`);
    } catch (error) {
      toast.error("Error al descargar el archivo");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Price Analyzer Pro</h1>
              <p className="text-lg text-slate-600">Análisis completo de precios: volatilidad, tendencias mensuales y anuales</p>
            </div>
            <Button onClick={() => setLocation("/downloader")} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Cloud className="w-4 h-4" />
              Descargar de Alpha Vantage
            </Button>
          </div>
        </div>

        {!analysis ? (
          // Upload Section
          <Card className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-slate-400 transition-colors cursor-pointer" onDragOver={handleDragOver} onDrop={handleDrop}>
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <Upload className="w-8 h-8 text-slate-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">Arrastra tu archivo aquí</h2>
                <p className="text-slate-600 mb-4">o</p>
              </div>
              <Button onClick={() => fileInputRef.current?.click()} className="px-8 py-6 text-base bg-slate-900 hover:bg-slate-800">
                Seleccionar archivo
              </Button>
              <p className="text-sm text-slate-500 mt-4">Formatos soportados: .txt, .csv</p>
              <p className="text-xs text-slate-400">Formato esperado: YYYY-MM-DD,apertura,cierre</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".txt,.csv" onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])} className="hidden" />
          </Card>
        ) : (
          // Analysis Results
          <div className="space-y-6">
            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">✓</div>
              <div>
                <p className="font-semibold text-green-900">Archivo analizado correctamente</p>
                <p className="text-sm text-green-700">{fileName}</p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 bg-white">
                <p className="text-sm text-slate-600 mb-1">Total de Registros</p>
                <p className="text-3xl font-bold text-slate-900">{analysis.totalRecords}</p>
              </Card>
              <Card className="p-6 bg-white">
                <p className="text-sm text-slate-600 mb-1">Rango de Fechas</p>
                <p className="text-sm font-semibold text-slate-900">{analysis.dateRangeStart}</p>
                <p className="text-xs text-slate-500">hasta</p>
                <p className="text-sm font-semibold text-slate-900">{analysis.dateRangeEnd}</p>
              </Card>
              <Card className="p-6 bg-white">
                <p className="text-sm text-slate-600 mb-1">Meses Analizados</p>
                <p className="text-3xl font-bold text-slate-900">{analysis.monthsAnalyzed}</p>
              </Card>
            </div>

            {/* Promedios */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 bg-blue-50 border-blue-100">
                <p className="text-sm text-blue-600 mb-2">Promedio Apertura</p>
                <p className="text-2xl font-bold text-blue-900">{analysis.promedioApertura.toFixed(8)}</p>
              </Card>
              <Card className="p-6 bg-green-50 border-green-100">
                <p className="text-sm text-green-600 mb-2">Promedio Cierre</p>
                <p className="text-2xl font-bold text-green-900">{analysis.promedioCierre.toFixed(8)}</p>
              </Card>
              <Card className="p-6 bg-purple-50 border-purple-100">
                <p className="text-sm text-purple-600 mb-2">Promedio Total</p>
                <p className="text-2xl font-bold text-purple-900">{analysis.promedioTotal.toFixed(8)}</p>
              </Card>
            </div>

            {/* Extremos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 bg-red-50 border-red-100">
                <p className="text-sm text-red-600 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Mayor Volatilidad
                </p>
                <p className="text-lg font-semibold text-red-900">{analysis.mayorVolatilidad.month}</p>
                <p className="text-sm text-red-700">Diferencia: {analysis.mayorVolatilidad.diferencia.toFixed(8)}</p>
              </Card>
              <Card className="p-6 bg-green-50 border-green-100">
                <p className="text-sm text-green-600 mb-2 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" /> Menor Volatilidad
                </p>
                <p className="text-lg font-semibold text-green-900">{analysis.menorVolatilidad.month}</p>
                <p className="text-sm text-green-700">Diferencia: {analysis.menorVolatilidad.diferencia.toFixed(8)}</p>
              </Card>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 bg-blue-50 border-blue-100">
                <p className="text-sm text-blue-600 mb-2">Meses Alcistas vs Bajistas</p>
                <p className="text-2xl font-bold text-blue-900">{analysis.mesesAlcistas} / {analysis.mesesBajistas}</p>
                <p className="text-xs text-blue-600 mt-1">Alcistas: {analysis.mesesAlcistas} | Bajistas: {analysis.mesesBajistas}</p>
              </Card>
              <Card className="p-6 bg-orange-50 border-orange-100">
                <p className="text-sm text-orange-600 mb-2">Cambio Promedio Anual</p>
                <p className="text-2xl font-bold text-orange-900">{analysis.cambioPromedioAnual.toFixed(2)}%</p>
                <p className="text-xs text-orange-600 mt-1">Variación interanual promedio</p>
              </Card>
            </div>

            {/* Best/Worst Months */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 bg-green-50 border-green-100">
                <p className="text-sm text-green-600 mb-2">Mejor Mes (Mayor Rendimiento)</p>
                <p className="text-lg font-semibold text-green-900">{analysis.mejorMes.month}</p>
                <p className="text-sm text-green-700">Rendimiento: +{analysis.mejorMes.rendimiento.toFixed(4)}%</p>
              </Card>
              <Card className="p-6 bg-red-50 border-red-100">
                <p className="text-sm text-red-600 mb-2">Peor Mes (Menor Rendimiento)</p>
                <p className="text-lg font-semibold text-red-900">{analysis.peorMes.month}</p>
                <p className="text-sm text-red-700">Rendimiento: {analysis.peorMes.rendimiento.toFixed(4)}%</p>
              </Card>
            </div>

            {/* Tabs for detailed views */}
            <Tabs defaultValue="records" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="records">Registros de Precios</TabsTrigger>
                <TabsTrigger value="trends">Análisis de Tendencias</TabsTrigger>
                <TabsTrigger value="volatility">Volatilidad Mensual</TabsTrigger>
              </TabsList>

              {/* Price Records Table */}
              <TabsContent value="records">
                <Card className="p-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Precio Apertura</TableHead>
                          <TableHead className="text-right">Precio Cierre</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.records.map((record, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{record.date}</TableCell>
                            <TableCell className="text-right">{record.apertura.toFixed(8)}</TableCell>
                            <TableCell className="text-right">{record.cierre.toFixed(8)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>

              {/* Trends Table */}
              <TabsContent value="trends">
                <Card className="p-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mes</TableHead>
                          <TableHead className="text-right">Cierre</TableHead>
                          <TableHead className="text-right">Rendimiento Mensual</TableHead>
                          <TableHead className="text-right">Cambio Anual</TableHead>
                          <TableHead className="text-right">Media Móvil 12M</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.monthlyData.map((month, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{month.month}</TableCell>
                            <TableCell className="text-right">{month.cierre.toFixed(8)}</TableCell>
                            <TableCell className="text-right">{month.rendimientoMensual !== undefined ? month.rendimientoMensual.toFixed(4) + "%" : "—"}</TableCell>
                            <TableCell className="text-right">{month.cambioAnual !== undefined ? month.cambioAnual.toFixed(4) + "%" : "—"}</TableCell>
                            <TableCell className="text-right">{month.mediaMovil12M !== undefined ? month.mediaMovil12M.toFixed(8) : "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>

              {/* Volatility Table */}
              <TabsContent value="volatility">
                <Card className="p-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mes</TableHead>
                          <TableHead className="text-right">Apertura</TableHead>
                          <TableHead className="text-right">Cierre</TableHead>
                          <TableHead className="text-right">Volatilidad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.monthlyData.map((month, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{month.month}</TableCell>
                            <TableCell className="text-right">{month.apertura.toFixed(8)}</TableCell>
                            <TableCell className="text-right">{month.cierre.toFixed(8)}</TableCell>
                            <TableCell className="text-right">{month.volatilidad.toFixed(8)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Download Buttons */}
            <div className="flex flex-wrap gap-3 justify-center pt-4">
              <Button onClick={() => downloadFile("csv")} disabled={isDownloading} className="gap-2">
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Descargar CSV
              </Button>
              <Button onClick={() => downloadFile("json")} disabled={isDownloading} className="gap-2">
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Descargar JSON
              </Button>
              <Button onClick={() => downloadFile("txt")} disabled={isDownloading} className="gap-2">
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Descargar TXT
              </Button>
            </div>

            {/* Reset Button */}
            <div className="flex justify-center pt-4">
              <Button onClick={() => { setAnalysis(null); setFileName(""); }} variant="outline" className="px-8">
                Analizar otro archivo
              </Button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center rounded-lg">
            <Card className="p-8 bg-white">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
                <p className="text-slate-600 font-medium">Procesando archivo...</p>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
