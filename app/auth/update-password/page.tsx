"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import toast from "react-hot-toast";

export default function UpdatePasswordPage() {
  const supabase = supabaseBrowser();
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw1.length < 8) return toast.error("Mínimo 8 caracteres");
    if (pw1 !== pw2) return toast.error("Las contraseñas no coinciden");

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setLoading(false);

    if (error) return toast.error(error.message);
    toast.success("Contraseña actualizada. Inicia sesión de nuevo.");
    window.location.href = "/auth/login";
  };

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div className="card" style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ marginTop: 0 }}>Nueva contraseña</h1>
        <form onSubmit={onSubmit} className="grid" style={{ gap: "1rem", textAlign: "left" }}>
          <div>
            <label>Nueva contraseña</label>
            <input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} required />
          </div>
          <div>
            <label>Repetir contraseña</label>
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          </div>
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Actualizando…" : "Actualizar contraseña"}
          </button>
        </form>
      </div>
    </main>
  );
}