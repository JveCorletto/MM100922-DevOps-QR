import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from '@supabase/supabase-js';

type Answer = { questionId: string; value: unknown };

// Helper para crear cliente con token JWT si existe
const getSupabaseWithAuth = async (req: Request) => {
  const authHeader = req.headers.get('authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      // Crear cliente con el token del usuario
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: { Authorization: `Bearer ${token}` }
          },
          auth: { persistSession: false }
        }
      );
      
      // Verificar si el token es válido
      const { data: { user }, error } = await userClient.auth.getUser();
      
      if (error) {
        return { supabase: supabaseAdmin(), user: null };
      }
      
      return { supabase: userClient, user };
      
    } catch (error) {
      return { supabase: supabaseAdmin(), user: null };
    }
  }
  
  return { supabase: supabaseAdmin(), user: null };
};

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    // 1. Obtener cliente Supabase (con o sin autenticación)
    const { supabase, user } = await getSupabaseWithAuth(req);
    
    // 2. Parsear request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json({ 
        error: "invalid_json",
        message: "Formato JSON inválido"
      }, { status: 400 });
    }

    const answers = (body?.answers ?? []) as Answer[];
    const respondentToken = typeof body?.respondentToken === "string" ? body.respondentToken : "";
    const respondentFp = typeof body?.respondentFp === "string" ? body.respondentFp : "";

    // 3. Buscar encuesta publicada
    const { data: survey, error: surveyError } = await supabase
      .from("surveys")
      .select("id, title, status, single_response, single_response_scope, slug")
      .eq("slug", params.slug)
      .eq("status", "published")
      .single();

    if (surveyError) {
      return NextResponse.json({ 
        error: "survey_not_found",
        message: "Encuesta no encontrada o no publicada"
      }, { status: 404 });
    }

    if (!survey) {
      return NextResponse.json({ 
        error: "survey_not_found",
        message: "Encuesta no disponible"
      }, { status: 404 });
    }

    // 4. Validación de respuesta única
    if (survey.single_response) {
      if (survey.single_response_scope === "user") {
        if (!user) {
          return NextResponse.json({ 
            error: "login_required",
            message: "Esta encuesta requiere que inicies sesión",
            requiresLogin: true
          }, { status: 401 });
        }

        const { data: existingResponse, error: checkError } = await supabase
          .from("responses")
          .select("id, submitted_at")
          .eq("survey_id", survey.id)
          .eq("user_id", user.id)
          .maybeSingle();
          

        if (existingResponse) {
          return NextResponse.json({ 
            error: "already_answered",
            message: "Ya has respondido esta encuesta",
            responseId: existingResponse.id
          }, { status: 409 });
        }
      } else {
        // Validación por dispositivo
        if (!respondentToken && !respondentFp) {
          return NextResponse.json({ 
            error: "device_identifier_required",
            message: "Se requiere identificador del dispositivo para respuestas únicas"
          }, { status: 400 });
        }

        let alreadyResponded = false;
        let foundBy = null;
        
        if (respondentToken) {
          const { data: existingByToken } = await supabase
            .from("responses")
            .select("id")
            .eq("survey_id", survey.id)
            .eq("respondent_token", respondentToken)
            .maybeSingle();
          if (existingByToken) {
            alreadyResponded = true;
            foundBy = "token";
          }
        }
        
        if (!alreadyResponded && respondentFp) {
          const { data: existingByFp } = await supabase
            .from("responses")
            .select("id")
            .eq("survey_id", survey.id)
            .eq("respondent_fp", respondentFp)
            .maybeSingle();
          if (existingByFp) {
            alreadyResponded = true;
            foundBy = "fingerprint";
          }
        }
        
        if (alreadyResponded) {
          return NextResponse.json({ 
            error: "already_answered",
            message: "Ya has respondido esta encuesta desde este dispositivo"
          }, { status: 409 });
        }
      }
    }

    // 5. Preparar datos para inserción
    const responseData: any = {
      survey_id: survey.id,
      respondent_token: respondentToken || null,
      respondent_fp: respondentFp || null,
      user_id: user?.id || null, // null si es anónimo
      submitted_at: new Date().toISOString()
    };
    
    // 6. Insertar respuesta principal
    const { data: newResponse, error: insertError } = await supabase
      .from("responses")
      .insert(responseData)
      .select("id, submitted_at, user_id, respondent_token, respondent_fp")
      .single();

    if (insertError) {
      // Manejo específico de errores
      if (insertError.code === "23505") {
        const constraintMatch = insertError.message?.match(/constraint "([^"]+)"/);
        if (constraintMatch) {
          console.error("   Constraint violada:", constraintMatch[1]);
        }
        return NextResponse.json({ 
          error: "already_answered",
          message: "Ya has respondido esta encuesta"
        }, { status: 409 });
      }

      if (insertError.code === "23502") {
        return NextResponse.json({ 
          error: "missing_required_field",
          message: "Falta un campo requerido en la base de datos"
        }, { status: 400 });
      }

      if (insertError.message?.includes("row-level security")) {
        return NextResponse.json({ 
          error: "permission_denied",
          message: "Error de permisos. Contacta al administrador."
        }, { status: 403 });
      }

      return NextResponse.json({ 
        error: "database_error",
        message: "Error al guardar la respuesta",
        details: insertError.message
      }, { status: 500 });
    }

    // 7. Insertar items de respuesta
    if (answers.length > 0) {
      const validAnswers = answers.filter(a => a && a.questionId && a.value !== undefined);
      const invalidAnswers = answers.length - validAnswers.length;
      
      const responseItems = validAnswers.map((a, index) => ({
        response_id: newResponse.id,
        question_id: a.questionId,
        value_json: a.value
      }));

      if (responseItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("response_items")
          .insert(responseItems);

        if (itemsError) {
          // Rollback: eliminar la respuesta principal
          try {
            await supabase.from("responses").delete().eq("id", newResponse.id);
          } catch (rollbackError) {
            console.error("❌ Error en rollback:", rollbackError);
          }
          
          return NextResponse.json({ 
            error: "items_error",
            message: "Error al guardar las respuestas individuales"
          }, { status: 500 });
        }
        
        console.log(`✅ ${responseItems.length} items insertados exitosamente`);
      }
    }

    // 8. Respuesta exitosa
    return NextResponse.json({ 
      success: true,
      message: "¡Respuesta enviada correctamente!",
      data: {
        responseId: newResponse.id,
        surveyId: survey.id,
        surveyTitle: survey.title,
        submittedAt: newResponse.submitted_at,
        totalAnswers: answers.length,
        isAnonymous: !user
      }
    });

  } catch (error) {
    return NextResponse.json({ 
      error: "server_error",
      message: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 });
  }
}

// Métodos adicionales para completitud
export async function GET() {
  return NextResponse.json({ 
    error: "method_not_allowed",
    message: "Método GET no permitido. Usa POST para enviar respuestas."
  }, { status: 405 });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info',
    },
  });
}