import Link from "next/link";
import { exigirSesion } from "@/lib/consultas/sesion";
import { formatearNombre, nombreDePila } from "@/lib/dominio/nombres";
import { BotonEliminarCuenta } from "@/componentes/boton-eliminar-cuenta";
import { guardarApodo } from "../acciones";

export const metadata = { title: "Tu perfil" };

export default async function Perfil({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>;
}) {
  const [{ usuario, jugador }, { guardado }] = await Promise.all([exigirSesion(), searchParams]);
  const nombreLiga = jugador ? formatearNombre(jugador.nombre) : null;
  const porDefecto = jugador ? nombreDePila(jugador.nombre) : null;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <Link href="/partidos" className="text-sm text-primario underline">
        ← Mis partidos
      </Link>
      <header>
        <h1 className="titulo-pagina banderin">Tu perfil</h1>
        <p className="text-texto-suave">{usuario.email}</p>
      </header>

      <form action={guardarApodo} className="tarjeta space-y-4">
        {nombreLiga && (
          <p className="text-sm text-texto-suave">
            En la lista de la liga figuras como <strong className="text-texto">{nombreLiga}</strong>
            .
          </p>
        )}
        <label className="block">
          <span className="etiqueta">Cómo quieres que te llamen</span>
          <input
            type="text"
            name="apodo"
            defaultValue={usuario.apodo ?? ""}
            placeholder={porDefecto ?? "Tu nombre"}
            maxLength={40}
            autoComplete="nickname"
            className="campo"
          />
        </label>
        <p className="text-xs text-texto-suave">
          Así aparecerás en el menú y te presentarás en el WhatsApp a tu rival (&quot;Hola…, soy{" "}
          {usuario.apodo || porDefecto || "…"}&quot;). El mail de resultado a la liga lleva siempre
          tu nombre completo. Déjalo vacío para volver a usar tu nombre de pila.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="boton-primario">
            Guardar
          </button>
          {guardado === "1" && (
            <p className="text-sm text-primario" role="status">
              Guardado.
            </p>
          )}
        </div>
      </form>

      <section className="tarjeta border-peligro/40 space-y-3">
        <h2 className="text-lg font-bold">Eliminar cuenta</h2>
        <p className="text-sm text-texto-suave">
          Se borra tu acceso a la app y tus propuestas de horario. Tu ficha en el ranking es de la
          liga y sigue ahí; los resultados y W.O. que registraste se conservan para tu rival. Puedes
          volver a entrar con Google cuando quieras.
        </p>
        <BotonEliminarCuenta />
      </section>
    </div>
  );
}
