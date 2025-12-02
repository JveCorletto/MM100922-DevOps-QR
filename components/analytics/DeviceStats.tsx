'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DeviceStatsProps {
  stats: {
    mobile: number;
    desktop: number;
    tablet: number;
    mobile_percentage: string;
    desktop_percentage: string;
    tablet_percentage: string;
    top_browser: string;
    top_os: string;
    browsers: Record<string, number>;
    operating_systems: Record<string, number>;
  };
}

export function DeviceStats({ stats }: DeviceStatsProps) {
  const deviceData = [
    { name: 'Móvil', value: stats.mobile, percentage: stats.mobile_percentage, color: '#3B82F6' },
    { name: 'Desktop', value: stats.desktop, percentage: stats.desktop_percentage, color: '#10B981' },
    { name: 'Tablet', value: stats.tablet, percentage: stats.tablet_percentage, color: '#F59E0B' },
  ];

  const browserData = Object.entries(stats.browsers || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const osData = Object.entries(stats.operating_systems || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-blue-600">{payload[0].value} respuestas</p>
          <p className="text-gray-600">{payload[0].payload.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Análisis de Dispositivos</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de dispositivos */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Distribución por dispositivo</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top navegadores */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Top Navegadores</h3>
          <div className="space-y-3">
            {browserData.map((browser, index) => {
              const percentage = (browser.value / (stats.mobile + stats.desktop + stats.tablet)) * 100;
              return (
                <div key={browser.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">
                      {getBrowserIcon(browser.name)}
                    </span>
                    <span className="font-medium">{browser.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-10 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">
              Navegador más popular: <span className="font-semibold">{stats.top_browser}</span>
            </p>
          </div>
        </div>

        {/* Top sistemas operativos */}
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Top Sistemas Operativos</h3>
          <div className="space-y-3">
            {osData.map((os, index) => {
              const percentage = (os.value / (stats.mobile + stats.desktop + stats.tablet)) * 100;
              return (
                <div key={os.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">
                      {getOSIcon(os.name)}
                    </span>
                    <span className="font-medium">{os.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-10 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">
              SO más popular: <span className="font-semibold">{stats.top_os}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getBrowserIcon(browser: string) {
  const lower = browser.toLowerCase();
  if (lower.includes('chrome')) return '🌐';
  if (lower.includes('firefox')) return '🦊';
  if (lower.includes('safari')) return '🍎';
  if (lower.includes('edge')) return '⚫';
  if (lower.includes('opera')) return '🎭';
  return '💻';
}

function getOSIcon(os: string) {
  const lower = os.toLowerCase();
  if (lower.includes('windows')) return '🪟';
  if (lower.includes('mac') || lower.includes('ios')) return '🍎';
  if (lower.includes('android')) return '🤖';
  if (lower.includes('linux')) return '🐧';
  return '💻';
}