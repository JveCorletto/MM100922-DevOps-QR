export default async function PublicSurveyPage({ params }: { params: { slug: string }}) {
  return (
    <main className="container card">
      <h1>Encuesta pública</h1>
      <p>Slug: {params.slug}</p>
      <p>Renderiza aquí el formulario de preguntas públicas y envía respuestas anónimas.</p>
    </main>
  );
}
