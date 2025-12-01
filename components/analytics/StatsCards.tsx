'use client';

interface StatsCardsProps {
  summary: {
    total_responses: number;
    completion_rate: string; // Asegurar que sea string
    avg_response_time: string;
    device_stats: {
      mobile_percentage: string;
      desktop_percentage: string;
      tablet_percentage: string;
      top_browser: string;
      top_os: string;
    };
  };
}

export function StatsCards({ summary }: StatsCardsProps) {
  const stats = [
    {
      title: 'Total Respuestas',
      value: summary.total_responses.toString(),
      icon: '📊',
      change: '+12% desde ayer',
      color: 'blue',
      description: 'Total de respuestas recibidas'
    },
    {
      title: 'Tasa de Completitud',
      value: `${summary.completion_rate}%`,
      icon: '✅',
      change: '+3% desde la semana pasada',
      color: 'green',
      description: 'Porcentaje de preguntas respondidas'
    },
    {
      title: 'Tiempo Promedio',
      value: summary.avg_response_time,
      icon: '⏱️',
      change: '-1.2m desde el mes pasado',
      color: 'purple',
      description: 'Tiempo promedio por encuesta'
    },
    {
      title: 'Dispositivos Móviles',
      value: `${summary.device_stats.mobile_percentage}%`,
      icon: '📱',
      change: '+5% desde la semana pasada',
      color: 'orange',
      description: 'Porcentaje de respuestas desde móviles'
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'green':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'purple':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'orange':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`border rounded-xl p-5 transition-all hover:shadow-md ${getColorClasses(stat.color)}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">{stat.title}</p>
              <p className="text-3xl font-bold mt-2">{stat.value}</p>
              <p className="text-sm mt-1 opacity-75">{stat.description}</p>
            </div>
            <div className="text-3xl">{stat.icon}</div>
          </div>
          <div className="mt-4 pt-3 border-t border-opacity-30">
            <p className="text-sm">{stat.change}</p>
          </div>
        </div>
      ))}
    </div>
  );
}