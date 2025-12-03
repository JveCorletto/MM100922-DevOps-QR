'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSurveyAnalytics } from '@/hooks/useSurveyAnalytics';
import { StatsCards } from '@/components/analytics/StatsCards';
import { QuestionAnalytics } from '@/components/analytics/QuestionAnalytics';
import { ResponseTrendChart } from '@/components/analytics/charts/ResponseTrendChart';
import { ExportButton } from '@/components/analytics/ExportButton';
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function SurveyAnalyticsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data, loading, error, refetch } = useSurveyAnalytics(id as string);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  
  const [supabase, setSupabase] = useState<SupabaseBrowserClient | null>(null);
  useEffect(() => {
    const client = supabaseBrowser();
    setSupabase(client);
  }, []);

  // Ahora sí verificar
  if (!supabase) {
    return null;
  }

  // Verificar autenticación en cliente
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          setSessionError('Error al verificar sesión');
          setIsLoading(false);
          return;
        }
        
        if (!session) {
          router.push('/auth/login');
          return;
        }
        
        setHasCheckedAuth(true);
        setIsLoading(false);
      } catch (err) {
        setSessionError('Error al verificar autenticación');
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  // Si hay error de sesión o auth
  if (sessionError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <div className="text-red-600 text-2xl mr-3">🔒</div>
              <h2 className="text-xl font-bold text-red-800">Error de autenticación</h2>
            </div>
            <p className="text-red-700 mb-4">{sessionError}</p>
            <button
              onClick={() => router.push('/auth/login')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Ir al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !hasCheckedAuth) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg mb-6"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // Si hay error del hook
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <div className="text-red-600 text-2xl mr-3">⚠️</div>
              <h2 className="text-xl font-bold text-red-800">Error al cargar analítica</h2>
            </div>
            <p className="text-red-700 mb-4">
              {error.includes('No autorizado') || error.includes('401') 
                ? 'Tu sesión ha expirado o no tienes permiso para ver esta encuesta.'
                : error}
            </p>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Reintentar
              </button>
              <button
                onClick={() => router.push('/surveys')}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Volver a encuestas
              </button>
              {(error.includes('No autorizado') || error.includes('401')) && (
                <button
                  onClick={() => router.push('/auth/login')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Iniciar sesión
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay datos (pero no hay error)
  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-2xl font-bold mb-4">Sin datos disponibles</h2>
          <p className="text-gray-600 mb-6">
            No se pudieron cargar los datos de la encuesta. Esto puede deberse a:
          </p>
          <ul className="text-left text-gray-600 mb-6 max-w-md mx-auto">
            <li className="mb-2">• La encuesta no existe</li>
            <li className="mb-2">• No tienes permisos para ver esta encuesta</li>
            <li className="mb-2">• Problemas de conexión con el servidor</li>
          </ul>
          <div className="flex justify-center space-x-3">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={() => router.push('/surveys')}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Volver a encuestas
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Data existe, podemos acceder a sus propiedades
  const { survey, summary, questions } = data;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {survey.title}
          </h1>
          <p className="text-gray-600 mt-2">
            Analítica de respuestas • {summary.total_responses} respuestas
          </p>
          {survey.description && (
            <p className="text-gray-500 mt-1">{survey.description}</p>
          )}
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <button
            onClick={() => router.push(`/surveys/${id}/edit`)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Editar Encuesta
          </button>
          <ExportButton surveyId={id as string} />
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <StatsCards summary={summary} />

      {/* Gráfico de tendencia */}
      {summary.response_trend && summary.response_trend.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Tendencia de respuestas</h2>
          <ResponseTrendChart data={summary.response_trend} />
        </div>
      )}

      {/* Analítica por pregunta */}
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Analítica por pregunta</h2>
          <div className="text-sm text-gray-600">
            {questions.filter((q: any) => q.response_count > 0).length} de {questions.length} preguntas tienen respuestas
          </div>
        </div>
        
        {questions.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">Esta encuesta no tiene preguntas configuradas.</p>
          </div>
        ) : (
          questions
            .filter((q: any) => q.response_count > 0)
            .map((question: any, index: number) => (
              <QuestionAnalytics
                key={question.id}
                question={question}
                index={index + 1}
              />
            ))
        )}

        {/* Preguntas sin respuestas */}
        {questions.filter((q: any) => q.response_count === 0).length > 0 && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">Preguntas sin respuestas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {questions
                .filter((q: any) => q.response_count === 0)
                .map((question: any) => (
                  <div key={question.id} className="bg-white p-3 rounded border">
                    <p className="font-medium">{question.question_text}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                        {question.type === 'single' ? 'Opción única' :
                         question.type === 'multiple' ? 'Opción múltiple' :
                         question.type === 'likert' ? 'Escala Likert' : 'Texto libre'}
                      </span>
                      {question.required && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                          Obligatoria
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer con información adicional */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-sm text-gray-600">
          <div>
            <p>Datos actualizados al: {new Date().toLocaleString()}</p>
            <p>ID de la encuesta: <code className="bg-gray-100 px-1 rounded">{survey.id}</code></p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => refetch()}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Actualizar datos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}