"use client";

import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getFingerprint } from "@/utils/fingerprint";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";

type QOption = { label: string; value?: string };
type Question = {
    id: string;
    type: "text" | "single" | "multiple" | "likert" | "checkbox";
    question_text: string;
    required: boolean;
    options: QOption[];
};

type ErrorResponse = {
    error?: string;
    message?: string;
    details?: any;
    [key: string]: any;
};

export default function PublicSurvey({ slug }: { slug: string }) {
    const router = useRouter();
    const [supabase] = useState(() => supabaseBrowser());

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, any>>({});

    // control de una sola respuesta
    const [singleResponse, setSingleResponse] = useState(false);
    const [scope, setScope] = useState<"device" | "user">("device");
    const [alreadyResponded, setAlreadyResponded] = useState(false);
    const [requiresLogin, setRequiresLogin] = useState(false);

    // identificadores anónimos
    const [token, setToken] = useState<string>("");
    const [fp, setFp] = useState<string>("");
    const [authToken, setAuthToken] = useState<string | null>(null);

    // Obtener token de autenticación si existe
    useEffect(() => {
        const getAuthSession = async () => {
            try {
                if (!supabase) {
                    return;
                }
                
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    return;
                }
                
                if (session?.access_token) {
                    setAuthToken(session.access_token);
                }
            } catch (error) { }
        };
        
        getAuthSession();
        
        // Escuchar cambios en la autenticación si supabase existe
        if (supabase) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(
                (event: AuthChangeEvent, session: Session | null) => {
                    if (session?.access_token) {
                        setAuthToken(session.access_token);
                    } else {
                        setAuthToken(null);
                    }
                }
            );
            
            return () => {
                subscription.unsubscribe();
            };
        }
    }, [supabase]);

    // Asegura token + fingerprint locales
    useEffect(() => {
        (async () => {
            try {
                let t = localStorage.getItem("surveysUFG_token") ?? "";
                if (!t) {
                    t = crypto.randomUUID();
                    localStorage.setItem("surveysUFG_token", t);
                }
                setToken(t);
            } catch {
                const fallbackToken = Math.random().toString(36).slice(2);
                setToken(fallbackToken);
            }

            try {
                let f = localStorage.getItem("surveysUFG_fp") ?? "";
                if (!f) {
                    f = await getFingerprint();
                    localStorage.setItem("surveysUFG_fp", f);
                }
                setFp(f);
            } catch {
                setFp("");
            }
        })();
    }, []);

    // Carga encuesta + estado del respondente + preguntas
    useEffect(() => {
        (async () => {
            if (!token && scope === "device") return; // espera token
            setLoading(true);
            
            try {
                // Preguntas
                const r1 = await fetch(`/api/public/s/${slug}`);
                if (!r1.ok) {
                    setLoading(false);
                    toast.error("No se pudo cargar la encuesta");
                    return;
                }
                const j1 = await r1.json();
                setQuestions(j1.questions as Question[]);

                // Estado (singleResponse / alreadyResponded)
                const params = new URLSearchParams();
                if (token) params.set("token", token);
                if (fp) params.set("fp", fp);

                const r2 = await fetch(`/api/public/s/${slug}/my-status?${params.toString()}`);
                const j2 = await r2.json();

                setSingleResponse(Boolean(j2.singleResponse));
                setScope((j2.scope as "device" | "user") ?? "device");
                setAlreadyResponded(Boolean(j2.alreadyResponded));
                setRequiresLogin(Boolean(j2.requiresLogin));
            } catch (error) {
                toast.error("Error al cargar la encuesta");
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug, token, fp]);

    const setValue = (qid: string, value: any) => {
        setAnswers((a) => ({ ...a, [qid]: value }));
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        // si es única respuesta
        if (singleResponse && alreadyResponded) {
            toast.error("Ya enviaste una respuesta para esta encuesta");
            router.push(`/s/${slug}/thanks?already=1`);
            return;
        }
        if (singleResponse && scope === "user" && requiresLogin) {
            toast.error("Inicia sesión para responder esta encuesta");
            router.push(`/auth/login?redirect=/s/${slug}`);
            return;
        }

        // validación de obligatorias
        for (const q of questions) {
            if (q.required) {
                const v = answers[q.id];
                const empty =
                    v === undefined ||
                    v === null ||
                    (typeof v === "string" && v.trim() === "") ||
                    (Array.isArray(v) && v.length === 0);
                if (empty) {
                    toast.error("Responde todas las preguntas obligatorias");
                    return;
                }
            }
        }

        setSubmitting(true);

        const payload = {
            respondentToken: token,
            respondentFp: fp,
            answers: Object.entries(answers).map(([questionId, value]) => ({
                questionId,
                value,
            })),
        };

        try {
            // Preparar headers
            const headers: HeadersInit = {
                "Content-Type": "application/json",
            };

            // Si hay token de autenticación, agregarlo
            if (authToken) {
                headers["Authorization"] = `Bearer ${authToken}`;
            }

            const r = await fetch(`/api/public/s/${slug}/responses`, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });
            
            if (!r.ok) {
                let errorData: ErrorResponse = {};
                try {
                    errorData = await r.json() as ErrorResponse;
                } catch (parseError) { }
                
                if (errorData.error === "already_answered") {
                    setSubmitting(false);
                    router.push(`/s/${slug}/thanks?already=1`);
                    return;
                }
                if (errorData.error === "login_required") {
                    setSubmitting(false);
                    router.push(`/auth/login?redirect=/s/${slug}`);
                    return;
                }
                toast.error(errorData.message || errorData.error || "No se pudo enviar la respuesta");
                setSubmitting(false);
                return;
            }

            const responseData = await r.json();
            router.push(`/s/${slug}/thanks`);
            
        } catch (error) {
            toast.error("Error de conexión. Intenta nuevamente.");
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="card"><p>Cargando…</p></div>;
    }

    // Bloqueo visual cuando ya respondió y es única respuesta
    if (singleResponse && alreadyResponded) {
        return (
            <div className="card">
                <p>Ya enviaste una respuesta para esta encuesta.</p>
                <button className="btn" onClick={() => router.push(`/s/${slug}/thanks?already=1`)}>
                    Ver mensaje
                </button>
            </div>
        );
    }

    if (!questions.length) {
        return <div className="card"><p>Esta encuesta no tiene preguntas.</p></div>;
    }

    return (
        <form onSubmit={onSubmit} className="card" style={{ marginTop: ".8rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {questions.map((q) => (
                    <div key={q.id} style={{ textAlign: "left" }}>
                        <label
                            style={{
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: ".5rem",
                            }}
                        >
                            <span>{q.question_text}</span>
                            {q.required ? <span className="badge">Obligatoria</span> : null}
                        </label>

                        {q.type === "text" && (
                            <textarea
                                rows={3}
                                value={answers[q.id] ?? ""}
                                onChange={(e) => setValue(q.id, e.target.value)}
                                style={{ width: "100%" }}
                                placeholder="Escribe tu respuesta aquí..."
                            />
                        )}

                        {q.type === "single" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
                                {q.options.map((o, i) => {
                                    const val = o.value ?? o.label;
                                    return (
                                        <label key={i} className="inline-option">
                                            <input
                                                type="radio"
                                                name={q.id}
                                                checked={answers[q.id] === val}
                                                onChange={() => setValue(q.id, val)}
                                            />
                                            <span>{o.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {(q.type === "multiple" || q.type === "checkbox") && (
                            <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
                                {q.options.map((o, i) => {
                                    const val = o.value ?? o.label;
                                    const arr = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
                                    const checked = arr.includes(val);
                                    return (
                                        <label key={i} className="inline-option">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => {
                                                    if (e.target.checked) setValue(q.id, [...arr, val]);
                                                    else setValue(q.id, arr.filter((x) => x !== val));
                                                }}
                                            />
                                            <span>{o.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {q.type === "likert" && (
                            <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
                                {q.options.map((o, i) => {
                                    const val = o.value ?? o.label;
                                    return (
                                        <label key={i} className="inline-option">
                                            <input
                                                type="radio"
                                                name={q.id}
                                                checked={answers[q.id] === val}
                                                onChange={() => setValue(q.id, val)}
                                            />
                                            <span>{o.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: "1rem",
                    gap: ".5rem",
                }}
            >
                <button className="btn primary" type="submit" disabled={submitting}>
                    {submitting ? "Enviando…" : "Enviar"}
                </button>
                <button
                    className="btn danger"
                    type="reset"
                    onClick={() => {
                        setAnswers({});
                    }}
                    disabled={submitting}
                >
                    Limpiar
                </button>
            </div>
        </form>
    );
}