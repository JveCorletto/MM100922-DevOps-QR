import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function slugify(s: string) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
    .slice(0, 70);
}

export async function POST(_: Request, { params }: { params: { id: string }}) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  // leer encuesta
  const { data: survey, error: getErr } = await supabase
    .from("surveys").select("id, title").eq("id", params.id).single();
  if (getErr) return NextResponse.json({ error: getErr.message }, { status: 404 });

  // generar slug único
  const base = slugify(survey.title) || "encuesta";
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const { data: exists } = await supabase.from("surveys")
      .select("id").eq("slug", slug).maybeSingle();
    if (!exists) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const { error } = await supabase
    .from("surveys")
    .update({ status: "published", slug })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ slug });
}
