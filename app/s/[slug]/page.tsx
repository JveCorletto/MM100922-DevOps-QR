import PublicSurvey from "./public-client";
import { supabaseServer } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";

export default async function PublicSurveyPage({ params }: { params: { slug: string } }) {
  const supabase = supabaseServer();

  const { data: survey, error } = await supabase
    .from("surveys")
    .select("id, title, description, status, slug")
    .eq("slug", params.slug)
    .single();

  if (error || !survey) notFound();
  if (survey.status !== "published") {
    return (
      <main className="container card">
        <h1>Encuesta no disponible</h1>
        <p>Esta encuesta no está publicada.</p>
      </main>
    );
  }

  return (
    <main className="container section">
      <section className="card">
        <h1 className="text-2xl md:text-3xl font-semibold" style={{ margin: 0, lineHeight: 1.2 }}>
          {survey.title}
        </h1>
        {survey.description ? (
          <p style={{ marginTop: ".5rem" }}>{survey.description}</p>
        ) : null}
      </section>

      {/* formulario público */}
      <PublicSurvey slug={params.slug} />
    </main>
  );
}