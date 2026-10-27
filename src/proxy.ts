import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const RUTAS_PRIVADAS = ["/partidos", "/vincular", "/admin", "/cuenta"];

/**
 * Refresca la sesión de Supabase en cada petición (las cookies se renuevan
 * aquí porque los Server Components no pueden escribirlas) y manda al inicio
 * a quien entra sin sesión a una ruta privada.
 */
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims valida el JWT localmente y refresca el token si hace falta.
  const { data } = await supabase.auth.getClaims();
  const haySesion = Boolean(data?.claims);
  const { pathname } = request.nextUrl;
  const esPrivada = RUTAS_PRIVADAS.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  if (!haySesion && esPrivada) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("siguiente", pathname);
    return NextResponse.redirect(url);
  }
  if (haySesion && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/partidos";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return respuesta;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
