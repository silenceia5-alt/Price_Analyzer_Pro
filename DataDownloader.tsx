import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Download, Loader2, TrendingUp, FileJson, FileText } from "lucide-react";

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

export default function DataDownloader() {
  const [assetType, setAssetType] = useState<"forex" | "crypto" | "stock" | "index" | "">("");
  const [selectedAsset, setSelectedAsset] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const assetTypesQuery = trpc.priceAnalyzer.getAssetTypes.useQuery();
  const availableAssetsQuery = trpc.priceAnalyzer.getAvailableAssets.useQuery(
    { type: assetType as any },
    { enabled: !!assetType }
  );

  const downloadForexMutation = trpc.priceAnalyzer.downloadForexData.useMutation();
  const downloadCryptoMutation = trpc.priceAnalyzer.downloadCryptoData.useMutation();
  const downloadStockMutation = trpc.priceAnalyzer.downloadStockData.useMutation();
  const downloadCSVMutation = trpc.priceAnalyzer.downloadCSV.useMutation();
  const downloadJSONMutation = trpc.priceAnalyzer.downloadJSON.useMutation();
  const downloadTXTMutation = trpc.priceAnalyzer.downloadTXT.useMutation();

  const downloadFile = async (format: "csv" | "json" | "txt") => {
    if (!analysis) return;

    setIsDownloading(true);
    try {
      const fileContent = analysis.records.map(r => `${r.date},${r.apertura},${r.cierre}`).join('\n');
      const mutation = format === "csv" ? downloadCSVMutation : format === "json" ? downloadJSONMutation : downloadTXTMutation;
      const result = await mutation.mutateAsync({ fileContent });

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
      toast.success(`Archivo descargado: ${result.fileName}`);
    } catch (error) {
      toast.error((error as Error).message || "Error al descargar el archivo");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownload = async () => {
    if (!assetType || !selectedAsset) {
      toast.error("Por favor selecciona un tipo de activo y un símbolo");
      return;
    }

    setIsLoading(true);

    try {
      let result;

      if (assetType === "forex") {
        const asset = availableAssetsQuery.data?.find((a: any) => a.label === selectedAsset);
        if (!asset) throw new Error("Asset not found");
        result = await downloadForexMutation.mutateAsync({
          fromSymbol: asset.from,
          toSymbol: asset.to,
        });
      } else if (assetType === "crypto") {
        const asset = availableAssetsQuery.data?.find((a: any) => a.label === selectedAsset);
        if (!asset) throw new Error("Asset not found");
        result = await downloadCryptoMutation.mutateAsync({
          symbol: asset.symbol,
        });
      } else if (assetType === "stock" || assetType === "index") {
        const asset = availableAssetsQuery.data?.find((a: any) => a.label === selectedAsset);
        if (!asset) throw new Error("Asset not found");
        result = await downloadStockMutation.mutateAsync({
          symbol: asset.symbol,
        });
      }

      setAnalysis(result as AnalysisResult);
      toast.success(`Datos de ${selectedAsset} descargados y analizados correctamente`);
    } catch (error) {
      toast.error((error as Error).message || "Error al descargar datos");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Descargar Datos Financieros</h1>
          <p className="text-lg text-slate-600">Descarga y analiza datos de divisas, criptos, acciones e índices desde Alpha Vantage</p>
        </div>

        {!analysis ? (
          // Download Section
          <Card className="p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="space-y-6">
              {/* Asset Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">Tipo de Activo</label>
                <Select value={assetType} onValueChange={(value: any) => {
                  setAssetType(value);
                  setSelectedAsset("");
                }}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un tipo de activo" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypesQuery.data?.map((type: any) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Asset Selection */}
              {assetType && (
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-3">Selecciona un activo</label>
                  <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Cargando activos..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAssetsQuery.isLoading ? (
                        <div className="p-2 text-sm text-slate-500">Cargando...</div>
                      ) : (
                        availableAssetsQuery.data?.map((asset: any) => (
                          <SelectItem key={asset.label} value={asset.label}>
                            {asset.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Download Button */}
              <Button
                onClick={handleDownload}
                disabled={isLoading || !assetType || !selectedAsset}
                className="w-full py-6 text-base bg-slate-900 hover:bg-slate-800 gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Descargando y analizando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Descargar y Analizar
                  </>
                )}
              </Button>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Nota:</strong> Los datos se descargan desde Alpha Vantage. La primera descarga puede tomar unos segundos.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          // Analysis Results
          <div className="space-y-6">
            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">✓</div>
              <div>
                <p className="font-semibold text-green-900">Datos descargados y analizados correctamente</p>
                <p className="text-sm text-green-700">{selectedAsset}</p>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => downloadFile("csv")}
                disabled={isDownloading}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Descargar CSV
              </Button>
              <Button
                onClick={() => downloadFile("json")}
                disabled={isDownloading}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
                Descargar JSON
              </Button>
              <Button
                onClick={() => downloadFile("txt")}
                disabled={isDownloading}
                className="gap-2 bg-orange-600 hover:bg-orange-700"
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Descargar TXT
              </Button>
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
                  <TrendingUp className="w-4 h-4" /> Pico Más Alto
                </p>
                <p className="text-lg font-semibold text-red-900">{analysis.picoMasAlto.date}</p>
                <p className="text-sm text-red-700">Cierre: {analysis.picoMasAlto.cierre.toFixed(8)}</p>
              </Card>
              <Card className="p-6 bg-green-50 border-green-100">
                <p className="text-sm text-green-600 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Valle Más Bajo
                </p>
                <p className="text-lg font-semibold text-green-900">{analysis.valleMasBajo.date}</p>
                <p className="text-sm text-green-700">Apertura: {analysis.valleMasBajo.apertura.toFixed(8)}</p>
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
                <TabsTrigger value="records">Registros</TabsTrigger>
                <TabsTrigger value="trends">Tendencias</TabsTrigger>
                <TabsTrigger value="volatility">Volatilidad</TabsTrigger>
              </TabsList>

              {/* Price Records Table */}
              <TabsContent value="records">
                <Card className="p-6">
                  <div className="overflow-x-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Apertura</TableHead>
                          <TableHead className="text-right">Cierre</TableHead>
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
                  <div className="overflow-x-auto max-h-96">
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
                  <div className="overflow-x-auto max-h-96">
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

            {/* Reset Button */}
            <div className="flex justify-center pt-4">
              <Button onClick={() => { setAnalysis(null); setSelectedAsset(""); }} variant="outline" className="px-8">
                Descargar otro activo
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
