import Link from "next/link";
import type { ReactNode } from "react";
import { exigirSesion } from "@/lib/consultas/sesion";
import { formatearNombre } from "@/lib/dominio/nombres";

export default async function LayoutApp({ children }: { children: ReactNode }) {
  const { usuario, jugador } = await exigirSesion();
  return (
    <>
      <header className="border-b border-borde bg-superficie">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/partidos" className="font-bold tracking-tight">
            🎾 Ranking Tenis Rivas
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {jugador && (
              <>
                <Link
                  href="/partidos"
                  className="rounded-md px-2 py-1 text-texto-suave hover:text-texto"
                >
                  Partidos
                </Link>
                <Link
                  href="/clasificacion"
                  className="rounded-md px-2 py-1 text-texto-suave hover:text-texto"
                >
                  Clasificación
                </Link>
                <Link
                  href="/ranking"
                  className="hidden rounded-md px-2 py-1 text-texto-suave hover:text-texto sm:inline"
                >
                  Ranking
                </Link>
              </>
            )}
            {usuario.rol === "admin" && (
              <Link
                href="/admin"
                className="rounded-md px-2 py-1 text-texto-suave hover:text-texto"
              >
                Admin
              </Link>
            )}
            <span
              className="hidden max-w-[12rem] truncate text-texto-suave sm:inline"
              title={usuario.email}
            >
              {jugador ? formatearNombre(jugador.nombre) : usuario.email}
            </span>
            <form action="/auth/salir" method="post">
              <button
                type="submit"
                className="rounded-md px-2 py-1 text-texto-suave hover:text-texto"
              >
                Salir
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
