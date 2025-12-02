"use client";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabaseBrowser, type SupabaseBrowserClient } from "@/lib/supabaseBrowser";

type SurveyForm = { title: string; description?: string; };

export default function NewSurveyPage() {
  const { register, handleSubmit, reset } = useForm<SurveyForm>();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [supabase, setSupabase] = useState<SupabaseBrowserClient | null>(null);
  useEffect(() => {
    const client = supabaseBrowser();
    setSupabase(client);
  }, []);
  
  useEffect(() => {
    (async () => {
      if (!supabase) return; // ← Verificar aquí
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.replace("/auth/login");
    })();
  }, [router, supabase]);

  if (!supabase) {
    return null;
  }

  const onSubmit = async (data: SurveyForm) => {
    if (loading) return;
    if (!data.title?.trim()) return toast.error("El título es requerido");

    setLoading(true);
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title.trim(),
          description: data.description?.trim() || "",
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Error al crear encuesta");
      }
      const s = await res.json();
      toast.success("Encuesta creada");
      reset();
      router.replace(`/surveys/${s.id}/edit`);
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo crear");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container section">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Nueva encuesta</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="grid" style={{ gap: "1rem" }}>
          <div>
            <label>Título</label>
            <input {...register("title", { required: true })} placeholder="Satisfacción del servicio" />
          </div>
          <div>
            <label>Descripción</label>
            <textarea {...register("description")} placeholder="Opcional" rows={4} />
          </div>
          <button className="btn primary" disabled={loading} type="submit">
            {loading ? "Creando..." : "Crear"}
          </button>
        </form>
      </div>
    </main>
  );
}