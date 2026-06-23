# Análisis del sitio: Price Analyzer Pro
URL: https://priceanlyzr-obso7sqo.manus.space

## Descripción General
Aplicación web de análisis de precios financieros. Permite cargar archivos CSV o TXT con datos de precios y genera estadísticas completas.

## Formato de Entrada
- Formatos soportados: .txt, .csv
- Formato esperado: YYYY-MM-DD,apertura,cierre (sin cabecera)

## Funcionalidades Principales

### 1. Carga de Archivos
- Drag & drop o selección manual de archivo
- Procesamiento del lado del cliente (sin servidor)

### 2. Métricas de Resumen (Dashboard)
- Total de Registros
- Rango de Fechas (inicio y fin)
- Meses Analizados
- Promedio Apertura
- Promedio Cierre
- Promedio Total
- Mayor Volatilidad (mes con mayor diferencia apertura-cierre)
- Menor Volatilidad (mes con menor diferencia apertura-cierre)
- Rendimiento Promedio Mensual (% y conteo alcistas/bajistas)
- Cambio Promedio Anual (variación interanual)
- Mejor Mes (Mayor Rendimiento)
- Peor Mes (Menor Rendimiento)

### 3. Análisis de Volatilidad (toggle)
- Tabla por mes con datos de volatilidad

### 4. Análisis de Tendencias (toggle)
Tabla con columnas:
- Mes
- Cierre (precio de cierre del último día del mes)
- Rendimiento Mensual (% cambio mes a mes)
- Cambio Anual (variación interanual - requiere datos de más de 12 meses)
- Media Móvil 12M (requiere datos de más de 12 meses)

### 5. Tabla de Registros de Precios
- Muestra todos los registros con Fecha, Precio Apertura, Precio Cierre

### 6. Exportación de Resultados
- Descargar CSV
- Descargar JSON
- Descargar TXT

### 7. Reinicio
- Botón "Analizar otro archivo" para volver al inicio

## Resultados del Test con Datos de Muestra (128 registros, Ene-Jun 2024)
- Total de Registros: 128
- Rango de Fechas: 2024-01-02 hasta 2024-06-28
- Meses Analizados: 6
- Promedio Apertura: ~259.59
- Promedio Cierre: ~261.45
- Promedio Total: ~260.52
- Mayor Volatilidad: Feb 2024 (Diferencia: ~5.30)
- Menor Volatilidad: May 2024 (Diferencia: ~3.80)
- Rendimiento Promedio Mensual: 17.38% (Alcistas: 5, Bajistas: 0)
- Cambio Promedio Anual: 0.00% (datos insuficientes - menos de 12 meses)
- Mejor Mes: Feb 2024 (+24.7263%)
- Peor Mes: May 2024 (+0.9861%)

### Tabla de Tendencias
| Mes | Cierre | Rendimiento Mensual | Cambio Anual | Media Móvil 12M |
|-----|--------|---------------------|--------------|-----------------|
| Ene 2024 | 155.30 | — | — | — |
| Feb 2024 | 193.70 | 24.7263% | — | — |
| Mar 2024 | 234.70 | 21.1668% | — | — |
| Abr 2024 | 273.80 | 16.6596% | — | — |
| May 2024 | 276.50 | 0.9861% | — | — |
| Jun 2024 | 341.10 | 23.3635% | — | — |

## Observaciones Técnicas
- Aplicación de página única (SPA) construida con React
- Todo el procesamiento ocurre en el navegador (cliente)
- No requiere backend para el análisis
- Interfaz en español
- Diseño limpio con tarjetas de colores para métricas
- Secciones de volatilidad y tendencias son desplegables (toggle)
- Sección de descarga al final de la página
