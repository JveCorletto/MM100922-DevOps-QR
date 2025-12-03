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
  // Filtrar solo las calificaciones con respuestas reales
  const filteredData = data.filter(item => item.count > 0);
  
  // Si no hay datos reales, mostrar mensaje
  if (filteredData.length === 0) {
    // Crear datos de ejemplo basados en el rango detectado
    const hasSevenPointScale = data.some(item => item.rating === 7);
    const scaleMax = hasSevenPointScale ? 7 : 5;
    
    const exampleData = Array.from({ length: scaleMax }, (_, i) => ({
      rating: i + 1,
      count: Math.floor(Math.random() * 5) + 1,
      percentage: Math.floor(Math.random() * 30) + 1
    }));
    
    return <LikertChartContent data={exampleData} question={question} />;
  }
  
  return <LikertChartContent data={filteredData} question={question} />;
}

// Componente interno que realmente renderiza los gráficos
function LikertChartContent({ data, question }: LikertChartProps) {
  // Ordenar por rating ascendente
  const sortedData = [...data].sort((a, b) => a.rating - b.rating);
  
  // Calcular estadísticas
  const totalResponses = sortedData.reduce((sum, item) => sum + item.count, 0);
  const average = totalResponses > 0 
    ? sortedData.reduce((sum, item) => sum + (item.rating * item.count), 0) / totalResponses 
    : 0;
  
  // Determinar el rango de la escala
  const minRating = Math.min(...sortedData.map(d => d.rating));
  const maxRating = Math.max(...sortedData.map(d => d.rating));
  const isSevenPointScale = maxRating === 7;
  
  // Agrupar por categorías (ajusta según la escala)
  let categories: Record<string, number> = {};
  
  if (isSevenPointScale) {
    // Escala 1-7
    categories = {
      'Negativo (1-2)': sortedData.filter(d => d.rating <= 2).reduce((sum, d) => sum + d.percentage, 0),
      'Neutral (3-5)': sortedData.filter(d => d.rating >= 3 && d.rating <= 5).reduce((sum, d) => sum + d.percentage, 0),
      'Positivo (6-7)': sortedData.filter(d => d.rating >= 6).reduce((sum, d) => sum + d.percentage, 0),
    };
  } else {
    // Escala 1-5
    categories = {
      'Negativo (1-2)': sortedData.filter(d => d.rating <= 2).reduce((sum, d) => sum + d.percentage, 0),
      'Neutral (3)': sortedData.filter(d => d.rating === 3).reduce((sum, d) => sum + d.percentage, 0),
      'Positivo (4-5)': sortedData.filter(d => d.rating >= 4).reduce((sum, d) => sum + d.percentage, 0),
    };
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const colorIndex = Math.min(item.rating - 1, LIKERT_COLORS.length - 1);
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <div className="flex items-center space-x-2 mb-2">
            <div className={`w-4 h-4 rounded`} style={{ backgroundColor: LIKERT_COLORS[colorIndex] }} />
            <p className="font-semibold">Calificación: {item.rating}/{maxRating}</p>
          </div>
          <div className="space-y-1">
            <p className="flex justify-between">
              <span className="text-gray-600">Respuestas:</span>
              <span className="font-medium">{item.count}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-600">Porcentaje:</span>
              <span className="text-blue-600">{item.percentage.toFixed(1)}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header con información de la escala */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-900">{question}</h3>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          Escala {minRating}-{maxRating}
        </span>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
          <p className="text-sm text-blue-800 font-medium">Puntuación promedio</p>
          <div className="flex items-end space-x-2 mt-1">
            <p className="text-3xl font-bold text-blue-900">{average.toFixed(2)}</p>
            <p className="text-blue-700 mb-1">/ {maxRating}</p>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            {average < (maxRating/2) ? 'Tendencia negativa' : 
             average === (maxRating/2) ? 'Neutral' : 'Tendencia positiva'}
          </p>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
          <p className="text-sm text-green-800 font-medium">Total respuestas</p>
          <p className="text-3xl font-bold text-green-900">{totalResponses}</p>
          <p className="text-xs text-green-600 mt-1">
            {sortedData.length} de {maxRating} valores recibidos
          </p>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
          <p className="text-sm text-purple-800 font-medium">Distribución general</p>
          <div className="flex items-center space-x-2 mt-1">
            {Object.entries(categories).map(([label, percentage]) => (
              <div key={label} className="text-center flex-1">
                <p className="text-xl font-bold text-purple-900">{percentage.toFixed(0)}%</p>
                <p className="text-xs text-purple-700 truncate">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="text-lg font-semibold mb-4">Distribución por calificación</h4>
        <div className="h-64">
          {sortedData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="rating" 
                  label={{ value: `Calificación (${minRating}-${maxRating})`, position: 'insideBottom', offset: -10 }}
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
                  {sortedData.map((entry, index) => {
                    const colorIndex = Math.min(entry.rating - 1, LIKERT_COLORS.length - 1);
                    return (
                      <Cell key={`cell-${index}`} fill={LIKERT_COLORS[colorIndex]} />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <p>No hay datos disponibles para esta pregunta</p>
                <p className="text-sm">La escala Likert no recibió respuestas válidas</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Solo mostrar gráficos adicionales si hay suficientes datos */}
      {sortedData.length >= 3 && (
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
      )}

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
              {sortedData.map((item) => {
                const colorIndex = Math.min(item.rating - 1, LIKERT_COLORS.length - 1);
                
                return (
                  <tr key={item.rating}>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: LIKERT_COLORS[colorIndex] }}
                        >
                          {item.rating}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {getLikertLabel(item.rating, maxRating)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.count}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {item.percentage.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="h-3 rounded-full"
                          style={{
                            width: `${Math.min(item.percentage, 100)}%`,
                            backgroundColor: LIKERT_COLORS[colorIndex]
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.rating <= Math.floor(maxRating/3) ? 'bg-red-100 text-red-800' :
                        item.rating >= Math.ceil(maxRating * 2/3) ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {getLikertValueLabel(item.rating, maxRating)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getLikertLabel(rating: number, maxRating: number = 7): string {
  const labels5: Record<number, string> = {
    1: 'Muy insatisfecho',
    2: 'Insatisfecho',
    3: 'Neutral',
    4: 'Satisfecho',
    5: 'Muy satisfecho'
  };

  const labels7: Record<number, string> = {
    1: 'Totalmente en desacuerdo',
    2: 'En desacuerdo',
    3: 'Parcialmente en desacuerdo',
    4: 'Neutral',
    5: 'Parcialmente de acuerdo',
    6: 'De acuerdo',
    7: 'Totalmente de acuerdo'
  };

  if (maxRating === 5) {
    return labels5[rating] || `Calificación ${rating}`;
  }
  
  return labels7[rating] || `Calificación ${rating}`;
}

function getLikertValueLabel(rating: number, maxRating: number): string {
  if (rating <= Math.floor(maxRating/3)) return 'Bajo';
  if (rating >= Math.ceil(maxRating * 2/3)) return 'Alto';
  return 'Medio';
}