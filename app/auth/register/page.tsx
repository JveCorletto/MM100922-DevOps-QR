"use client";
import Link from "next/link";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser, type SupabaseBrowserClient } from "@/lib/supabaseBrowser";

const COOLDOWN = 60;

type Form = {
  email: string;
  password: string;
  repeatPassword: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  genero: string;
  fechaNacimiento: string;
};

export default function RegisterPage() {
  const [supabase, setSupabase] = useState<SupabaseBrowserClient | null>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [form, setForm] = useState<Form>({
    email: "",
    password: "",
    repeatPassword: "",
    nombres: "",
    apellidos: "",
    telefono: "",
    genero: "",
    fechaNacimiento: "",
  });

  useEffect(() => {
    const client = supabaseBrowser();
    setSupabase(client);
  }, []);

  useEffect(() => {
    if (!supabase) return; // ← CONDICIÓN DENTRO DEL EFECTO

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.replace("/surveys");
    })();
  }, [router, supabase]);

  // Restaurar cooldown al recargar
  useEffect(() => {
    const t = Number(localStorage.getItem("signup_cooldown_until") || 0);
    const now = Math.floor(Date.now() / 1000);
    if (t > now) setCooldown(t - now);
  }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  if (!supabase) return null;

  const lockCooldown = () => {
    const until = Math.floor(Date.now() / 1000) + COOLDOWN;
    localStorage.setItem("signup_cooldown_until", String(until));
    setCooldown(COOLDOWN);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cooldown > 0) return toast.error(`Espera ${cooldown}s para intentarlo de nuevo`);
    if (!form.email || !form.password) return toast.error("Completa email y contraseña");
    if (form.password.length < 8) return toast.error("La contraseña debe tener al menos 8 caracteres");
    if (form.password !== form.repeatPassword) return toast.error("Las contraseñas no coinciden");
    if (!form.nombres || !form.apellidos) return toast.error("Completa nombres y apellidos");
    if (!form.genero) return toast.error("Selecciona el género");
    if (!form.fechaNacimiento) return toast.error("Indica tu fecha de nacimiento");

    setLoading(true);

    // ÚNICO signUp: el trigger en DB creará/actualizará el perfil con este metadata
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${location.origin}/surveys`,
        data: {
          display_name: `${form.nombres} ${form.apellidos}`.trim(),
          nombres: form.nombres,
          apellidos: form.apellidos,
          telefono: form.telefono,
          genero: form.genero,
          fecha_nacimiento: form.fechaNacimiento,
        },
      },
    });

    setLoading(false);

    if (error) {
      if ((error as any).status === 429) {
        lockCooldown();
        return toast.error("Demasiadas solicitudes. Intenta en 60s.");
      }
      return toast.error(error.message);
    }

    lockCooldown();
    toast.success("Cuenta creada. Revisa tu correo para verificarla.");
  };

  const onResend = async () => {
    if (!form.email) return toast.error("Ingresa tu correo para reenviar");
    if (cooldown > 0) return toast.error(`Reenviar en ${cooldown}s`);

    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: form.email,
      options: { emailRedirectTo: `${location.origin}/surveys` },
    });
    setLoading(false);

    if (error) {
      if ((error as any).status === 429) {
        lockCooldown();
        return toast.error("Demasiadas solicitudes. Intenta en 60s.");
      }
      return toast.error(error.message);
    }

    lockCooldown();
    toast.success("Verificación reenviada. Revisa tu bandeja y spam.");
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "1rem",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: 500, textAlign: "center" }}>
        <h1 style={{ marginTop: 0, marginBottom: "1rem" }}>Crear cuenta</h1>

        <form onSubmit={onRegister} className="grid" style={{ gap: "1rem", textAlign: "left" }}>
          <div className="grid grid-2">
            <div>
              <label>Nombres</label>
              <input name="nombres" value={form.nombres} onChange={onChange} required />
            </div>
            <div>
              <label>Apellidos</label>
              <input name="apellidos" value={form.apellidos} onChange={onChange} required />
            </div>
          </div>

          <div>
            <label>Correo electrónico</label>
            <input name="email" type="email" value={form.email} onChange={onChange} required />
          </div>

          <div className="grid grid-2">
            <div>
              <label>Contraseña</label>
              <input name="password" type="password" value={form.password} onChange={onChange} required />
            </div>
            <div>
              <label>Repetir contraseña</label>
              <input name="repeatPassword" type="password" value={form.repeatPassword} onChange={onChange} required />
            </div>
          </div>

          <div className="grid grid-2">
            <div>
              <label>Número de teléfono</label>
              <input name="telefono" type="tel" placeholder="Ej. +503 7777 7777" value={form.telefono} onChange={onChange} />
            </div>
            <div>
              <label>Género</label>
              <select name="genero" value={form.genero} onChange={onChange} required>
                <option value="">Seleccione...</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <div>
            <label>Fecha de nacimiento</label>
            <input name="fechaNacimiento" type="date" value={form.fechaNacimiento} onChange={onChange} required />
          </div>

          <button className="btn primary" type="submit" disabled={loading || cooldown > 0}>
            {cooldown > 0 ? `Espera ${cooldown}s` : loading ? "Registrando..." : "Registrarme"}
          </button>
        </form>

        <div className="stack" style={{ justifyContent: "center", marginTop: ".7rem" }}>
          <button className="btn outline" onClick={onResend} disabled={loading || cooldown > 0}>
            {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar verificación"}
          </button>
        </div>

        <p style={{ marginTop: "1.2rem", fontSize: ".9rem", color: "var(--muted)" }}>
          ¿Ya tienes cuenta?{" "}
          <Link href="/auth/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}