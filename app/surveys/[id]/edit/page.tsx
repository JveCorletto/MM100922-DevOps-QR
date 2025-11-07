"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import QRCode from "qrcode";

type Survey = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  slug: string | null;
};

type QOption = { label: string; value?: string };
type Question = {
  id?: string;
  type: "text" | "single" | "multiple" | "likert" | "checkbox";
  question_text: string;
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
  try { await navigator.clipboard.writeText(text); toast.success("Enlace copiado"); }
  catch { toast.error("No se pudo copiar"); }
}

export default function EditSurveyPage() {
  const router = useRouter();
  const { id: surveyId } = useParams<{ id: string }>();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [saving, setSaving] = useState(false);
  const [qs, setQs] = useState<Question[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [qr, setQr] = useState<string>("");

  // Cargar encuesta y preguntas
  useEffect(() => {
    (async () => {
      const r1 = await fetch(`/api/surveys/${surveyId}`);
      if (!r1.ok) { router.replace("/surveys"); return; }
      const s = (await r1.json()) as Survey;
      setSurvey(s);

      const r2 = await fetch(`/api/surveys/${surveyId}/questions`);
      if (r2.ok) setQs(await r2.json());
    })();
  }, [router, surveyId]);

  // Generar QR
  useEffect(() => {
    (async () => {
      if (!survey?.slug) { setQr(""); return; }
      const publicUrl = `${location.origin}/s/${survey.slug}`;
      setQr(await QRCode.toDataURL(publicUrl, { margin: 2, scale: 4 }));
    })();
  }, [survey?.slug]);

  // Guardar datos básicos
  const onSurveySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey?.title.trim()) return toast.error("Título requerido");
    setSaving(true);
    const r = await fetch(`/api/surveys/${surveyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: survey.title.trim(), description: survey.description ?? "" }),
    });
    setSaving(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return toast.error(j.error || "No se pudo guardar");
    }
    toast.success("Encuesta actualizada");
  };

  // Form para nueva pregunta (según tu esquema)
  const [newQ, setNewQ] = useState<Question>({
    type: "text",
    question_text: "",
    required: false,
    options: [],
  });

  const canHaveOptions = useMemo(() => newQ.type !== "text", [newQ.type]);

  const addOption = () => {
    setNewQ(q => ({ ...q, options: [...q.options, { label: `Opción ${q.options.length + 1}` }] }));
  };
  const removeOption = (i: number) => {
    setNewQ(q => ({ ...q, options: q.options.filter((_, idx) => idx !== i) }));
  };

  const onAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQ.question_text.trim()) return toast.error("La pregunta necesita un enunciado");

    const payload = {
      type: newQ.type,
      title: newQ.question_text.trim(), // el API lo mapea a question_text
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

    // recargar lista
    const qRes = await fetch(`/api/surveys/${surveyId}/questions`);
    if (qRes.ok) setQs(await qRes.json());
    toast.success("Pregunta agregada");
    setNewQ({ type: "text", question_text: "", required: false, options: [] });
  };

  const onPublish = async () => {
    setPublishing(true);
    const r = await fetch(`/api/surveys/${surveyId}/publish`, { method: "POST" });
    setPublishing(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return toast.error(j.error || "No se pudo publicar");
    }
    const { slug } = await r.json();
    toast.success("Encuesta publicada");
    setSurvey(s => s ? { ...s, status: "published", slug } : s);
  };

  if (!survey) {
    return (
      <main className="container section">
        <div className="card"><p>Cargando…</p></div>
      </main>
    );
  }

  const publicUrl = survey.slug ? `${location.origin}/s/${survey.slug}` : "";

  return (
    <main className="container section">
      <div className="grid two">
        {/* Datos básicos */}
        <section className="card">
          <h1 style={{ marginTop: 0 }}>Editor de Encuesta</h1>
          <form onSubmit={onSurveySave} className="grid" style={{ gap: ".75rem" }}>
            <div>
              <label>Título</label>
              <input
                value={survey.title}
                onChange={(e) => setSurvey(s => s ? { ...s, title: e.target.value } : s)}
                required
              />
            </div>
            <div>
              <label>Descripción</label>
              <textarea
                rows={3}
                value={survey.description ?? ""}
                onChange={(e) => setSurvey(s => s ? { ...s, description: e.target.value } : s)}
              />
            </div>
            <div className="stack">
              <button className="btn primary" type="submit" disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </button>
              <button className="btn" type="button" onClick={onPublish} disabled={publishing || survey.status === "published"}>
                {survey.status === "published" ? "Publicado" : publishing ? "Publicando…" : "Publicar"}
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
                <button className="btn outline" onClick={() => copyToClipboard(publicUrl)}>Copiar enlace</button>
                {qr && <button className="btn" onClick={() => downloadDataUrl(`qr-${survey.slug}.png`, qr)}>Descargar QR</button>}
              </div>
              <div style={{ marginTop: "1rem" }}>
                {qr ? <img src={qr} alt="QR" style={{ width: 200, height: 200 }} /> : <p>Generando QR…</p>}
              </div>
            </>
          ) : (
            <p>Publica la encuesta para generar un <code>slug</code> y mostrar el QR.</p>
          )}
        </section>
      </div>

      {/* Constructor de preguntas */}
      <div className="grid two" style={{ marginTop: "1rem" }}>
        {/* Agregar */}
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Agregar pregunta</h2>
          <form onSubmit={onAddQuestion} className="grid" style={{ gap: ".75rem" }}>
            <div className="grid grid-2">
              <div>
                <label>Tipo</label>
                <select
                  value={newQ.type}
                  onChange={(e) =>
                    setNewQ((q) => ({
                      ...q,
                      type: e.target.value as Question["type"],
                      options: e.target.value === "text" ? [] : q.options,
                    }))
                  }
                >
                  <option value="text">Texto libre</option>
                  <option value="single">Opción única</option>
                  <option value="multiple">Opción múltiple</option>
                  <option value="likert">Escala Likert</option>
                  <option value="checkbox">Casillas</option>
                </select>
              </div>
              <div>
                <label>Obligatoria</label>
                <select
                  value={String(newQ.required)}
                  onChange={(e) =>
                    setNewQ((q) => ({ ...q, required: e.target.value === "true" }))
                  }
                >
                  <option value="false">No</option>
                  <option value="true">Sí</option>
                </select>
              </div>
            </div>

            <div>
              <label>Enunciado</label>
              <input
                value={newQ.question_text}
                onChange={(e) =>
                  setNewQ((q) => ({ ...q, question_text: e.target.value }))
                }
                placeholder="Ej. ¿Qué tan satisfecho estás con el servicio?"
                required
              />
            </div>

            {canHaveOptions && (
              <div>
                <label>Opciones</label>
                <div className="grid" style={{ gap: ".5rem" }}>
                  {newQ.options.map((opt, i) => (
                    <div key={i} className="grid grid-2">
                      <input
                        value={opt.label}
                        onChange={(e) =>
                          setNewQ((q) => {
                            const copy = [...q.options];
                            copy[i] = { ...copy[i], label: e.target.value };
                            return { ...q, options: copy };
                          })
                        }
                        placeholder={`Opción ${i + 1}`}
                      />
                      <button
                        type="button"
                        className="btn outline"
                        onClick={() => removeOption(i)}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn" onClick={addOption}>
                    Agregar opción
                  </button>
                </div>
              </div>
            )}

            <button className="btn primary" type="submit">
              Añadir pregunta
            </button>
          </form>
        </section>

        {/* Listado + Editar/Borrar */}
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Preguntas</h2>

          {/* Estado de edición */}
          {qs.length === 0 ? (
            <p>Aún no hay preguntas.</p>
          ) : (
            <ol style={{ paddingLeft: "1.2rem" }}>
              {qs.map((q) => (
                <QuestionRow
                  key={q.id}
                  q={q}
                  onChanged={async () => {
                    const r = await fetch(`/api/surveys/${surveyId}/questions`);
                    if (r.ok) setQs(await r.json());
                  }}
                  onDeleted={async () => {
                    const r = await fetch(`/api/surveys/${surveyId}/questions`);
                    if (r.ok) setQs(await r.json());
                  }}
                  surveyId={surveyId}
                />
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Modal global (se monta por cada QuestionRow, pero estilos globales aquí) */}
      <style jsx global>{`
        .modal-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.35);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem; z-index: 50;
        }
        .modal {
          background: #fff; border-radius: 12px;
          width: 100%; max-width: 460px; padding: 1rem 1.25rem;
          box-shadow: 0 10px 30px rgba(0,0,0,.2);
        }
        .btn-danger { background: #d73a49; color: white; }
        .btn-danger:hover { filter: brightness(.95); }
      `}</style>
    </main>
  );
}

function QuestionRow({
  q,
  surveyId,
  onChanged,
  onDeleted,
}: {
  q: {
    id?: string;
    type: "text" | "single" | "multiple" | "likert" | "checkbox";
    question_text: string;
    required: boolean;
    options?: { label: string; value?: string }[];
  };
  surveyId: string;
  onChanged: () => Promise<void>;
  onDeleted: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [model, setModel] = useState({
    type: q.type,
    question_text: q.question_text,
    required: q.required,
    options: [...(q.options ?? [])],
  });
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canHaveOptions = model.type !== "text";

  const addOpt = () =>
    setModel(m => ({ ...m, options: [...m.options, { label: `Opción ${m.options.length + 1}` }] }));
  const rmOpt = (idx: number) =>
    setModel(m => ({ ...m, options: m.options.filter((_, i) => i !== idx) }));

  const save = async () => {
    if (!q.id) return;
    if (!model.question_text.trim()) return toast.error("El enunciado es obligatorio");
    setSaving(true);
    const r = await fetch(`/api/surveys/${surveyId}/questions/${q.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: model.type,
        question_text: model.question_text.trim(),
        required: model.required,
        options: canHaveOptions ? model.options : [],
      }),
    });
    setSaving(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return toast.error(j.error || "No se pudo guardar");
    }
    toast.success("Pregunta actualizada");
    setEditing(false);
    await onChanged();
  };

  const confirmDelete = async () => {
    if (!q.id) return;
    setDeleting(true);
    const r = await fetch(`/api/surveys/${surveyId}/questions/${q.id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return toast.error(j.error || "No se pudo eliminar");
    }
    toast.success("Pregunta eliminada");
    setShowConfirm(false);
    await onDeleted();
  };

  if (!editing) {
    return (
      <li style={{ marginBottom: ".6rem" }}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <strong>({q.type})</strong> {q.question_text}{" "}
            {q.required ? <span className="badge">Obligatoria</span> : null}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn outline" onClick={() => { setModel({
              type: q.type, question_text: q.question_text, required: q.required, options: [...(q.options ?? [])]
            }); setEditing(true); }}>Editar</button>
            <button className="btn outline" onClick={() => setShowConfirm(true)}>Borrar</button>
          </div>
        </div>
        {q.options && q.options.length > 0 && (
          <ul style={{ marginTop: ".25rem" }}>
            {q.options.map((o, idx) => <li key={idx}>{o.label}</li>)}
          </ul>
        )}

        {/* Modal confirmar borrado */}
        {showConfirm && (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="modal">
              <h3 style={{ marginTop: 0 }}>Confirmar eliminación</h3>
              <p>¿Eliminar la pregunta “{q.question_text}”?</p>
              <div className="flex items-center gap-2" style={{ justifyContent: "flex-end" }}>
                <button className="btn outline" onClick={() => setShowConfirm(false)}>Cancelar</button>
                <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                  {deleting ? "Eliminando…" : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </li>
    );
  }

  // Modo edición
  return (
    <li style={{ marginBottom: ".9rem" }}>
      <div className="card" style={{ background: "var(--panel)" }}>
        <div className="grid" style={{ gap: ".6rem" }}>
          <div className="grid grid-2">
            <div>
              <label>Tipo</label>
              <select
                value={model.type}
                onChange={(e) =>
                  setModel(m => ({ ...m, type: e.target.value as typeof m.type, options: e.target.value === "text" ? [] : m.options }))
                }
              >
                <option value="text">Texto libre</option>
                <option value="single">Opción única</option>
                <option value="multiple">Opción múltiple</option>
                <option value="likert">Escala Likert</option>
                <option value="checkbox">Casillas</option>
              </select>
            </div>
            <div>
              <label>Obligatoria</label>
              <select
                value={String(model.required)}
                onChange={(e) => setModel(m => ({ ...m, required: e.target.value === "true" }))}
              >
                <option value="false">No</option>
                <option value="true">Sí</option>
              </select>
            </div>
          </div>

          <div>
            <label>Enunciado</label>
            <input
              value={model.question_text}
              onChange={(e) => setModel(m => ({ ...m, question_text: e.target.value }))}
              required
            />
          </div>

          {canHaveOptions && (
            <div>
              <label>Opciones</label>
              <div className="grid" style={{ gap: ".5rem" }}>
                {model.options.map((opt, i) => (
                  <div key={i} className="grid grid-2">
                    <input
                      value={opt.label}
                      onChange={(e) =>
                        setModel(m => {
                          const copy = [...m.options];
                          copy[i] = { ...copy[i], label: e.target.value };
                          return { ...m, options: copy };
                        })
                      }
                    />
                    <button type="button" className="btn outline" onClick={() => rmOpt(i)}>
                      Quitar
                    </button>
                  </div>
                ))}
                <button type="button" className="btn" onClick={addOpt}>Agregar opción</button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2" style={{ justifyContent: "flex-end" }}>
            <button className="btn outline" onClick={() => setEditing(false)}>Cancelar</button>
            <button className="btn primary" onClick={save} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}