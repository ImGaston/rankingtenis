import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { exigirAdmin } from "@/lib/consultas/sesion";
import { NavPrincipal } from "@/componentes/nav-principal";

const SECCIONES = [
  { href: "/admin", texto: "Resumen" },
  { href: "/admin/fases", texto: "Fases" },
  { href: "/admin/usuarios", texto: "Usuarios" },
  { href: "/admin/ingestas", texto: "Ingestas" },
  { href: "/partidos", texto: "Mis partidos" },
];

export default async function LayoutAdmin({ children }: { children: ReactNode }) {
  const { usuario } = await exigirAdmin();
  return (
    <>
      <header className="border-t-4 border-b border-t-rivas-rojo border-b-borde bg-superficie">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 px-4 pt-3 sm:items-end">
          <div className="flex items-center gap-3 pb-2">
            <Link href="/partidos" className="flex items-center gap-2.5">
              <Image
                src="/logo-rivas.png"
                alt="Rivas Vaciamadrid"
                width={38}
                height={40}
                priority
              />
              <span className="font-display text-base leading-none uppercase">
                Ranking
                <span className="block text-xs tracking-[0.06em] text-texto-suave">
                  Tenis Rivas
                </span>
              </span>
            </Link>
            <span className="chip bg-texto text-superficie uppercase">Admin</span>
          </div>
          <div className="flex items-center gap-1 pb-2 text-sm sm:order-2">
            <span className="hidden text-texto-suave lg:inline">{usuario.email}</span>
            <form action="/auth/salir" method="post">
              <button type="submit" className="px-2 py-2 text-texto-suave hover:text-texto">
                Salir
              </button>
            </form>
          </div>
          <nav className="-mb-px flex w-full flex-wrap items-center gap-1 text-sm sm:order-1 sm:w-auto">
            <NavPrincipal enlaces={SECCIONES} />
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
