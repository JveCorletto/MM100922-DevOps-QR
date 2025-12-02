import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 70);
}

export async function POST(req: Request) {
  const supabase = supabaseServer();

  // 1) Usuario
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2) Body
  let body: { title?: string; description?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const title = (body.title ?? "").trim();
  const description = (body.description ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "El título es requerido" }, { status: 422 });
  }

  // 3) Slug único
  const base = slugify(title) || "encuesta";
  let slug = base;
  for (let i = 1; i <= 5; i++) {
    const { data: exists } = await supabase.from("surveys").select("id").eq("slug", slug).limit(1).maybeSingle();
    if (!exists) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // 4) Insert
  const { data, error } = await supabase
    .from("surveys")
    .insert({
      owner_id: user.id,
      title,
      description: description || null,
      slug,
      status: "draft",
    })
    .select("id, slug")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id, slug: data.slug }, { status: 201 });
}