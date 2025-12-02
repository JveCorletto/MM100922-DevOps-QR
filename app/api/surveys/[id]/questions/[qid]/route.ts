import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Tabla survey_questions:
 *  id, survey_id, type, question_text, required, options jsonb, order_index
 */

export async function PUT(req: Request, { params }: { params: { id: string; qid: string } }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { type, question_text, required, options } = body as {
    type?: "text" | "single" | "multiple" | "likert" | "checkbox";
    question_text?: string;
    required?: boolean;
    options?: { label: string; value?: string }[];
  };

  // Verifica que la pregunta pertenezca a la encuesta del usuario
  const { data: q, error: getErr } = await supabase
    .from("survey_questions")
    .select("id, survey_id")
    .eq("id", params.qid)
    .eq("survey_id", params.id)
    .single();

  if (getErr || !q) return NextResponse.json({ error: "Pregunta no encontrada" }, { status: 404 });

  const patch: any = {};
  if (typeof question_text === "string") patch.question_text = question_text.trim();
  if (typeof type === "string") patch.type = type;
  if (typeof required === "boolean") patch.required = required;
  if (Array.isArray(options)) patch.options = options.map(o => ({ label: o.label, value: o.value ?? o.label }));

  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

  const { error } = await supabase
    .from("survey_questions")
    .update(patch)
    .eq("id", params.qid);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string; qid: string } }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  // seguridad: exige que haga match con survey_id
  const { error } = await supabase
    .from("survey_questions")
    .delete()
    .eq("id", params.qid)
    .eq("survey_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}