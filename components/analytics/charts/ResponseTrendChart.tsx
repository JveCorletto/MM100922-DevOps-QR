'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useState, useEffect } from 'react';

interface ResponseTrendChartProps {
  data: Array<{
    date: string;
    count: number;
  }>;
}

interface FormattedData {
  date: string;
  count: number;
  shortDate: string;
  day: number;
  month: string;
  cumulative?: number;
  movingAverage?: number;
}

export function ResponseTrendChart({ data }: ResponseTrendChartProps) {
  const [showAlternativeView, setShowAlternativeView] = useState(false);
  const [totalResponses, setTotalResponses] = useState(0);

  useEffect(() => {
    // Verificar si todos los datos son cero
    const allZeros = data.every(item => item.count === 0);
    const hasData = data.length > 0;
    
    // Calcular total de respuestas en el período
    const total = data.reduce((sum, item) => sum + item.count, 0);
    setTotalResponses(total);
    
    if (allZeros && hasData) {
      setShowAlternativeView(true);
    } else {
      setShowAlternativeView(false);
    }
  }, [data]);

  // Si no hay datos reales en la tendencia, mostrar vista alternativa
  if (showAlternativeView) {
    return <AlternativeTrendView totalResponses={totalResponses} />;
  }

  // Formatear fecha para mostrar
  const formattedData: FormattedData[] = data.map(item => ({
    ...item,
    shortDate: new Date(item.date).toLocaleDateString('es-ES', { weekday: 'short' }),
    day: new Date(item.date).getDate(),
    month: new Date(item.date).toLocaleDateString('es-ES', { month: 'short' }),
  }));

  // Calcular acumulado
  const dataWithCumulative = formattedData.map((item, index) => ({
    ...item,
    cumulative: formattedData.slice(0, index + 1).reduce((sum, d) => sum + d.count, 0),
  }));

  // Calcular promedio móvil para 3 días
  const dataWithMovingAverage = formattedData.map((item, index) => {
    const start = Math.max(0, index - 2); // 3 días: index, index-1, index-2
    const slice = formattedData.slice(start, index + 1);
    const movingAverage = slice.reduce((sum, d) => sum + d.count, 0) / slice.length;

    return {
      ...item,
      movingAverage: parseFloat(movingAverage.toFixed(2)),
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const datePayload = payload[0]?.payload as FormattedData | undefined;

      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg min-w-[200px]">
          <p className="font-semibold text-gray-900 mb-2">
            {datePayload ? new Date(datePayload.date).toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : label}
          </p>
          <div className="space-y-1">
            {payload.map((pld: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between py-1">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: pld.color || pld.fill }}
                  ></div>
                  <span className="text-gray-600">{pld.name}:</span>
                </div>
                <span className="font-bold ml-2">{pld.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Calcular estadísticas
  const totalPeriod = dataWithCumulative[dataWithCumulative.length - 1]?.cumulative || 0;
  const averageDaily = data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.count, 0) / data.length) : 0;

  // Encontrar día pico
  let peakDay = { count: 0, date: '' };
  if (data.length > 0) {
    const peakCount = Math.max(...data.map(d => d.count));
    const peakData = data.find(d => d.count === peakCount);
    if (peakData) {
      peakDay = {
        count: peakCount,
        date: new Date(peakData.date).toLocaleDateString('es-ES', { weekday: 'short' })
      };
    }
  }

  // Calcular tasa de crecimiento
  const growthRate = calculateGrowthRate(data);

  // Verificar si hay datos reales después del formateo
  const hasRealData = data.some(item => item.count > 0);

  if (!hasRealData && data.length > 0) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-4">📊</div>
        <h3 className="text-xl font-bold mb-2">Datos de tendencia limitados</h3>
        <p className="text-gray-600 mb-4">
          Esta encuesta tiene <strong>{totalResponses}</strong> respuestas, pero no están distribuidas en el tiempo.
        </p>
        <div className="inline-flex items-center justify-center p-4 bg-blue-50 rounded-lg max-w-md">
          <div className="text-3xl mr-3">⏰</div>
          <div className="text-left">
            <p className="font-semibold">Las respuestas se recibieron recientemente</p>
            <p className="text-sm text-gray-600">La tendencia temporal se mostrará cuando haya respuestas en diferentes días</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gráfico de área principal */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dataWithCumulative}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="shortDate"
              tick={{ fontSize: 12 }}
              label={{
                value: 'Día de la semana',
                position: 'insideBottom',
                offset: -5
              }}
            />
            <YAxis
              label={{
                value: 'Respuestas',
                angle: -90,
                position: 'insideLeft',
                offset: 10
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              name="Respuestas diarias"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              name="Total acumulado"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.1}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Gráficos adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de barras */}
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="text-lg font-semibold mb-4">Respuestas por día</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="shortDate" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  name="Respuestas"
                  fill="#8B5CF6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de línea con tendencia */}
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="text-lg font-semibold mb-4">Tendencia y promedio móvil</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataWithMovingAverage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="shortDate" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Respuestas"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="movingAverage"
                  name="Promedio móvil (3 días)"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Estadísticas de tendencia */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total período</p>
            <p className="text-2xl font-bold">{totalPeriod}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Promedio diario</p>
            <p className="text-2xl font-bold">{averageDaily}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Día pico</p>
            <p className="text-2xl font-bold">
              {peakDay.count}
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({peakDay.date})
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Crecimiento</p>
            <p className="text-2xl font-bold flex items-center">
              {Number(growthRate) > 0 ? '📈' : '📉'}
              <span className={`ml-2 ${Number(growthRate) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growthRate}%
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper para tasa de crecimiento
function calculateGrowthRate(data: Array<{ date: string, count: number }>): string {
  if (data.length < 2) return '0';

  // Dividir en primera y segunda mitad
  const midIndex = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midIndex);
  const secondHalf = data.slice(midIndex);

  // Calcular promedios
  const avgFirst = firstHalf.reduce((sum, d) => sum + d.count, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((sum, d) => sum + d.count, 0) / secondHalf.length;

  // Calcular crecimiento
  if (avgFirst === 0) return avgSecond > 0 ? '100' : '0';

  const growth = ((avgSecond - avgFirst) / Math.abs(avgFirst)) * 100;
  return growth.toFixed(1);
}

// Vista alternativa cuando no hay datos de tendencia
interface AlternativeTrendViewProps {
  totalResponses: number;
}

function AlternativeTrendView({ totalResponses }: AlternativeTrendViewProps) {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  
  // Datos de ejemplo basados en el total de respuestas
  const sampleData = [
    { name: 'Último día', value: totalResponses, color: '#3B82F6' },
    { name: 'Última semana', value: totalResponses, color: '#8B5CF6' },
    { name: 'Total general', value: totalResponses, color: '#10B981' },
  ];

  return (
    <div className="space-y-6">
      {/* Mensaje informativo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="text-blue-600 text-xl mr-3">ℹ️</div>
          <div>
            <h3 className="font-bold text-blue-800 mb-2">Información de tendencia</h3>
            <p className="text-blue-700 mb-2">
              La tendencia de respuestas por día aún no está disponible porque las respuestas no tienen fecha registrada o se recibieron hoy.
            </p>
            <p className="text-blue-700 text-sm">
              Total de respuestas: <strong>{totalResponses}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Gráfico de distribución simple */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-4">Resumen de actividad</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Gráfico de pastel simple */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sampleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {sampleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} respuestas`, 'Cantidad']} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Estadísticas */}
          <div className="flex flex-col justify-center">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">Respuestas totales</span>
                <span className="text-2xl font-bold text-gray-900">{totalResponses}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">Periodo analizado</span>
                <span className="text-xl font-bold text-blue-600">7 días</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">Estado</span>
                <span className="text-xl font-bold text-green-600">Activo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selector de rango temporal */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Rango temporal</h4>
            <div className="flex space-x-2">
              {(['day', 'week', 'month'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range === 'day' ? 'Hoy' : range === 'week' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
          </div>
          <p className="text-gray-600 text-sm mt-2">
            Los datos de tendencia detallada estarán disponibles cuando haya respuestas distribuidas en diferentes días.
          </p>
        </div>
      </div>
    </div>
  );
}