import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    
    // 1. Crear cliente de Supabase con cookies SSR
    const supabase = supabaseServer();

    // 2. Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }


    // 3. Verificar que el usuario es dueño de la encuesta
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select(`
        *,
        profiles!surveys_owner_id_fkey (id, display_name)
      `)
      .eq('id', params.id)
      .eq('owner_id', user.id)
      .single();

    if (surveyError || !survey) {
      console.error('❌ Survey error:', surveyError);
      return NextResponse.json({
        error: 'Encuesta no encontrada o no autorizado'
      }, { status: 404 });
    }


    // 4. Obtener estadísticas básicas
    const { count: totalResponses, error: countError } = await supabase
      .from('responses')
      .select('id', { count: 'exact', head: true })
      .eq('survey_id', params.id);

    if (countError) {
      console.error('Error counting responses:', countError);
    }


    // 5. Obtener preguntas con sus opciones
    const { data: questions, error: questionsError } = await supabase
      .from('survey_questions')
      .select(`
        *,
        survey_options (
          id,
          label,
          value,
          position
        )
      `)
      .eq('survey_id', params.id)
      .order('position', { ascending: true });

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
    }


    // 6. Obtener respuestas con metadatos - SOLO submitted_at (sin created_at)
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select(`
        id,
        submitted_at,
        meta,
        response_items (
          question_id,
          value_text,
          value_numeric,
          value_json
        )
      `)
      .eq('survey_id', params.id)
      .order('submitted_at', { ascending: false });

    if (responsesError) {
      console.error('❌ Error fetching responses:', responsesError);
      return NextResponse.json({
        error: 'Error al obtener respuestas',
        details: responsesError.message
      }, { status: 500 });
    }


    // 7. Procesar datos para cada pregunta
    const questionsWithAnalytics = await processQuestionsAnalytics(
      questions || [],
      responses || []
    );

    // 8. Calcular estadísticas de dispositivo
    const deviceStats = calculateDeviceStats(responses || []);

    // 9. Calcular tasa de respuesta diaria - USANDO SOLO submitted_at
    const responseTrend = await calculateResponseTrend(supabase, params.id);

    // 10. Preparar respuesta
    const result = {
      success: true,
      data: {
        survey: {
          id: survey.id,
          title: survey.title,
          status: survey.status,
          description: survey.description,
          created_at: survey.created_at,
          published_at: survey.publish_at,
          total_responses: totalResponses || 0
        },
        summary: {
          total_responses: totalResponses || 0,
          completion_rate: calculateCompletionRate(questions?.length || 0, responses || []),
          avg_response_time: calculateAverageResponseTime(responses || []),
          device_stats: deviceStats,
          response_trend: responseTrend
        },
        questions: questionsWithAnalytics,
        raw_responses_count: responses?.length || 0
      }
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error en analytics endpoint:', error);
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper functions
async function processQuestionsAnalytics(questions: any[], responses: any[]) {
  
  // Procesar cada pregunta
  const processedQuestions = await Promise.all(
    questions.map(async (question) => {
      // Filtrar respuestas para esta pregunta
      const questionResponses = responses.flatMap((r: any) =>
        r.response_items?.filter((ri: any) => ri.question_id === question.id) || []
      );


      let analyticsData;

      switch (question.type) {
        case 'single':
          analyticsData = processSingleChoiceAnalytics(question, questionResponses);
          break;
        case 'multiple':
          analyticsData = processMultipleChoiceAnalytics(question, questionResponses);
          break;
        case 'likert':
          analyticsData = processLikertAnalytics(question, questionResponses);
          break;
        case 'text':
          analyticsData = processTextAnalytics(questionResponses);
          break;
        default:
          analyticsData = { type: question.type, unsupported: true };
      }

      return {
        id: question.id,
        question_text: question.question_text,
        type: question.type,
        required: question.required,
        position: question.position,
        response_count: questionResponses.length,
        analytics: analyticsData,
        options: question.survey_options || []
      };
    })
  );
  
  return processedQuestions;
}

function processSingleChoiceAnalytics(question: any, responses: any[]) {
  
  const optionCounts: Record<string, number> = {};

  // Inicializar con opciones definidas
  if (question.survey_options && question.survey_options.length > 0) {
    question.survey_options.forEach((opt: any) => {
      // Usar value si existe, si no label
      const key = opt.value || opt.label || '';
      optionCounts[key] = 0;
    });
  }

  // Contar respuestas
  responses.forEach((response) => {
    if (response.value_text) {
      const value = response.value_text;
      if (optionCounts[value] !== undefined) {
        optionCounts[value]++;
      } else {
        // Agregar igualmente si no existe
        optionCounts[value] = (optionCounts[value] || 0) + 1;
      }
    }
  });

  const total = responses.length;
  const chartData = Object.entries(optionCounts).map(([option, count]) => ({
    option,
    count,
    percentage: total > 0 ? parseFloat((count / total * 100).toFixed(1)) : 0
  }));

  return {
    chart_data: chartData,
    total_responses: total,
    most_selected: chartData.length > 0
      ? chartData.reduce((max, item) => item.count > max.count ? item : max)
      : null
  };
}

function processMultipleChoiceAnalytics(question: any, responses: any[]) {
  
  const optionCounts: Record<string, number> = {};
  let totalSelections = 0;

  // Inicializar con opciones definidas
  if (question.survey_options && question.survey_options.length > 0) {
    question.survey_options.forEach((opt: any) => {
      optionCounts[opt.label || opt.value || ''] = 0;
    });
  }

  // Contar selecciones (pueden ser múltiples por respuesta)
  responses.forEach(response => {
    if (response.value_json && Array.isArray(response.value_json)) {
      response.value_json.forEach((value: string) => {
        if (optionCounts[value] !== undefined) {
          optionCounts[value]++;
          totalSelections++;
        }
      });
    }
  });

  const totalResponses = responses.length;
  const chartData = Object.entries(optionCounts).map(([option, count]) => ({
    option,
    count,
    selection_percentage: totalSelections > 0 ? parseFloat((count / totalSelections * 100).toFixed(1)) : 0,
    respondent_percentage: totalResponses > 0 ? parseFloat((count / totalResponses * 100).toFixed(1)) : 0
  }));

  return {
    chart_data: chartData,
    total_responses: totalResponses,
    total_selections: totalSelections,
    avg_selections_per_response: totalResponses > 0 ? parseFloat((totalSelections / totalResponses).toFixed(2)) : 0,
    most_selected: chartData.length > 0
      ? chartData.reduce((max, item) => item.count > max.count ? item : max)
      : null
  };
}

function processLikertAnalytics(question: any, responses: any[]) {
  
  const ratingCounts: Record<number, number> = {};
  const ratings = [1, 2, 3, 4, 5, 6, 7]; // Escala común

  // Inicializar contadores
  ratings.forEach(rating => {
    ratingCounts[rating] = 0;
  });

  // Contar respuestas
  let total = 0;
  let sum = 0;

  responses.forEach(response => {
    if (response.value_numeric !== null && response.value_numeric !== undefined) {
      const rating = Number(response.value_numeric);
      if (ratings.includes(rating)) {
        ratingCounts[rating]++;
        total++;
        sum += rating;
      }
    }
  });

  const chartData = Object.entries(ratingCounts).map(([rating, count]) => ({
    rating: Number(rating),
    count,
    percentage: total > 0 ? parseFloat((count / total * 100).toFixed(1)) : 0
  }));

  return {
    chart_data: chartData,
    total_responses: total,
    average_rating: total > 0 ? parseFloat((sum / total).toFixed(2)) : 0,
    median_rating: calculateMedian(responses),
    distribution: chartData
  };
}

function processTextAnalytics(responses: any[]) {
  
  const textResponses = responses
    .filter(r => r.value_text && r.value_text.trim().length > 0)
    .map(r => ({
      text: r.value_text,
      length: r.value_text.length,
      word_count: r.value_text.split(/\s+/).filter((w: string) => w.length > 0).length
    }));

  // Análisis básico de texto
  const wordFrequencies = analyzeWordFrequency(textResponses.map((r: any) => r.text));
  const avgLength = textResponses.length > 0
    ? textResponses.reduce((sum: number, r: any) => sum + r.length, 0) / textResponses.length
    : 0;
  const avgWordCount = textResponses.length > 0
    ? textResponses.reduce((sum: number, r: any) => sum + r.word_count, 0) / textResponses.length
    : 0;

  return {
    total_responses: textResponses.length,
    sample_responses: textResponses.slice(0, 10), // Mostrar solo 10
    word_frequencies: wordFrequencies.slice(0, 20), // Top 20 palabras
    average_length: Math.round(avgLength),
    average_word_count: Math.round(avgWordCount),
    shortest_response: textResponses.length > 0
      ? textResponses.reduce((min: any, r: any) => r.length < min.length ? r : min, textResponses[0])
      : null,
    longest_response: textResponses.length > 0
      ? textResponses.reduce((max: any, r: any) => r.length > max.length ? r : max, textResponses[0])
      : null
  };
}

function calculateDeviceStats(responses: any[]) {
  
  const stats = {
    mobile: 0,
    desktop: 0,
    tablet: 0,
    browsers: {} as Record<string, number>,
    operating_systems: {} as Record<string, number>,
    total: responses.length
  };

  responses.forEach(response => {
    const meta = response.meta || {};

    // Detectar dispositivo
    if (meta.is_mobile) {
      stats.mobile++;
    } else if (meta.is_tablet) {
      stats.tablet++;
    } else {
      stats.desktop++;
    }

    // Navegador
    if (meta.browser) {
      const browser = meta.browser.split(' ')[0]; // Tomar solo el nombre principal
      stats.browsers[browser] = (stats.browsers[browser] || 0) + 1;
    }

    // Sistema operativo
    if (meta.os) {
      stats.operating_systems[meta.os] = (stats.operating_systems[meta.os] || 0) + 1;
    }
  });

  const total = stats.total || 1; // Evitar división por 0

  return {
    ...stats,
    mobile_percentage: total > 0 ? parseFloat(((stats.mobile / total) * 100).toFixed(1)) : 0,
    desktop_percentage: total > 0 ? parseFloat(((stats.desktop / total) * 100).toFixed(1)) : 0,
    tablet_percentage: total > 0 ? parseFloat(((stats.tablet / total) * 100).toFixed(1)) : 0,
    top_browser: Object.entries(stats.browsers).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Desconocido',
    top_os: Object.entries(stats.operating_systems).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Desconocido'
  };
}

async function calculateResponseTrend(supabase: any, surveyId: string) {
  try {
    
    // Obtener respuestas solo con submitted_at
    const { data: allResponses, error } = await supabase
      .from('responses')
      .select('submitted_at, id')
      .eq('survey_id', surveyId);

    if (error) {
      console.error('Error fetching responses for trend:', error);
      return generateLast7Days({});
    }


    if (!allResponses || allResponses.length === 0) {
      return generateLast7Days({});
    }

    // Contar respuestas por día
    const dailyCounts: Record<string, number> = {};

    allResponses.forEach((response: any) => {
      let dateStr: string | null = null;
      
      if (response.submitted_at) {
        try {
          const date = new Date(response.submitted_at);
          if (!isNaN(date.getTime())) {
            dateStr = date.toISOString().split('T')[0];
          }
        } catch (e) {
        }
      }
      
      // Si no hay fecha válida, saltar esta respuesta
      if (!dateStr) {
        return;
      }
      
      dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
    });


    // Generar los últimos 7 días
    const trendData = generateLast7Days(dailyCounts);
    
    return trendData;

  } catch (error) {
    console.error('Error in calculateResponseTrend:', error);
    return generateLast7Days({});
  }
}

// Helper: Generar últimos 7 días
function generateLast7Days(dailyCounts: Record<string, number>) {
  const trendData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    trendData.push({
      date: dateStr,
      count: dailyCounts[dateStr] || 0
    });
  }
  return trendData;
}

function calculateCompletionRate(totalQuestions: number, responses: any[]) {
  if (responses.length === 0 || totalQuestions === 0) return 0;

  let totalAnswered = 0;
  responses.forEach((response: any) => {
    const answered = response.response_items?.length || 0;
    totalAnswered += answered / totalQuestions;
  });

  return parseFloat(((totalAnswered / responses.length) * 100).toFixed(1));
}

function calculateAverageResponseTime(responses: any[]) {
  // Esto asume que tienes un campo de tiempo de inicio y fin
  // Por ahora, retornar un valor estimado basado en la cantidad de preguntas
  if (responses.length === 0) return '0';

  const estimatedTimePerQuestion = 15; // segundos por pregunta
  const avgQuestionsAnswered = responses.reduce((sum: number, r: any) =>
    sum + (r.response_items?.length || 0), 0) / responses.length;

  const avgSeconds = avgQuestionsAnswered * estimatedTimePerQuestion;
  const minutes = Math.floor(avgSeconds / 60);

  return minutes > 0 ? `${minutes}m` : `${Math.round(avgSeconds)}s`;
}

function calculateMedian(responses: any[]) {
  const ratings = responses
    .map((r: any) => r.value_numeric)
    .filter((r: any) => r !== null && r !== undefined)
    .sort((a: number, b: number) => a - b);

  if (ratings.length === 0) return 0;

  const middle = Math.floor(ratings.length / 2);
  if (ratings.length % 2 === 0) {
    return (ratings[middle - 1] + ratings[middle]) / 2;
  }
  return ratings[middle];
}

function analyzeWordFrequency(texts: string[]) {
  const wordMap: Record<string, number> = {};
  const stopWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'de', 'que', 'y', 'en', 'a', 'con']);

  texts.forEach(text => {
    const words = text.toLowerCase()
      .replace(/[^\w\sáéíóúñ]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    words.forEach(word => {
      wordMap[word] = (wordMap[word] || 0) + 1;
    });
  });

  return Object.entries(wordMap)
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => ({ word, count }));
}