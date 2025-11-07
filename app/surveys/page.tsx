// app/surveys/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

type Survey = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  slug: string | null;
  created_at: string;
  updated_at: string;
};

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default async function SurveysPage() {
  const supabase = supabaseServer();

  // Guard de sesión
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Traer encuestas del usuario (RLS aplica de todas formas)
  const { data: surveys, error } = await supabase
    .from("surveys")
    .select("id, title, description, status, slug, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    // fallback simple en caso de error
    return (
      <main className="container">
        <div className="card" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h1 style={{margin:0}}>Mis encuestas</h1>
          <Link href="/surveys/new" className="btn primary">Nueva encuesta</Link>
        </div>
        <div className="card" style={{marginTop:".8rem"}}>
          <p>No fue posible cargar tus encuestas: {error.message}</p>
        </div>
      </main>
    );
  }

  const list = (surveys ?? []) as Survey[];

  return (
    <main className="container">
      <div className="card" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h1 style={{margin:0}}>Mis encuestas</h1>
        <Link href="/surveys/new" className="btn primary">Nueva encuesta</Link>
      </div>

      {list.length === 0 ? (
        <div className="card" style={{marginTop:".8rem"}}>
          <p>Aún no tienes encuestas.</p>
          <Link href="/surveys/new" className="btn">Crear la primera</Link>
        </div>
      ) : (
        <div className="card" style={{marginTop:".8rem"}}>
          <ul className="grid" style={{gap:".6rem", listStyle:"none", padding:0, margin:0}}>
            {list.map(s => (
              <li key={s.id} className="card" style={{padding:"0.8rem"}}>
                <div className="flex items-center" style={{justifyContent:"space-between", gap:".75rem", flexWrap:"wrap"}}>
                  <div>
                    <div className="flex items-center" style={{gap:".5rem", flexWrap:"wrap"}}>
                      <strong>{s.title}</strong>
                      {s.status === "published" ? (
                        <span className="badge">Publicado</span>
                      ) : (
                        <span className="badge" style={{background:"rgba(125,117,116,.12)"}}>Borrador</span>
                      )}
                    </div>
                    {s.description ? <p style={{margin:".25rem 0 0 0"}}>{s.description}</p> : null}
                    <small style={{opacity:.8}}>Creada: {fmtDate(s.created_at)}</small>
                  </div>

                  <div className="flex items-center" style={{gap:".5rem", flexWrap:"wrap"}}>
                    <Link href={`/surveys/${s.id}/edit`} className="btn outline">Editar</Link>

                    {s.status === "published" && s.slug ? (
                      <>
                        <Link href={`/s/${s.slug}`} className="btn" target="_blank">
                          Ver pública
                        </Link>
                        {/* Botón copiar enlace */}
                        <button
                          className="btn outline"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}`.trim()
                                ? `${process.env.NEXT_PUBLIC_SITE_URL}/s/${s.slug}`
                                : `${typeof location !== "undefined" ? location.origin : ""}/s/${s.slug}`);
                              // @ts-ignore toast global si lo tienes en layout
                              window?.toast?.success?.("Enlace copiado") ?? console.log("Enlace copiado");
                            } catch {
                              // @ts-ignore
                              window?.toast?.error?.("No se pudo copiar") ?? console.error("No se pudo copiar");
                            }
                          }}
                        >
                          Copiar enlace
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}