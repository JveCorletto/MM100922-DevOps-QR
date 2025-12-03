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

  if (error || !survey) {
    notFound();
  }

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
        
        {/* Indicador de estado (solo desarrollo) */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            marginTop: "0.5rem", 
            padding: "0.25rem 0.5rem", 
            background: "#e8f5e9", 
            borderRadius: "4px",
            fontSize: "0.8rem",
            display: "inline-block"
          }}>
            🔍 <strong>Debug:</strong> ID: {survey.id.substring(0, 8)}...
          </div>
        )}
      </section>

      {/* formulario público */}
      <PublicSurvey slug={params.slug} />
    </main>
  );
}