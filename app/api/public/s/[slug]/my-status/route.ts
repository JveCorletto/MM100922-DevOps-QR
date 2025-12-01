import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const supabase = supabaseServer();
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const fp = url.searchParams.get("fp") ?? "";

  // usuario (si hay sesión)
  const { data: { user } } = await supabase.auth.getUser();

  // encuesta
  const { data: survey, error } = await supabase
    .from("surveys")
    .select("id, status, single_response, single_response_scope")
    .eq("slug", params.slug)
    .single();

  if (error || !survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }
  
  if (survey.status !== "published") {
    return NextResponse.json({ error: "Survey not available" }, { status: 410 });
  }

  let already = false;
  let requiresTokenOrFp = false;

  if (survey.single_response) {
    if (survey.single_response_scope === "user") {
      if (user) {
        const { data } = await supabase
          .from("responses")
          .select("id")
          .eq("survey_id", survey.id)
          .eq("user_id", user.id)
          .maybeSingle();
        already = Boolean(data);
      }
    } else {
      // device: validar que al menos uno esté presente
      if (!token && !fp) {
        requiresTokenOrFp = true;
      } else {
        // Buscar por token o fingerprint
        if (token) {
          const { data } = await supabase
            .from("responses")
            .select("id")
            .eq("survey_id", survey.id)
            .eq("respondent_token", token)
            .maybeSingle();
          if (data) already = true;
        }
        if (!already && fp) {
          const { data } = await supabase
            .from("responses")
            .select("id")
            .eq("survey_id", survey.id)
            .eq("respondent_fp", fp)
            .maybeSingle();
          if (data) already = true;
        }
      }
    }
  }

  return NextResponse.json({
    singleResponse: survey.single_response,
    scope: survey.single_response_scope, // 'device' | 'user'
    alreadyResponded: already,
    requiresLogin: survey.single_response && survey.single_response_scope === "user" && !user,
    requiresTokenOrFp: requiresTokenOrFp,
    message: requiresTokenOrFp ? 
      "Se requiere token o fingerprint del dispositivo para verificar respuestas únicas" : 
      undefined
  });
}