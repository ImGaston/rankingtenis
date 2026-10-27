import Link from "next/link";
import type { ReactNode } from "react";
import { exigirAdmin } from "@/lib/consultas/sesion";

const SECCIONES = [
  { href: "/admin", texto: "Resumen" },
  { href: "/admin/fases", texto: "Fases" },
  { href: "/admin/usuarios", texto: "Usuarios" },
  { href: "/admin/ingestas", texto: "Ingestas" },
];

export default async function LayoutAdmin({ children }: { children: ReactNode }) {
  const { usuario } = await exigirAdmin();
  return (
    <>
      <header className="border-b border-borde bg-superficie">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/partidos" className="font-bold tracking-tight">
              🎾 Ranking Tenis Rivas
            </Link>
            <span className="chip bg-acento-suave text-acento">Admin</span>
          </div>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {SECCIONES.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-md px-2 py-1 text-texto-suave hover:text-texto"
              >
                {s.texto}
              </Link>
            ))}
            <Link
              href="/partidos"
              className="rounded-md px-2 py-1 text-texto-suave hover:text-texto"
            >
              Mis partidos
            </Link>
            <span className="hidden text-texto-suave sm:inline">· {usuario.email}</span>
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
