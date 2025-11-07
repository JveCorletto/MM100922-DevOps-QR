"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true); // empieza true para chequear sesión

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) router.replace("/surveys");
      else setLoading(false);
    })();
  }, [router, supabase]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else router.replace("/surveys");
  };

  const onMagic = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/surveys` },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Revisa tu correo para el Magic Link.");
  };

  if (loading) return null;

  return (
    <main style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg)", padding:"1rem" }}>
      <div className="card" style={{ width:"100%", maxWidth:"420px", textAlign:"center" }}>
        <h1 style={{ marginTop: 0, marginBottom: "1rem" }}>Iniciar sesión</h1>
        <form onSubmit={onLogin} className="grid" style={{ gap: "1rem", textAlign: "left" }}>
          <div>
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
          <div>
            <label>Contraseña</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </div>
          <div className="stack" style={{ justifyContent: "center" }}>
            <button className="btn primary" type="submit">Entrar</button>
            <button className="btn outline" type="button" onClick={onMagic}>Magic Link</button>
          </div>
        </form>

        <p style={{ marginTop: "1.2rem", fontSize: ".9rem", color: "var(--muted)" }}>
          ¿Aún no tienes cuenta?{" "}
          <Link href="/auth/register" style={{ color: "var(--accent)", fontWeight: 600 }}>
            Regístrate ahora
          </Link>
        </p>
      </div>
    </main>
  );
}
