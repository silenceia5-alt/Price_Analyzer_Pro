import pandas as pd
import numpy as np
from datetime import datetime, timedelta 
# Generar rango de fechas desde Enero 2024 hasta Junio 2026
start_date = datetime(2024, 1, 1)
end_date = datetime(2026, 6, 30)
dates = pd.date_range(start_date, end_date, freq='B') # Días hábiles

# Crear datos base
n = len(dates)
prices = np.linspace(0.8, 0.85, n) + np.random.normal(0, 0.01, n)

df = pd.DataFrame({
    'date': dates,
    'apertura': prices,
    'cierre': prices + np.random.normal(0, 0.005, n)
})

# Ajustar hitos específicos solicitados por el usuario
# 1. Mayor nivel de precio (pico más alto): Enero 2025 (cierre en 0.909)
jan_2025_mask = (df['date'].dt.year == 2025) & (df['date'].dt.month == 1)
# Ponemos el pico en el último día hábil de enero 2025
last_jan_2025_idx = df[jan_2025_mask].index[-1]
df.loc[last_jan_2025_idx, 'cierre'] = 0.909
df.loc[last_jan_2025_idx, 'apertura'] = 0.900

# Asegurarnos de que nada más supere este valor
df.loc[df['cierre'] > 0.909, 'cierre'] = 0.890
df.loc[df['apertura'] > 0.909, 'apertura'] = 0.890

# 2. Menor nivel de precio (valle más bajo): Marzo 2026 (apertura en 0.771)
mar_2026_mask = (df['date'].dt.year == 2026) & (df['date'].dt.month == 3)
first_mar_2026_idx = df[mar_2026_mask].index[0]
df.loc[first_mar_2026_idx, 'apertura'] = 0.771
df.loc[first_mar_2026_idx, 'cierre'] = 0.780

# Asegurarnos de que nada sea inferior a este valor
df.loc[df['apertura'] < 0.771, 'apertura'] = 0.790
df.loc[df['cierre'] < 0.771, 'cierre'] = 0.790

# Formatear para el CSV (YYYY-MM-DD,apertura,cierre)
df['date_str'] = df['date'].dt.strftime('%Y-%m-%d')
output = df[['date_str', 'apertura', 'cierre']]

# Guardar sin cabecera
output.to_csv('/home/ubuntu/validation_prices.csv', index=False, header=False)

print(f"Archivo generado con {len(output)} registros.")
print(f"Pico: {output.loc[output['cierre'].idxmax()]}")
print(f"Valle: {output.loc[output['apertura'].idxmin()]}")
