"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function SessionInitializer() {
  useEffect(() => {
    const client = supabaseBrowser();
    if (!client) return;

    const initializeSession = async () => {
      try {
        const {
          data: { session },
        } = await client.auth.getSession();

      if (session) {
          console.log("Session initialized:", session.user.email);
        }
      } catch (error) {
        console.error("Error initializing session:", error);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes("supabase.auth.token")) {
        initializeSession();
      }
    };

    initializeSession();
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // No renderiza nada
  return null;
}