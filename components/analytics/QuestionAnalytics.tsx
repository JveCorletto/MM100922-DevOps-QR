'use client';

import { SingleChoiceChart } from './charts/SingleChoiceChart';
import { MultipleChoiceChart } from './charts/MultipleChoiceChart';
import { LikertChart } from './charts/LikertChart';
import { TextResponses } from './TextResponses';

interface QuestionAnalyticsProps {
  question: any;
  index: number;
}

export function QuestionAnalytics({ question, index }: QuestionAnalyticsProps) {
  const renderChart = () => {
    switch (question.type) {
      case 'single':
        return (
          <SingleChoiceChart
            data={question.analytics.chart_data}
            question={question.question_text}
          />
        );
      case 'multiple':
        return (
          <MultipleChoiceChart
            data={question.analytics.chart_data}
            question={question.question_text}
          />
        );
      case 'likert':
        return (
          <LikertChart
            data={question.analytics.chart_data}
            question={question.question_text}
          />
        );
      case 'text':
        return (
          <TextResponses
            data={question.analytics}
            question={question.question_text}
          />
        );
      default:
        return <p>Tipo de pregunta no soportado para gráficos.</p>;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full font-semibold">
              {index}
            </span>
            <h3 className="text-lg font-semibold">{question.question_text}</h3>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="px-2 py-1 bg-gray-100 rounded">
              {question.type === 'single' ? 'Opción única' :
               question.type === 'multiple' ? 'Opción múltiple' :
               question.type === 'likert' ? 'Escala Likert' : 'Texto libre'}
            </span>
            <span>{question.response_count} respuestas</span>
            {question.required && (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                Obligatoria
              </span>
            )}
          </div>
        </div>
        {question.analytics.most_selected && (
          <div className="text-right">
            <p className="text-sm text-gray-500">Más seleccionado</p>
            <p className="font-semibold">
              {question.analytics.most_selected.option}
              <span className="ml-2 text-blue-600">
                ({question.analytics.most_selected.percentage}%)
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Gráfico o visualización */}
      <div className="mt-6">
        {renderChart()}
      </div>

      {/* Estadísticas adicionales */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Tasa de respuesta</p>
            <p className="font-medium">
              {question.response_count > 0
                ? `${Math.round((question.response_count / question.response_count) * 100)}%`
                : '0%'}
            </p>
          </div>
          {question.type === 'likert' && (
            <>
              <div>
                <p className="text-gray-500">Puntuación promedio</p>
                <p className="font-medium">{question.analytics.average_rating}</p>
              </div>
              <div>
                <p className="text-gray-500">Mediana</p>
                <p className="font-medium">{question.analytics.median_rating}</p>
              </div>
            </>
          )}
          {question.type === 'multiple' && (
            <div>
              <p className="text-gray-500">Selecciones por respuesta</p>
              <p className="font-medium">
                {question.analytics.avg_selections_per_response}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}