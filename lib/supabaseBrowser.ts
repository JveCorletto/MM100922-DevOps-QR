import {
  createSupabaseBrowserClient,
  type SupabaseBrowserClient,
} from "./supabaseClient";

export function supabaseBrowser(): SupabaseBrowserClient | null {
  return createSupabaseBrowserClient();
}

export type { SupabaseBrowserClient };