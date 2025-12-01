"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function SessionInitializer() {
  useEffect(() => {
    // Función para inicializar la sesión
    const initializeSession = async () => {
      try {
        const supabase = supabaseBrowser();
        
        // Intentar restaurar sesión desde localStorage
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log("Session initialized:", session.user.email);
        }
      } catch (error) {
        console.error("Error initializing session:", error);
      }
    };

    // También manejar cambios en localStorage (para sincronizar entre pestañas)
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
  }, []);

  return null; // Este componente no renderiza nada
}