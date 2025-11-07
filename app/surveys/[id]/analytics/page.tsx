export default function AnalyticsPage({ params }: { params: { id: string }}) {
  return (
    <main className="container card">
      <h1>Analítica</h1>
      <p>Gráficos básicos por pregunta y totales. Exportación a CSV.</p>
    </main>
  );
}
