'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

interface LikertChartProps {
  data: Array<{
    rating: number;
    count: number;
    percentage: number;
  }>;
  question: string;
}

const LIKERT_COLORS = [
  '#EF4444', // 1 - Rojo
  '#F97316', // 2 - Naranja
  '#F59E0B', // 3 - Ámbar
  '#EAB308', // 4 - Amarillo
  '#84CC16', // 5 - Lima
  '#10B981', // 6 - Esmeralda
  '#3B82F6', // 7 - Azul
];

export function LikertChart({ data, question }: LikertChartProps) {
  // Ordenar por rating ascendente
  const sortedData = [...data].sort((a, b) => a.rating - b.rating);
  
  // Calcular estadísticas
  const totalResponses = sortedData.reduce((sum, item) => sum + item.count, 0);
  const average = sortedData.reduce((sum, item) => sum + (item.rating * item.count), 0) / totalResponses;
  
  // Agrupar por categorías
  const categories = {
    'Negativo (1-2)': sortedData.filter(d => d.rating <= 2).reduce((sum, d) => sum + d.percentage, 0),
    'Neutral (3-5)': sortedData.filter(d => d.rating >= 3 && d.rating <= 5).reduce((sum, d) => sum + d.percentage, 0),
    'Positivo (6-7)': sortedData.filter(d => d.rating >= 6).reduce((sum, d) => sum + d.percentage, 0),
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <div className="flex items-center space-x-2 mb-2">
            <div className={`w-4 h-4 rounded`} style={{ backgroundColor: LIKERT_COLORS[item.rating - 1] }} />
            <p className="font-semibold">Calificación: {item.rating}/7</p>
          </div>
          <div className="space-y-1">
            <p className="flex justify-between">
              <span className="text-gray-600">Respuestas:</span>
              <span className="font-medium">{item.count}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-600">Porcentaje:</span>
              <span className="text-blue-600">{item.percentage}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
          <p className="text-sm text-blue-800 font-medium">Puntuación promedio</p>
          <div className="flex items-end space-x-2 mt-1">
            <p className="text-3xl font-bold text-blue-900">{average.toFixed(2)}</p>
            <p className="text-blue-700 mb-1">/ 7</p>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
          <p className="text-sm text-green-800 font-medium">Total respuestas</p>
          <p className="text-3xl font-bold text-green-900">{totalResponses}</p>
        </div>
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
          <p className="text-sm text-purple-800 font-medium">Distribución</p>
          <div className="flex items-center space-x-4 mt-1">
            {Object.entries(categories).map(([label, percentage]) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold text-purple-900">{percentage.toFixed(1)}%</p>
                <p className="text-xs text-purple-700">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="text-lg font-semibold mb-4">Distribución por calificación</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="rating" 
                label={{ value: 'Calificación (1-7)', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                label={{ 
                  value: 'Número de respuestas', 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: 10
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Respuestas" radius={[4, 4, 0, 0]}>
                {sortedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={LIKERT_COLORS[entry.rating - 1]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de líneas y área */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de línea */}
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="text-lg font-semibold mb-4">Tendencia de distribución</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="percentage" 
                  name="Porcentaje %" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de área acumulativa */}
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="text-lg font-semibold mb-4">Distribución acumulativa</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sortedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="percentage" 
                  name="Porcentaje acumulado" 
                  stroke="#10B981" 
                  fill="#10B981" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabla detallada */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Calificación
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Etiqueta
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Respuestas
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Porcentaje
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distribución
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedData.map((item) => (
                <tr key={item.rating}>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: LIKERT_COLORS[item.rating - 1] }}
                      >
                        {item.rating}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {getLikertLabel(item.rating)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.count}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.percentage}%
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="h-3 rounded-full"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: LIKERT_COLORS[item.rating - 1]
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.rating <= 2 ? 'bg-red-100 text-red-800' :
                      item.rating >= 6 ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.rating <= 2 ? 'Bajo' : item.rating >= 6 ? 'Alto' : 'Medio'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getLikertLabel(rating: number): string {
  const labels: Record<number, string> = {
    1: 'Totalmente en desacuerdo',
    2: 'En desacuerdo',
    3: 'Parcialmente en desacuerdo',
    4: 'Neutral',
    5: 'Parcialmente de acuerdo',
    6: 'De acuerdo',
    7: 'Totalmente de acuerdo'
  };
  return labels[rating] || `Calificación ${rating}`;
}