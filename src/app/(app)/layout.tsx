import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { exigirSesion } from "@/lib/consultas/sesion";
import { nombreVisible } from "@/lib/dominio/nombres";
import { NavPrincipal, type EnlaceNav } from "@/componentes/nav-principal";

export default async function LayoutApp({ children }: { children: ReactNode }) {
  const { usuario, jugador } = await exigirSesion();
  const enlaces: EnlaceNav[] = [
    ...(jugador
      ? [
          { href: "/partidos", texto: "Partidos" },
          { href: "/pistas", texto: "Pistas" },
          { href: "/clasificacion", texto: "Clasificación" },
          { href: "/ranking", texto: "Ranking" },
        ]
      : []),
    ...(usuario.rol === "admin" ? [{ href: "/admin", texto: "Admin" }] : []),
  ];
  return (
    <>
      <header className="border-t-4 border-b border-t-rivas-rojo border-b-borde bg-superficie">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-4 px-4 pt-3 sm:items-end">
          <Link href="/partidos" className="flex items-center gap-2.5 pb-2">
            <Image src="/logo-rivas.png" alt="Rivas Vaciamadrid" width={38} height={40} priority />
            <span className="font-display text-base leading-none uppercase">
              Ranking
              <span className="block text-xs tracking-[0.06em] text-texto-suave">Tenis Rivas</span>
            </span>
          </Link>
          <div className="flex items-center gap-1 pb-2 text-sm sm:order-2">
            <Link
              href="/perfil"
              className="max-w-[8rem] truncate px-2 py-2 font-bold hover:underline sm:max-w-[12rem]"
              title={`Tu perfil · ${usuario.email}`}
            >
              {jugador
                ? nombreVisible(usuario.apodo, jugador.nombre)
                : usuario.apodo || usuario.email}
            </Link>
            <form action="/auth/salir" method="post">
              <button type="submit" className="px-2 py-2 text-texto-suave hover:text-texto">
                Salir
              </button>
            </form>
          </div>
          <nav className="-mb-px flex w-full items-center gap-1 text-sm sm:w-auto sm:order-1">
            <NavPrincipal enlaces={enlaces} />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
