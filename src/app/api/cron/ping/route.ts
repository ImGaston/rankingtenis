import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/**
 * Keep-alive semanal (Vercel Cron). Supabase pausa los proyectos gratuitos
 * tras una semana sin actividad; una consulta trivial lo evita.
 */
export async function GET(request: Request) {
  const esperado = process.env.CRON_SECRET;
  const recibido = request.headers.get("authorization");
  if (!esperado || recibido !== `Bearer ${esperado}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const supabase = crearClienteAdmin();
  const { count, error } = await supabase.from("fases").select("*", { count: "exact", head: true });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, fases: count ?? 0, en: new Date().toISOString() });
}
