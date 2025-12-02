"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type QOption = { label: string; value?: string };

type Question = {
  id?: string;
  type: "text" | "single" | "multiple" | "likert" | "checkbox";
  title: string;
  required: boolean;
  options: QOption[];
};

export default function SurveyFormBuilder({ surveyId }: { surveyId: string }) {
  const [qs, setQs] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para nueva pregunta
  const [newQ, setNewQ] = useState<Question>({
    type: "text",
    title: "",
    required: false,
    options: [],
  });

  const canHaveOptions = useMemo(() => newQ.type !== "text", [newQ.type]);

  // Estado para edición inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [model, setModel] = useState<Question | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);

  const reload = async () => {
    setLoading(true);
    const r = await fetch(`/api/surveys/${surveyId}/questions`);
    if (!r.ok) {
      setLoading(false);
      toast.error("No se pudieron cargar las preguntas");
      return;
    }
    const data = await r.json();
    setQs(data);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId]);

  const addOption = () =>
    setNewQ((q) => ({
      ...q,
      options: [...q.options, { label: `Opción ${q.options.length + 1}` }],
    }));

  const removeOption = (i: number) =>
    setNewQ((q) => ({ ...q, options: q.options.filter((_, idx) => idx !== i) }));

  const onAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQ.title.trim()) {
      toast.error("La pregunta necesita un enunciado");
      return;
    }

    setAdding(true);
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
    setAdding(false);

    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      toast.error(j.error || "No se pudo agregar");
      return;
    }

    await reload();
    toast.success("Pregunta agregada");
    setNewQ({ type: "text", title: "", required: false, options: [] });
  };

  return (
    <div className="grid two" style={{ marginTop: "1rem" }}>
      {/* Lista y edición */}
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Preguntas</h2>

        {loading ? (
          <p>Cargando preguntas…</p>
        ) : qs.length === 0 ? (
          <p>Aún no hay preguntas.</p>
        ) : (
          <ol style={{ paddingLeft: "1.2rem" }}>
            {qs.map((q) => (
              <li key={q.id} style={{ marginBottom: ".6rem" }}>
                {!editingId || editingId !== q.id ? (
                  <RowView
                    q={q}
                    onEdit={() => {
                      setEditingId(q.id!);
                      setModel({
                        id: q.id,
                        type: q.type,
                        title: q.title,
                        required: q.required,
                        options: [...(q.options ?? [])],
                      });
                    }}
                    onDelete={async () => {
                      setDeleting(true);
                      const r = await fetch(`/api/surveys/${surveyId}/questions/${q.id}`, {
                        method: "DELETE",
                      });
                      setDeleting(false);
                      if (!r.ok) {
                        const j = await r.json().catch(() => ({}));
                        toast.error(j.error || "No se pudo eliminar");
                        return;
                      }
                      toast.success("Pregunta eliminada");
                      await reload();
                    }}
                    deleting={deleting}
                  />
                ) : (
                  <RowEdit
                    model={model!}
                    setModel={setModel}
                    saving={savingEdit}
                    onCancel={() => {
                      setEditingId(null);
                      setModel(null);
                    }}
                    onSave={async () => {
                      if (!model) return;
                      if (!model.title.trim()) {
                        toast.error("El enunciado es obligatorio");
                        return;
                      }
                      setSavingEdit(true);
                      const r = await fetch(
                        `/api/surveys/${surveyId}/questions/${model.id}`,
                        {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            type: model.type,
                            title: model.title.trim(),
                            required: model.required,
                            options: model.type === "text" ? [] : model.options,
                          }),
                        }
                      );
                      setSavingEdit(false);
                      if (!r.ok) {
                        const j = await r.json().catch(() => ({}));
                        toast.error(j.error || "No se pudo guardar");
                        return;
                      }
                      toast.success("Pregunta actualizada");
                      setEditingId(null);
                      setModel(null);
                      await reload();
                    }}
                  />
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Nueva pregunta */}
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Nueva pregunta</h2>
        <form onSubmit={onAddQuestion} className="grid" style={{ gap: ".6rem" }}>
          <div className="grid grid-2">
            <div>
              <label>Tipo</label>
              <select
                value={newQ.type}
                onChange={(e) =>
                  setNewQ({
                    ...newQ,
                    type: e.target.value as Question["type"],
                    options: e.target.value === "text" ? [] : newQ.options,
                  })
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
                onChange={(e) => setNewQ({ ...newQ, required: e.target.value === "true" })}
              >
                <option value="false">No</option>
                <option value="true">Sí</option>
              </select>
            </div>
          </div>

          <div>
            <label>Enunciado</label>
            <input
              value={newQ.title}
              onChange={(e) => setNewQ({ ...newQ, title: e.target.value })}
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
                      onChange={(e) => {
                        const copy = [...newQ.options];
                        copy[i] = { ...copy[i], label: e.target.value };
                        setNewQ({ ...newQ, options: copy });
                      }}
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

          <div className="flex items-center" style={{ justifyContent: "flex-end" }}>
            <button className="btn primary" type="submit" disabled={adding}>
              {adding ? "Agregando…" : "Agregar pregunta"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/* ------------ subcomponentes ------------ */

function RowView({
  q,
  onEdit,
  onDelete,
  deleting,
}: {
  q: Question;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  deleting: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div>
          <strong>({q.type})</strong> {q.title}{" "}
          {q.required ? <span className="badge">Obligatoria</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn outline" type="button" onClick={onEdit}>
            Editar
          </button>
          <button
            className="btn outline"
            type="button"
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? "Eliminando…" : "Borrar"}
          </button>
        </div>
      </div>
      {q.options && q.options.length > 0 && (
        <ul style={{ marginTop: ".25rem" }}>
          {q.options.map((o, idx) => (
            <li key={idx}>{o.label}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function RowEdit({
  model,
  setModel,
  saving,
  onCancel,
  onSave,
}: {
  model: Question;
  setModel: (m: Question) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => Promise<void>;
}) {
  const canHaveOptions = model.type !== "text";

  return (
    <div className="card" style={{ background: "var(--panel)" }}>
      <div className="grid" style={{ gap: ".6rem" }}>
        <div className="grid grid-2">
          <div>
            <label>Tipo</label>
            <select
              value={model.type}
              onChange={(e) =>
                setModel({
                  ...model,
                  type: e.target.value as Question["type"],
                  options: e.target.value === "text" ? [] : model.options,
                })
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
              onChange={(e) => setModel({ ...model, required: e.target.value === "true" })}
            >
              <option value="false">No</option>
              <option value="true">Sí</option>
            </select>
          </div>
        </div>

        <div>
          <label>Enunciado</label>
          <input
            value={model.title}
            onChange={(e) => setModel({ ...model, title: e.target.value })}
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
                    onChange={(e) => {
                      const copy = [...model.options];
                      copy[i] = { ...copy[i], label: e.target.value };
                      setModel({ ...model, options: copy });
                    }}
                  />
                  <button
                    type="button"
                    className="btn outline"
                    onClick={() => {
                      const copy = model.options.filter((_, idx) => idx !== i);
                      setModel({ ...model, options: copy });
                    }}
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn"
                onClick={() =>
                  setModel({
                    ...model,
                    options: [
                      ...model.options,
                      { label: `Opción ${model.options.length + 1}` },
                    ],
                  })
                }
              >
                Agregar opción
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2" style={{ justifyContent: "flex-end" }}>
          <button className="btn outline" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn primary" type="button" onClick={onSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}