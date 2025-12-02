import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function slugify(s: string) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
    .slice(0, 70);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "").toLowerCase(); // publish | close | reopen

  // Traer encuesta
  const { data: survey, error: getErr } = await supabase
    .from("surveys")
    .select("id, title, status, slug, owner_id")
    .eq("id", params.id)
    .single();

  if (getErr || !survey) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });

  if (survey.owner_id !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (action === "close") {
    const { error } = await supabase
      .from("surveys")
      .update({ status: "closed" })
      .eq("id", params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ status: "closed", slug: survey.slug });
  }

  if (action === "publish" || action === "reopen") {
    // generar slug si no existe
    let slug = survey.slug;
    if (!slug) {
      const base = slugify(survey.title) || "encuesta";
      slug = base;
      for (let i = 0; i < 5; i++) {
        const { data: exists } = await supabase
          .from("surveys").select("id").eq("slug", slug).maybeSingle();
        if (!exists) break;
        slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      }
    }

    const { error } = await supabase
      .from("surveys")
      .update({ status: "published", slug })
      .eq("id", params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ status: "published", slug });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 422 });
}