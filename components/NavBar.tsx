"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useEffect, useState } from 'react';
import { useSession } from "@/hooks/useSession";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser, type SupabaseBrowserClient } from "@/lib/supabaseBrowser";

export default function NavBar() {
  const [supabase, setSupabase] = useState<SupabaseBrowserClient | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, loading } = useSession();

  useEffect(() => {
    const client = supabaseBrowser();
    setSupabase(client);
  }, []);

  if (!supabase) {
    return null;
  }


  const logout = async () => {
    try {
      // Usar el cliente singleton
      await supabase.auth.signOut();
      toast.success("Sesión cerrada");
      router.refresh();
      router.push("/");
    } catch (error) {
      console.error("Error en logout:", error);
      toast.error("No se pudo cerrar sesión");
    }
  };

  // Cierra el menú móvil al cambiar de ruta
  const handleLinkClick = () => {
    setOpen(false);
  };

  return (
    <nav className="nav">
      <div className="nav-inner container">
        {/* Brand */}
        <Link href="/" className="brand" onClick={handleLinkClick}>
          Surveys&nbsp;<span className="badge">UFG</span>
        </Link>

        {/* Botón hamburguesa (solo móvil) */}
        <button
          className="sm:hidden btn"
          aria-controls="mobile-menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Menú escritorio (oculto en móvil) */}
        <div className="hidden sm:flex items-center gap-3">
          {loading ? (
            <div className="flex items-center gap-3">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : (
            <>
              {user && (
                <>
                  <Link href="/surveys" onClick={handleLinkClick}>
                    Mis encuestas
                  </Link>
                  <Link href="/analytics" onClick={handleLinkClick}>
                    Analítica
                  </Link>
                </>
              )}

              {user ? (
                <div className="flex items-center gap-2">
                  <Link 
                    href="/profile" 
                    className="btn outline" 
                    title="Ver/editar perfil"
                    onClick={handleLinkClick}
                  >
                    {user.name}
                  </Link>
                  <button className="btn" onClick={logout}>
                    Cerrar Sesión
                  </button>
                </div>
              ) : (
                <Link 
                  href="/auth/login" 
                  className="btn primary"
                  onClick={handleLinkClick}
                >
                  Iniciar Sesión
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* Panel móvil (solo móvil) */}
      <div
        id="mobile-menu"
        className={`sm:hidden ${
          open ? "block" : "hidden"
        } border-t border-[rgba(125,117,116,0.15)] bg-[rgba(250,245,233,0.95)]`}
      >
        <div className="container py-2 space-y-1">
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ) : (
            <>
              {user && (
                <>
                  <Link
                    href="/surveys"
                    className="block px-2 py-2 rounded-md hover:bg-white"
                    onClick={handleLinkClick}
                  >
                    Mis encuestas
                  </Link>
                  <Link
                    href="/analytics"
                    className="block px-2 py-2 rounded-md hover:bg-white"
                    onClick={handleLinkClick}
                  >
                    Analítica
                  </Link>
                  <Link
                    href="/profile"
                    className="block px-2 py-2 rounded-md hover:bg-white"
                    onClick={handleLinkClick}
                  >
                    {user.name}
                  </Link>
                  <button
                    onClick={logout}
                    className="block w-full text-center px-2 py-2 rounded-md btn"
                  >
                    Cerrar Sesión
                  </button>
                </>
              )}

              {!user && (
                <Link
                  href="/auth/login"
                  className="block px-2 py-2 rounded-md btn primary w-full text-center"
                  onClick={handleLinkClick}
                >
                  Iniciar Sesión
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}