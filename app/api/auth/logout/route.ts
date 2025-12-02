import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST() {
  const supabase = supabaseServer();
  
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error("Error en signOut:", e);
  }

  return NextResponse.json({ ok: true });
}