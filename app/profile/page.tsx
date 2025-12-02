"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { supabaseBrowser, type SupabaseBrowserClient } from "@/lib/supabaseBrowser";

type Profile = {
  display_name: string | null;
  phone: string | null;
  genero: "Masculino" | "Femenino" | "Otro" | "" | null;
  fecha_nacimiento: string | null; // yyyy-mm-dd
};

export default function ProfilePage() {
  const [email, setEmail] = useState<string>("");
  const [profile, setProfile] = useState<Profile>({
    display_name: "",
    phone: "",
    genero: "",
    fecha_nacimiento: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [supabase, setSupabase] = useState<SupabaseBrowserClient | null>(null);
  useEffect(() => {
    const client = supabaseBrowser();
    setSupabase(client);
  }, []);

  if (!supabase) {
    return null;
  }

  useEffect(() => {
    (async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) { window.location.href = "/auth/login"; return; }
      setEmail(user.email || "");

      const { data } = await supabase
        .from("profiles")
        .select("display_name, phone, genero, fecha_nacimiento")
        .eq("id", user.id)
        .single();

      setProfile({
        display_name: data?.display_name ?? "",
        phone: data?.phone ?? "",
        genero: (data?.genero as any) ?? "",
        fecha_nacimiento: data?.fecha_nacimiento ?? "",
      });
      setLoading(false);
    })();
  }, [supabase]);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name || null,
        phone: profile.phone || null,
        genero: profile.genero || null,
        fecha_nacimiento: profile.fecha_nacimiento || null,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil actualizado");
  };

  const sendPasswordReset = async () => {
    if (!email) return toast.error("No se encontró correo de sesión");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/update-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Enviamos un enlace para cambiar tu contraseña");
  };

  if (loading) {
    return (
      <main className="container section">
        <div className="card"><p>Cargando perfil…</p></div>
      </main>
    );
  }

  return (
    <main className="container section">
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Mi perfil</h1>

        <div className="grid grid-2" style={{ marginTop: "1rem" }}>
          <div>
            <label>Nombre para mostrar</label>
            <input
              value={profile.display_name || ""}
              onChange={(e) => setProfile(p => ({ ...p, display_name: e.target.value }))}
              placeholder="Ej. André Martínez"
            />
          </div>
          <div>
            <label>Correo</label>
            <input value={email} disabled />
          </div>
        </div>

        <div className="grid grid-2" style={{ marginTop: ".5rem" }}>
          <div>
            <label>Teléfono</label>
            <input
              value={profile.phone || ""}
              onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
              placeholder="Ej. +503 7777 7777"
            />
          </div>
          <div>
            <label>Género</label>
            <select
              value={profile.genero || ""}
              onChange={(e) => setProfile(p => ({ ...p, genero: e.target.value as any }))}
            >
              <option value="">Seleccione…</option>
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: ".5rem" }}>
          <label>Fecha de nacimiento</label>
          <input
            type="date"
            value={profile.fecha_nacimiento || ""}
            onChange={(e) => setProfile(p => ({ ...p, fecha_nacimiento: e.target.value }))}
          />
        </div>

        <div className="stack" style={{ marginTop: "1rem" }}>
          <button className="btn primary" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          <button className="btn outline" onClick={sendPasswordReset}>
            Cambiar contraseña (correo)
          </button>
        </div>
      </div>
    </main>
  );
}