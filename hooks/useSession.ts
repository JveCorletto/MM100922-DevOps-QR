"use client";

import { useEffect, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabaseBrowser, type SupabaseBrowserClient } from "@/lib/supabaseBrowser";

interface SessionUser {
  id: string;
  email?: string | null;
  name: string;
}

interface UseSessionResult {
  user: SessionUser | null;
  loading: boolean;
}

export function useSession(): UseSessionResult {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client: SupabaseBrowserClient | null = supabaseBrowser();

    // Si estamos en SSR/build, no hay cliente
    if (!client) {
      setLoading(false);
      return () => {}; // ← RETORNAR UNA FUNCIÓN DE CLEANUP VACÍA
    }

    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    async function fetchInitialUser() {
      const {
        data: { user },
      } = await client.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Nombre por defecto desde metadata/perfil
      let userName =
        (user.user_metadata as any)?.display_name ??
        (user.user_metadata as any)?.full_name ??
        (user.user_metadata as any)?.name ??
        user.email ??
        "Usuario";

      try {
        const { data: profile } = await client
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.display_name) {
          userName = profile.display_name;
        }
      } catch (err) {
        console.warn("Could not fetch profile:", err);
      }

      setUser({
        id: user.id,
        email: user.email,
        name: userName,
      });
      setLoading(false);
    }

    fetchInitialUser();

    const {
      data: { subscription: authSubscription },
    } = client.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (!isMounted) return;

        if (!session?.user) {
          setUser(null);
          setLoading(false);
          return;
        }

        const sessionUser = session.user;
        const meta: any = sessionUser.user_metadata ?? {};
        const userName =
          meta.display_name ??
          meta.full_name ??
          meta.name ??
          sessionUser.email ??
          "Usuario";

        setUser({
          id: sessionUser.id,
          email: sessionUser.email,
          name: userName,
        });
        setLoading(false);
      }
    );

    subscription = authSubscription;

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  return { user, loading };
}