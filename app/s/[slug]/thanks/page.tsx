// app/s/[slug]/thanks/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { ShareButtons } from "./share-client";

export const metadata = { robots: { index: false, follow: false } };

export default async function ThanksPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { already?: string };
}) {
  const supabase = supabaseServer();
  const { data: survey } = await supabase
    .from("surveys")
    .select("title, status, slug")
    .eq("slug", params.slug)
    .single();

  if (!survey || survey.slug !== params.slug) notFound();

  const already = (searchParams?.already ?? "") === "1";
  const publicUrl = `/s/${survey.slug}`;

  return (
    <main className="container section">
      <section className="card" style={{ textAlign: "center" }}>
        <h1 style={{ marginTop: 0 }}>
          {already ? "Ya habías respondido" : "¡Gracias por responder! 🎉"}
        </h1>

        {survey?.title ? (
          <p>
            {already ? (
              <>
                Registramos una respuesta previa para <strong>{survey.title}</strong> desde este
                dispositivo/navegador.
              </>
            ) : (
              <>
                Tu respuesta para <strong>{survey.title}</strong> se registró con éxito.
              </>
            )}
          </p>
        ) : null}

        <div
          className="flex items-center"
          style={{ gap: ".5rem", justifyContent: "center", marginTop: ".75rem", flexWrap: "wrap" }}
        >
          {!already && (
            <Link href={publicUrl} className="btn">
              Responder de nuevo
            </Link>
          )}
          <Link href="/" className="btn outline">
            Ir al inicio
          </Link>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <ShareButtons slug={params.slug} />
        </div>
      </section>
    </main>
  );
}