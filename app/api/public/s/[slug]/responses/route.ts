import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Answer = { questionId: string; value: unknown };

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const supabase = supabaseServer();
  const body = await req.json().catch(() => ({}));
  const answers = (body?.answers ?? []) as Answer[];

  const respondentToken = typeof body?.respondentToken === "string" ? body.respondentToken : "";
  const respondentFp = typeof body?.respondentFp === "string" ? body.respondentFp : "";

  // usuario (si hay sesión)
  const { data: { user } } = await supabase.auth.getUser();

  // encuesta
  const { data: survey, error: sErr } = await supabase
    .from("surveys")
    .select("id, status, single_response, single_response_scope")
    .eq("slug", params.slug)
    .single();

  if (sErr || !survey) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });
  if (survey.status !== "published") return NextResponse.json({ error: "Encuesta no disponible" }, { status: 410 });

  // validación “una sola respuesta”
  if (survey.single_response) {
    if (survey.single_response_scope === "user") {
      if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });

      const { data: exists } = await supabase
        .from("responses")
        .select("id")
        .eq("survey_id", survey.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (exists) return NextResponse.json({ error: "already_answered" }, { status: 409 });
    } else {
      // device: al menos uno de los campos debe estar presente para la validación
      if (!respondentToken && !respondentFp) {
        return NextResponse.json({ 
          error: "Se requiere token o fingerprint del dispositivo para respuestas únicas por dispositivo" 
        }, { status: 400 });
      }

      // Buscar por token o fingerprint (como en /my-status)
      let already = false;
      
      if (respondentToken) {
        const { data: existsToken } = await supabase
          .from("responses")
          .select("id")
          .eq("survey_id", survey.id)
          .eq("respondent_token", respondentToken)
          .maybeSingle();
        if (existsToken) already = true;
      }
      
      if (!already && respondentFp) {
        const { data: existsFp } = await supabase
          .from("responses")
          .select("id")
          .eq("survey_id", survey.id)
          .eq("respondent_fp", respondentFp)
          .maybeSingle();
        if (existsFp) already = true;
      }
      
      if (already) return NextResponse.json({ error: "already_answered" }, { status: 409 });
    }
  }

  // crear response
  const { data: resp, error: rErr } = await supabase
    .from("responses")
    .insert({
      survey_id: survey.id,
      respondent_token: respondentToken || null,
      respondent_fp: respondentFp || null,
      user_id: user?.id || null,
    })
    .select("id")
    .single();

  // Manejar el error de constraint de unicidad por dispositivo
  if (rErr) {
    if (rErr.code === "23505" && rErr.message?.includes("uniq_resp_by_device")) {
      return NextResponse.json({ error: "already_answered" }, { status: 409 });
    }
    return NextResponse.json({ error: rErr.message }, { status: 400 });
  }

  // items (guardamos siempre en value_json)
  const rows = answers
    .filter((a) => a && a.questionId)
    .map((a) => ({
      response_id: resp.id,
      question_id: a.questionId,
      value_json: a.value ?? null,
    }));

  if (rows.length) {
    const { error: iErr } = await supabase.from("response_items").insert(rows);
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}