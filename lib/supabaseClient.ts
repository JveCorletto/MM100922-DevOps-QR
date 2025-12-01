import { createBrowserClient } from "@supabase/ssr";

// Cliente singleton para el navegador
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    throw new Error("Este cliente solo debe usarse en el navegador");
  }

  if (browserClient) return browserClient;

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      }
    }
  );

  return browserClient;
}

// Exportar por defecto para mantener compatibilidad
export const supabase = createSupabaseBrowserClient();