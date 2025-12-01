'use client';

import { useState, useEffect } from 'react';

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
    completion_rate: string; // Cambié a string para coincidir con StatsCards
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

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/surveys/${surveyId}/analytics`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        
        console.log('API Response:', result); // Para debug
        
        if (result.success && result.data) {
          // Asegurarnos de que completion_rate sea string
          const processedData = {
            ...result.data,
            summary: {
              ...result.data.summary,
              completion_rate: String(result.data.summary?.completion_rate || '0')
            }
          };
          setData(processedData);
        } else {
          throw new Error(result.error || 'Error al cargar los datos');
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido al cargar analítica');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    if (surveyId) {
      fetchAnalytics();
    }
  }, [surveyId]);

  const refetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/surveys/${surveyId}/analytics`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Error al recargar datos');
      }
      
      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch };
}