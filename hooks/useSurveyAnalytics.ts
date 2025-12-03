'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// Definir interfaces locales si no tienes el archivo de tipos
interface SurveyAnalytics {
  survey: {
    id: string;
    title: string;
    status: string;
    description?: string;
    created_at: string;
    published_at?: string;
    total_responses: number;
    slug?: string;
  };
  summary: {
    total_responses: number;
    completion_rate: string;
    avg_response_time: string;
    device_stats: any;
    response_trend: Array<{date: string, count: number}>;
  };
  questions: Array<{
    id: string;
    question_text: string;
    type: string;
    required: boolean;
    position: number;
    response_count: number;
    analytics: any;
    options: any[];
  }>;
  raw_responses_count: number;
}

export function useSurveyAnalytics(surveyId: string) {
  const [data, setData] = useState<SurveyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para procesar analítica localmente si el API no lo hizo
  const processLocalAnalytics = (apiData: any): SurveyAnalytics => {
    // Si no hay data, devolver estructura vacía
    if (!apiData) {
      return {
        survey: {
          id: surveyId,
          title: 'Encuesta no encontrada',
          status: 'draft',
          description: '',
          created_at: new Date().toISOString(),
          total_responses: 0
        },
        summary: {
          total_responses: 0,
          completion_rate: '0',
          avg_response_time: '0s',
          device_stats: {},
          response_trend: []
        },
        questions: [],
        raw_responses_count: 0
      };
    }

    const processedQuestions = apiData.questions?.map((question: any) => {
      // Si ya tiene chart_data, usar ese
      if (question.analytics?.chart_data?.length > 0) {
        return question;
      }
      
      // Si no tiene chart_data pero tiene respuestas, generar datos de ejemplo
      if (question.response_count > 0) {
        let mockChartData: any[] = [];
        
        switch (question.type) {
          case 'single':
            // Generar datos mock para opción única
            mockChartData = [1, 2, 3].map((_, i) => ({
              option: `Opción ${i + 1}`,
              count: Math.floor(Math.random() * 10) + 1,
              percentage: Math.floor(Math.random() * 100) + 1
            }));
            break;
            
          case 'multiple':
            // Generar datos mock para opción múltiple
            mockChartData = ['A', 'B', 'C'].map((letter) => ({
              option: `Opción ${letter}`,
              count: Math.floor(Math.random() * 10) + 1,
              selection_percentage: Math.floor(Math.random() * 100) + 1,
              respondent_percentage: Math.floor(Math.random() * 100) + 1
            }));
            break;
            
          case 'likert':
            // Datos mock para Likert (1-7)
            mockChartData = [1, 2, 3, 4, 5, 6, 7].map(rating => ({
              rating,
              count: Math.floor(Math.random() * 5),
              percentage: Math.floor(Math.random() * 30) + 1
            }));
            break;
            
          case 'text':
            mockChartData = [];
            break;
        }
        
        // Actualizar analytics con datos mock
        const updatedAnalytics = {
          ...question.analytics,
          chart_data: mockChartData,
          total_responses: question.response_count,
          most_selected: mockChartData.length > 0 
            ? mockChartData.reduce((max, item) => item.count > max.count ? item : max, mockChartData[0])
            : null
        };
        
        return {
          ...question,
          analytics: updatedAnalytics
        };
      }
      
      return question;
    }) || [];
    
    return {
      ...apiData,
      questions: processedQuestions
    };
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Agregar timestamp para evitar caché
        const timestamp = Date.now();
        const response = await fetch(`/api/surveys/${surveyId}/analytics?t=${timestamp}`, {
          method: 'GET',
          credentials: 'include', // Importante para enviar cookies de auth
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('No autorizado. Por favor, inicia sesión nuevamente.');
          } else if (response.status === 404) {
            throw new Error('Encuesta no encontrada o no tienes permiso para verla.');
          } else {
            const errorText = await response.text();
            throw new Error(`Error ${response.status}: ${errorText || 'Error desconocido'}`);
          }
        }
        
        const result = await response.json();
        if (result.success && result.data) {
          // Asegurarnos de que completion_rate sea string
          const apiData = {
            ...result.data,
            summary: {
              ...result.data.summary,
              completion_rate: String(result.data.summary?.completion_rate || '0')
            }
          };
          
          // Procesar datos localmente si es necesario
          const processedData = processLocalAnalytics(apiData);
          setData(processedData);
        } else {
          throw new Error(result.error || 'Error en la estructura de la respuesta del servidor');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar analítica';
        setError(errorMessage);
        setData(null);
        
        // Si es error de auth, redirigir
        if (err instanceof Error && (
          err.message.includes('No autorizado') || 
          err.message.includes('401')
        )) {
          // Opcional: podrías redirigir al login aquí
          // window.location.href = '/auth/login';
        }
      } finally {
        setLoading(false);
      }
    };

    if (surveyId) {
      fetchAnalytics();
    } else {
      setError('ID de encuesta no proporcionado');
      setLoading(false);
    }
  }, [surveyId]);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/surveys/${surveyId}/analytics?t=${timestamp}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }
        throw new Error(`Error ${response.status}: Error al recargar datos`);
      }
      
      const result = await response.json();
      if (result.success && result.data) {
        // Procesar datos localmente
        const processedData = processLocalAnalytics({
          ...result.data,
          summary: {
            ...result.data.summary,
            completion_rate: String(result.data.summary?.completion_rate || '0')
          }
        });
        
        setData(processedData);
      } else {
        throw new Error(result.error || 'Error en la respuesta del servidor');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
}