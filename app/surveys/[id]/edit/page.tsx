"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import QRCode from "qrcode";
import SurveyFormBuilder from "@/components/SurveyFormBuilder";

type Survey = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "closed";
  slug: string | null;
  single_response: boolean;
  single_response_scope: "device" | "user";
};

type QOption = { label: string; value?: string };
type Question = {
  id?: string;
  type: "text" | "single" | "multiple" | "likert" | "checkbox";
  title: string;
  required: boolean;
  order_index?: number;
  options: QOption[];
};

function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Enlace copiado");
  } catch {
    toast.error("No se pudo copiar");
  }
}

export default function EditSurveyPage() {
  const router = useRouter();
  const { id: surveyId } = useParams<{ id: string }>();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [qr, setQr] = useState<string>("");

  const [qs, setQs] = useState<Question[]>([]);
  const [newQ, setNewQ] = useState<Question>({
    type: "text",
    title: "",
    required: false,
    options: [],
  });

  // Cargar encuesta y preguntas
  useEffect(() => {
    (async () => {
      const r1 = await fetch(`/api/surveys/${surveyId}`);
      if (!r1.ok) {
        router.replace("/surveys");
        return;
      }
      const s = (await r1.json()) as Survey;
      // Defaults por si el backend aún no devuelve estos campos:
      s.single_response = typeof s.single_response === "boolean" ? s.single_response : false;
      s.single_response_scope =
        (s.single_response_scope as Survey["single_response_scope"]) || "device";
      setSurvey(s);

      const r2 = await fetch(`/api/surveys/${surveyId}/questions`);
      if (r2.ok) setQs(await r2.json());
    })();
  }, [router, surveyId]);

  // Generar QR cuando haya slug
  useEffect(() => {
    (async () => {
      if (!survey?.slug) {
        setQr("");
        return;
      }
      const publicUrl = `${location.origin}/s/${survey.slug}`;
      setQr(await QRCode.toDataURL(publicUrl, { margin: 2, scale: 4 }));
    })();
  }, [survey?.slug]);

  // Guardar datos de encuesta (incluye configuración de una sola respuesta)
  const onSurveySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey?.title.trim()) return toast.error("Título requerido");
    setSaving(true);
    const r = await fetch(`/api/surveys/${surveyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: survey.title.trim(),
        description: survey.description ?? "",
        single_response: survey.single_response,
        single_response_scope: survey.single_response_scope,
      }),
    });
    setSaving(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return toast.error(j.error || "No se pudo guardar");
    }
    toast.success("Encuesta actualizada");
  };

  const onPublish = async () => {
    setPublishing(true);
    const r = await fetch(`/api/surveys/${surveyId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish" }),
    });
    setPublishing(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return toast.error(j.error || "No se pudo publicar");
    }
    const { slug } = await r.json();
    toast.success("Encuesta publicada");
    setSurvey((s) => (s ? { ...s, status: "published", slug } : s));
  };

  // Nueva pregunta
  const canHaveOptions = useMemo(() => newQ.type !== "text", [newQ.type]);

  const addOption = () =>
    setNewQ((q) => ({
      ...q,
      options: [...q.options, { label: `Opción ${q.options.length + 1}` }],
    }));
  const removeOption = (i: number) =>
    setNewQ((q) => ({ ...q, options: q.options.filter((_, idx) => idx !== i) }));

  const onAddQuestion = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newQ.title.trim()) return toast.error("La pregunta necesita un enunciado");

  const payload = {
    type: newQ.type,
    title: newQ.title.trim(),
    required: newQ.required,
    options: canHaveOptions ? newQ.options : [],
  };

  const r = await fetch(`/api/surveys/${surveyId}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    return toast.error(j.error || "No se pudo agregar");
  }

  // Recargar lista de preguntas
  const qRes = await fetch(`/api/surveys/${surveyId}/questions`);
  if (qRes.ok) setQs(await qRes.json());
  
  toast.success("Pregunta agregada");
  setNewQ({ type: "text", title: "", required: false, options: [] });
};

  if (!survey) {
    return (
      <main className="container section">
        <div className="card">
          <p>Cargando…</p>
        </div>
      </main>
    );
  }

  const publicUrl = survey.slug ? `${location.origin}/s/${survey.slug}` : "";

  return (
    <main className="container section">
      <div className="grid two">
        {/* Datos básicos + Configuración de respuestas */}
        <section className="card">
          <h1 style={{ marginTop: 0 }}>Editor de Encuesta</h1>

          <form onSubmit={onSurveySave} className="grid" style={{ gap: ".75rem" }}>
            <div>
              <label>Título</label>
              <input
                value={survey.title}
                onChange={(e) => setSurvey((s) => (s ? { ...s, title: e.target.value } : s))}
                required
              />
            </div>

            <div>
              <label>Descripción</label>
              <textarea
                rows={3}
                value={survey.description ?? ""}
                onChange={(e) =>
                  setSurvey((s) => (s ? { ...s, description: e.target.value } : s))
                }
              />
            </div>

            {/* Config: Una sola respuesta */}
            <div className="grid grid-2">
              <div>
                <label>Una sola respuesta</label>
                <select
                  value={String(survey.single_response)}
                  onChange={(e) =>
                    setSurvey((s) =>
                      s ? { ...s, single_response: e.target.value === "true" } : s
                    )
                  }
                >
                  <option value="false">No</option>
                  <option value="true">Sí</option>
                </select>
              </div>

              <div>
                <label>Alcance</label>
                <select
                  value={survey.single_response_scope}
                  onChange={(e) =>
                    setSurvey((s) =>
                      s
                        ? {
                          ...s,
                          single_response_scope: e.target
                            .value as Survey["single_response_scope"],
                        }
                        : s
                    )
                  }
                  disabled={!survey.single_response}
                  title={!survey.single_response ? "Activa 'Una sola respuesta' primero" : undefined}
                >
                  <option value="device">Por dispositivo (token + huella)</option>
                  <option value="user">Por usuario autenticado</option>
                </select>
              </div>
            </div>

            <div className="stack">
              <button className="btn primary" type="submit" disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </button>
              <button
                className="btn"
                type="button"
                onClick={onPublish}
                disabled={publishing || survey.status === "published"}
              >
                {survey.status === "published"
                  ? "Publicado"
                  : publishing
                    ? "Publicando…"
                    : "Publicar"}
              </button>
            </div>
          </form>
        </section>

        {/* QR / Enlace */}
        <section className="card">
          <h2 style={{ marginTop: 0 }}>QR & Enlace público</h2>
          {survey.slug ? (
            <>
              <p>URL pública:</p>
              <code style={{ wordBreak: "break-all" }}>{publicUrl}</code>
              <div className="stack" style={{ marginTop: ".8rem" }}>
                <button className="btn outline" onClick={() => copyToClipboard(publicUrl)}>
                  Copiar enlace
                </button>
                {qr && (
                  <button
                    className="btn"
                    onClick={() => downloadDataUrl(`qr-${survey.slug}.png`, qr)}
                  >
                    Descargar QR
                  </button>
                )}
              </div>
              <div style={{ marginTop: "1rem" }}>
                {qr ? (
                  <img src={qr} alt="QR" style={{ width: 200, height: 200 }} />
                ) : (
                  <p>Generando QR…</p>
                )}
              </div>
            </>
          ) : (
            <p>
              Publica la encuesta para generar un <code>slug</code> y mostrar el QR.
            </p>
          )}
        </section>
      </div>

      <SurveyFormBuilder surveyId={surveyId as string} />
    </main>
  );
}