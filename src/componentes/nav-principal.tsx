"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type EnlaceNav = { href: string; texto: string; soloEscritorio?: boolean };

/**
 * Enlaces de la cabecera. La sección activa se marca en rojo y con un subrayado
 * grueso, no solo con el color.
 */
export function NavPrincipal({ enlaces }: { enlaces: EnlaceNav[] }) {
  const ruta = usePathname();
  // La sección activa es la de prefijo más largo, para que /admin no gane a /admin/fases.
  const activa = enlaces
    .filter((e) => ruta === e.href || ruta.startsWith(`${e.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <>
      {enlaces.map((e) => {
        const esActiva = e.href === activa;
        return (
          <Link
            key={e.href}
            href={e.href}
            aria-current={esActiva ? "page" : undefined}
            className={`items-center border-b-[3px] px-2 py-2 font-bold transition-colors duration-150 ${
              e.soloEscritorio ? "hidden sm:inline-flex" : "inline-flex"
            } ${
              esActiva
                ? "border-rivas-rojo text-texto"
                : "border-transparent text-texto-suave hover:text-texto"
            }`}
          >
            {e.texto}
          </Link>
        );
      })}
    </>
  );
}
