import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { Actions, CopyLink } from "@/components/SurveyActions";

type Survey = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "closed";
  slug: string | null;
  created_at: string;
  updated_at: string;
};

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default async function SurveysPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: surveys, error } = await supabase
    .from("surveys")
    .select("id, title, description, status, slug, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="container">
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>Mis encuestas</h1>
          <Link href="/surveys/new" className="btn primary">Nueva encuesta</Link>
        </div>
        <div className="card" style={{ marginTop: ".8rem" }}>
          <p>No fue posible cargar tus encuestas: {error.message}</p>
        </div>
      </main>
    );
  }

  const list = (surveys ?? []) as Survey[];

  return (
    <main className="container">
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Mis encuestas</h1>
        <Link href="/surveys/new" className="btn primary">Nueva encuesta</Link>
      </div>

      {list.length === 0 ? (
        <div className="card" style={{ marginTop: ".8rem" }}>
          <p>Aún no tienes encuestas.</p>
          <Link href="/surveys/new" className="btn">Crear la primera</Link>
        </div>
      ) : (
        <div className="card" style={{ marginTop: ".8rem" }}>
          <ul className="grid" style={{ gap: ".6rem", listStyle: "none", padding: 0, margin: 0 }}>
            {list.map((s) => (
              <li key={s.id} className="card" style={{ padding: "0.8rem" }}>
                <div className="flex items-center" style={{ justifyContent: "space-between", gap: ".75rem", flexWrap: "wrap" }}>
                  <div>
                    <div className="flex items-center" style={{ gap: ".5rem", flexWrap: "wrap" }}>
                      <strong>{s.title}</strong>
                      {s.status === "published" && <span className="badge">Publicado</span>}
                      {s.status === "draft" && <span className="badge" style={{ background: "rgba(125,117,116,.12)" }}>Borrador</span>}
                      {s.status === "closed" && <span className="badge" style={{ background: "#d73a49", color: "#fff" }}>Cerrado</span>}
                    </div>
                    {s.description ? <p style={{ margin: ".25rem 0 0 0" }}>{s.description}</p> : null}
                    <small style={{ opacity: .8 }}>Creada: {fmtDate(s.created_at)}</small>
                  </div>

                  <div className="flex items-center" style={{ gap: ".5rem", flexWrap: "wrap" }}>
                    <Link href={`/surveys/${s.id}/edit`} className="btn outline">Editar</Link>

                    {/* Acciones de estado */}
                    <Actions id={s.id} status={s.status} slug={s.slug} />

                    {/* Ver/Copiar cuando está publicada */}
                    {s.status === "published" && s.slug ? (
                      <>
                        <Link href={`/s/${s.slug}`} className="btn" target="_blank">Ver pública</Link>
                        <CopyLink slug={s.slug} />
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