import Link from "next/link";
import { iniciarSesionGoogle } from "./acciones";

export default async function Inicio({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; siguiente?: string }>;
}) {
  const { error, siguiente } = await searchParams;
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <header className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primario">
            Rivas Vaciamadrid
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Ranking de Tenis</h1>
          <p className="text-texto-suave">
            Tus partidos de la fase, el contacto de cada rival, el WhatsApp para proponer horario y
            el mail de resultado con la plantilla oficial. Todo en un sitio.
          </p>
        </header>

        <div className="tarjeta space-y-4">
          <form action={iniciarSesionGoogle} className="space-y-3">
            <input type="hidden" name="siguiente" value={siguiente ?? "/partidos"} />
            <button type="submit" className="boton-primario w-full">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
                <path
                  fill="#FFC107"
                  d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35.4 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z"
                />
              </svg>
              Entrar con Google
            </button>
          </form>
          {error === "login" && (
            <p className="text-sm text-peligro">
              No se pudo completar el acceso. Vuelve a intentarlo.
            </p>
          )}
          <p className="text-xs text-texto-suave">
            Solo usamos tu dirección de correo para reconocerte en la lista de la liga. No leemos tu
            correo ni publicamos nada.
          </p>
        </div>

        <footer className="text-center text-xs text-texto-suave">
          <Link href="/privacidad" className="underline">
            Qué datos se guardan y por qué
          </Link>
        </footer>
      </div>
    </main>
  );
}
