"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient"; // Usar el cliente unificado
import type { Session } from "@supabase/supabase-js";

interface SessionUser {
  id: string;
  email?: string | null;
  name: string;
}

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const getSession = async () => {
      try {
        if (!isMounted) return;

        // Usar el cliente singleton
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (!session?.user) {
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // Obtener nombre del usuario
        let userName = session.user.email?.split('@')[0] || "Usuario";
        
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", session.user.id)
            .single();
            
          if (profile?.display_name) {
            userName = profile.display_name;
          }
        } catch (profileError) {
          console.warn("Could not fetch profile:", profileError);
        }

        if (isMounted) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            name: userName,
          });
          setLoading(false);
        }

      } catch (error) {
        console.error("Failed to get session:", error);
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    getSession();

    // Suscribirse a cambios usando el mismo cliente
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        if (event === "SIGNED_OUT" || !session) {
          setUser(null);
          setLoading(false);
          return;
        }

        // Actualizar usuario cuando cambie la sesión
        const userName = session.user.email?.split('@')[0] || "Usuario";
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: userName,
        });
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}