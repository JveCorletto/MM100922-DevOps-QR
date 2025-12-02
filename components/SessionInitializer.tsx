"use client";

import { useEffect, useState } from 'react';
import { supabaseBrowser, type SupabaseBrowserClient } from "@/lib/supabaseBrowser";

export default function SessionInitializer() {
  const [supabase, setSupabase] = useState<SupabaseBrowserClient | null>(null);

  useEffect(() => {
    const client = supabaseBrowser();
    setSupabase(client);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    
    // Función para inicializar la sesión
    const initializeSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log("Session initialized:", session.user.email);
        }
      } catch (error) {
        console.error("Error initializing session:", error);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('supabase.auth.token')) {
        initializeSession();
      }
    };

    initializeSession();
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [supabase]);

  return null; // Este componente no renderiza nada
}
