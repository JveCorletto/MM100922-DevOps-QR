import Link from "next/link";

export default function Home(){
  return (
    <main className="container section">
      <div className="grid grid-auto">
        <section className="card">
          <h1 style={{marginTop:0, fontSize:"var(--fs-3)"}}>Sistema de Encuestas con QR</h1>
          <p>Diseñado mobile-first: crea encuestas, publícalas con QR o enlace, y analiza resultados.</p>
          <div className="stack">
            <Link href="/surveys" className="btn primary">Ir a mis encuestas</Link>
            <Link href="/auth/login" className="btn outline">Ingresar</Link>
          </div>
        </section>
        <section className="card">
          <h2 style={{marginTop:0, fontSize:"var(--fs-2)"}}>Estado del sistema</h2>
          <p>Usa <code>/status</code> para verificación post-deploy.</p>
          <span className="badge">99.5% objetivo</span>
        </section>
      </div>
    </main>
  );
}