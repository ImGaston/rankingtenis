import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

/** Vuelta del login con Google: cambia el código por una sesión. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const codigo = searchParams.get("code");
  const siguiente = searchParams.get("siguiente") ?? "/partidos";
  const destino = siguiente.startsWith("/") ? siguiente : "/partidos";

  if (codigo) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) {
      return NextResponse.redirect(`${origin}${destino}`);
    }
  }
  return NextResponse.redirect(`${origin}/?error=login`);
}
