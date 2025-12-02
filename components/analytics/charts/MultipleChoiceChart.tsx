'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

interface MultipleChoiceChartProps {
  data: Array<{
    option: string;
    count: number;
    selection_percentage: number;
    respondent_percentage: number;
  }>;
  question: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export function MultipleChoiceChart({ data, question }: MultipleChoiceChartProps) {
  // Ordenar por cantidad descendente
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold">{payload[0].payload.option}</p>
          <div className="space-y-1 mt-2">
            <p className="flex justify-between">
              <span className="text-gray-600">Respuestas:</span>
              <span className="font-medium">{payload[0].value}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-600">% de selecciones:</span>
              <span className="text-blue-600">{payload[0].payload.selection_percentage}%</span>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-600">% de encuestados:</span>
              <span className="text-green-600">{payload[0].payload.respondent_percentage}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis 
              type="number" 
              label={{ 
                value: 'Número de selecciones', 
                position: 'insideBottom', 
                offset: -10 
              }}
            />
            <YAxis 
              type="category" 
              dataKey="option" 
              width={80}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="count" 
              name="Selecciones" 
              radius={[0, 4, 4, 0]}
            >
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Tabla de datos */}
      <div className="mt-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opción
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Selecciones
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % de selecciones
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % de encuestados
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visualización
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedData.map((item, index) => (
                <tr key={item.option}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {item.option}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.count}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.selection_percentage}%
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {item.respondent_percentage}%
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${item.respondent_percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td className="px-4 py-3 text-sm font-semibold">Total selecciones</td>
                <td className="px-4 py-3 text-sm font-semibold">
                  {sortedData.reduce((sum, item) => sum + item.count, 0)}
                </td>
                <td className="px-4 py-3 text-sm">100%</td>
                <td className="px-4 py-3 text-sm">-</td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}