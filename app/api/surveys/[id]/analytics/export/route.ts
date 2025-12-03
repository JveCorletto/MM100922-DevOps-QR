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
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'No autorizado. Por favor, inicia sesión.' 
      }, { status: 401 });
    }

    // Verificar que el usuario es dueño de la encuesta
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('id, title, description')
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
      .select('id, question_text, type, position, required')
      .eq('survey_id', params.id)
      .order('position');

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return NextResponse.json({ 
        error: 'Error al obtener preguntas'
      }, { status: 500 });
    }

    // Obtener respuestas - SOLO submitted_at (sin created_at)
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
      return NextResponse.json({ 
        error: 'Error al obtener respuestas'
      }, { status: 500 });
    }

    // Verificar si hay respuestas
    if (!responses || responses.length === 0) {
      return NextResponse.json({ 
        error: 'No hay respuestas para exportar'
      }, { status: 404 });
    }

    if (format === 'csv') {
      // Generar CSV
      const csvData = generateCSV(
        questions || [], 
        responses || [], 
        survey
      );

      // Crear nombre de archivo seguro
      const safeTitle = survey.title
        .replace(/[^\w\sáéíóúñÁÉÍÓÚÑ]/gi, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
      
      const fileName = `encuesta_${safeTitle}_${new Date().toISOString().split('T')[0]}.csv`;

      // Retornar como archivo descargable
      return new NextResponse(csvData, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`
        }
      });
    } else if (format === 'json') {
      // Preparar datos para JSON
      const exportData = {
        survey: {
          ...survey,
          total_questions: questions?.length || 0,
          total_responses: responses?.length || 0
        },
        questions: questions?.map(q => ({
          id: q.id,
          text: q.question_text,
          type: q.type,
          position: q.position,
          required: q.required
        })) || [],
        responses: responses?.map(r => ({
          id: r.id,
          submitted_at: r.submitted_at, // SOLO submitted_at
          respondent_token: r.respondent_token,
          meta: r.meta || {},
          answers: r.response_items?.map((ri: any) => ({
            question_id: ri.question_id,
            value_text: ri.value_text,
            value_numeric: ri.value_numeric,
            value_json: ri.value_json
          })) || []
        })) || [],
        metadata: {
          exported_at: new Date().toISOString(),
          total_responses: responses?.length || 0,
          total_questions: questions?.length || 0
        }
      };

      // Crear nombre de archivo
      const safeTitle = survey.title
        .replace(/[^\w\sáéíóúñÁÉÍÓÚÑ]/gi, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
      
      const fileName = `encuesta_${safeTitle}_${new Date().toISOString().split('T')[0]}.json`;

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`
        }
      });
    } else {
      return NextResponse.json({ 
        error: 'Formato no soportado' 
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
    'ID_Respuesta',
    'Fecha_Hora',
    'Token_Respuesta',
    'Tipo_Dispositivo',
    'Navegador',
    'Sistema_Operativo',
    ...questions.map((q, i) => `"P${i + 1}_${escapeCSV(q.question_text.substring(0, 50))}"`)
  ];

  // Crear filas
  const rows = responses.map((response: any) => {
    const meta = response.meta || {};
    const date = response.submitted_at; // SOLO submitted_at
    
    let formattedDate = 'Sin fecha';
    if (date) {
      try {
        formattedDate = new Date(date).toLocaleString('es-ES');
      } catch (e) {
        formattedDate = date;
      }
    }

    const row = [
      response.id,
      formattedDate,
      response.respondent_token || 'N/A',
      meta.is_mobile ? 'Móvil' : meta.is_tablet ? 'Tablet' : 'Desktop',
      meta.browser || 'Desconocido',
      meta.os || 'Desconocido'
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
          if (Array.isArray(item.value_json)) {
            value = item.value_json.join('; ');
          } else if (typeof item.value_json === 'object') {
            value = JSON.stringify(item.value_json);
          } else {
            value = String(item.value_json);
          }
        }
        
        row.push(`"${escapeCSV(value)}"`);
      }
    });

    return row.join(',');
  });

  // Agregar metadatos como comentarios al inicio
  const metadata = [
    `# Exportación de encuesta: ${survey.title}`,
    `# Descripción: ${survey.description || 'Sin descripción'}`,
    `# Fecha de exportación: ${new Date().toLocaleString('es-ES')}`,
    `# Total de respuestas: ${responses.length}`,
    `# Total de preguntas: ${questions.length}`,
    '',
    headers.join(','),
    ...rows
  ];

  return metadata.join('\n');
}

function escapeCSV(value: string): string {
  if (!value) return '';
  // Escapar comillas
  const escaped = String(value).replace(/"/g, '""');
  // Si contiene comas, saltos de línea o comillas, envolver en comillas
  if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('\r') || escaped.includes('"')) {
    return `"${escaped}"`;
  }
  return escaped;
}