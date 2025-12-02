import { createBrowserClient } from "@supabase/ssr";

// Cliente singleton para el navegador
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  // En servidor / build devolvemos null y NO lanzamos error
  if (typeof window === "undefined") {
    return null;
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
      },
    }
  );

  return browserClient;
}

// Tipo útil para el cliente en el navegador
export type SupabaseBrowserClient = NonNullable<
  ReturnType<typeof createSupabaseBrowserClient>
>;