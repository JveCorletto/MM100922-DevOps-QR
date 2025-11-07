"use client";
import Link from "next/link";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

type SessionUser = { id: string; email?: string | null; name: string };

export default function NavBar() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  // Cargar sesión + nombre de perfil
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUser(null);
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      setUser({
        id: user.id,
        email: user.email,
        name: profile?.display_name ?? user.email ?? "Usuario",
      });
      setLoading(false);
    })();

    // Mantener en sync cuando cambie el estado de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_evt: AuthChangeEvent, sess: Session | null) => {
        if (!sess?.user) {
          setUser(null);
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", sess.user.id)
          .single();
        setUser({
          id: sess.user.id,
          email: sess.user.email,
          name: profile?.display_name ?? sess.user.email ?? "Usuario",
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Cierra el menú móvil al cambiar de ruta
  useEffect(() => { setOpen(false); }, [pathname]);

  const logout = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
      setUser(null);
      toast.success("Sesión cerrada");
      router.replace("/");
      setTimeout(() => window.location.reload(), 50);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo cerrar sesión");
    }
  };

  return (
    <nav className="nav">
      <div className="nav-inner container">
        {/* Brand */}
        <Link href="/" className="brand">
          Surveys&nbsp;<span className="badge">UFG</span>
        </Link>

        {/* Botón hamburguesa (solo móvil) */}
        <button
          className="sm:hidden btn"
          aria-controls="mobile-menu"
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Menú escritorio (oculto en móvil) */}
        <div className="hidden sm:flex items-center gap-3">
          {!loading && user && (
            <>
              <Link href="/surveys">Mis encuestas</Link>
              <Link href="/analytics">Analítica</Link>
            </>
          )}

          {!loading && (
            user ? (
              <div className="flex items-center gap-2">
                <Link href="/profile" className="btn outline" title="Ver/editar perfil">
                  {user.name}
                </Link>
                <button className="btn" onClick={logout}>Cerrar Sesión</button>
              </div>
            ) : (
              <Link href="/auth/login" className="btn primary">Iniciar Sesión</Link>
            )
          )}
        </div>
      </div>

      {/* Panel móvil (solo móvil) */}
      <div id="mobile-menu"
        className={`sm:hidden ${open ? "block" : "hidden"} border-t border-[rgba(125,117,116,0.15)] bg-[rgba(250,245,233,0.95)]`}>
        <div className="container py-2 space-y-1">
          {!loading && user && (
            <>
              <Link href="/surveys" className="block px-2 py-2 rounded-md hover:bg-white">Mis encuestas</Link>
              <Link href="/analytics" className="block px-2 py-2 rounded-md hover:bg-white">Analítica</Link>
              <Link href="/profile" className="block px-2 py-2 rounded-md hover:bg-white">
                {user.name}
              </Link>
              <button onClick={logout} className="block w-full text-center px-2 py-2 rounded-md btn">
                Cerrar Sesión
              </button>
            </>
          )}

          {!loading && !user && (
            <Link href="/auth/login" className="block px-2 py-2 rounded-md btn primary w-full text-center">
              Iniciar Sesión
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}