import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { exigirSesion } from "@/lib/consultas/sesion";
import { nombreVisible } from "@/lib/dominio/nombres";

export default async function LayoutApp({ children }: { children: ReactNode }) {
  const { usuario, jugador } = await exigirSesion();
  return (
    <>
      <header className="border-b border-borde bg-superficie">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/partidos" className="flex items-center gap-2 font-bold tracking-tight">
            <Image src="/logo-rivas.png" alt="Rivas Vaciamadrid" width={42} height={44} priority />
            <span>Ranking Tenis Rivas</span>
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
            <Link
              href="/perfil"
              className="max-w-[7rem] truncate rounded-md px-2 py-1 text-texto-suave hover:text-texto sm:max-w-[12rem]"
              title={`Tu perfil · ${usuario.email}`}
            >
              {jugador
                ? nombreVisible(usuario.apodo, jugador.nombre)
                : usuario.apodo || usuario.email}
            </Link>
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
