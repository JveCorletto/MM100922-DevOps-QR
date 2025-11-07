import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const { data, error } = await supabase
    .from("survey_questions")
    .select("id, type, question_text, required, order_index, options")
    .eq("survey_id", params.id)
    .order("order_index", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Normalizamos para el front
  const norm = (data ?? []).map(q => ({
    id: q.id,
    type: q.type as "text" | "single" | "multiple" | "likert" | "checkbox",
    question_text: q.question_text as string,
    required: !!q.required,
    order_index: (q.order_index ?? 0) as number,
    options: Array.isArray(q.options) ? q.options : [],
  }));

  return NextResponse.json(norm);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { type, title, required, options } = body as {
    type: "text" | "single" | "multiple" | "likert" | "checkbox";
    title: string;
    required?: boolean;
    options?: { label: string; value?: string }[]; // se guarda como jsonb
  };

  if (!title?.trim()) return NextResponse.json({ error: "Título requerido" }, { status: 422 });

  // calcular order_index = max + 1
  const { data: maxRow } = await supabase
    .from("survey_questions")
    .select("order_index")
    .eq("survey_id", params.id)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextIndex = (maxRow?.order_index ?? 0) + 1;

  const { data, error } = await supabase
    .from("survey_questions")
    .insert({
      survey_id: params.id,
      type,
      question_text: title.trim(),
      required: !!required,
      options: options?.length ? options.map(o => ({ label: o.label, value: o.value ?? o.label })) : [],
      order_index: nextIndex,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ id: data.id }, { status: 201 });
}