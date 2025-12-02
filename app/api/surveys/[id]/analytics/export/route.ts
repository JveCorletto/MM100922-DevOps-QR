import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseServer();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar ownership
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('id, title')
      .eq('id', params.id)
      .eq('owner_id', user.id)
      .single();

    if (surveyError || !survey) {
      return NextResponse.json({ 
        error: 'Encuesta no encontrada o no autorizado' 
      }, { status: 404 });
    }

    // Obtener parámetros de la query
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    // Obtener preguntas
    const { data: questions, error: questionsError } = await supabase
      .from('survey_questions')
      .select('id, question_text, type, position')
      .eq('survey_id', params.id)
      .order('position');

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
    }

    // Obtener respuestas
    const { data: responses, error: responsesError } = await supabase
      .from('responses')
      .select(`
        id,
        submitted_at,
        respondent_token,
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
      console.error('Error fetching responses:', responsesError);
    }

    if (format === 'csv') {
      // Generar CSV
      const csvData = generateCSV(
        questions || [], 
        responses || [], 
        survey
      );

      // Retornar como archivo descargable
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="encuesta_${survey.title.replace(/[^\w\s]/gi, '')}_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else if (format === 'json') {
      // Retornar JSON
      return NextResponse.json({
        success: true,
        data: {
          survey,
          questions: questions || [],
          responses: responses || [],
          metadata: {
            exported_at: new Date().toISOString(),
            total_responses: responses?.length || 0,
            total_questions: questions?.length || 0
          }
        }
      });
    } else {
      return NextResponse.json({ 
        error: 'Formato no soportado. Use csv o json.' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error en export endpoint:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

function generateCSV(questions: any[], responses: any[], survey: any) {
  // Crear cabeceras
  const headers = [
    'ID Respuesta',
    'Fecha y Hora',
    'Token Respuesta',
    'Tipo Dispositivo',
    'Navegador',
    'Sistema Operativo',
    ...questions.map(q => `"${escapeCSV(q.question_text)}"`)
  ];

  // Crear filas
  const rows = responses.map((response: any) => {
    const meta = response.meta || {};
    const row = [
      response.id,
      new Date(response.submitted_at).toISOString(),
      response.respondent_token || '',
      meta.is_mobile ? 'Móvil' : meta.is_tablet ? 'Tablet' : 'Desktop',
      meta.browser || '',
      meta.os || ''
    ];

    // Mapear respuestas por pregunta
    questions.forEach(question => {
      const item = response.response_items?.find((ri: any) => ri.question_id === question.id);
      
      if (!item) {
        row.push('');
      } else {
        let value = '';
        if (item.value_text) {
          value = item.value_text;
        } else if (item.value_numeric !== null && item.value_numeric !== undefined) {
          value = item.value_numeric.toString();
        } else if (item.value_json) {
          value = Array.isArray(item.value_json) 
            ? item.value_json.join('; ') 
            : JSON.stringify(item.value_json);
        }
        
        row.push(`"${escapeCSV(value)}"`);
      }
    });

    return row.join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

function escapeCSV(value: string): string {
  return value.replace(/"/g, '""');
}