import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(_req: Request, { params }: { params: { slug: string } } ) {
  const supabase = supabaseServer();

  // Encuesta por slug y solo si está publicada
  const { data: survey, error: sErr } = await supabase
    .from("surveys")
    .select("id, title, description, status, slug")
    .eq("slug", params.slug)
    .single();

  if (sErr || !survey) {
    return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });
  }
  if (survey.status !== "published") {
    return NextResponse.json({ error: "Encuesta no disponible" }, { status: 410 });
  }

  // Preguntas (según tu esquema)
  const { data: questions, error: qErr } = await supabase
    .from("survey_questions")
    .select("id, type, question_text, required, order_index, options")
    .eq("survey_id", survey.id)
    .order("order_index", { ascending: true });

  if (qErr) {
    return NextResponse.json({ error: qErr.message }, { status: 400 });
  }

  // Normaliza opciones (jsonb -> array)
  const qs = (questions ?? []).map((q) => ({
    ...q,
    options: Array.isArray(q.options) ? q.options : [],
  }));

  return NextResponse.json({ survey, questions: qs });
}