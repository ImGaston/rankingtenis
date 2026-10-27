import Link from "next/link";

export const metadata = { title: "Privacidad" };

export default function Privacidad() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 space-y-6">
      <Link href="/" className="text-sm text-primario underline">
        ← Volver
      </Link>
      <h1 className="text-2xl font-bold">Qué datos se guardan y por qué</h1>
      <div className="space-y-4 text-texto-suave leading-relaxed">
        <p>
          Esta aplicación es una herramienta privada hecha por un jugador del Ranking de Tenis de
          Rivas para organizar los partidos de la fase. No pertenece al Ayuntamiento ni a la
          coordinación de la liga.
        </p>
        <h2 className="text-lg font-semibold text-texto">Qué guardamos</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Los datos que la liga ya distribuye a todos los participantes por correo: nombre,
            teléfono y dirección de correo de cada jugador, los grupos y el calendario de partidos.
          </li>
          <li>
            Tu dirección de correo de Google, para reconocerte en esa lista. No leemos tu correo.
          </li>
          <li>
            Las propuestas de horario, los resultados y los W.O. que registras desde la app, para
            que veas qué te falta.
          </li>
        </ul>
        <h2 className="text-lg font-semibold text-texto">Quién lo ve</h2>
        <p>
          Cada jugador ve únicamente los contactos de su propio grupo, los mismos que la liga ya le
          envía. Nada es público: hace falta iniciar sesión y la web no se indexa en buscadores.
        </p>
        <h2 className="text-lg font-semibold text-texto">Cuánto tiempo</h2>
        <p>Los datos se borran al terminar la temporada.</p>
        <h2 className="text-lg font-semibold text-texto">Tus derechos</h2>
        <p>
          Puedes pedir que se corrijan o eliminen tus datos en cualquier momento escribiendo al
          administrador de la app, que es quien figura como responsable del tratamiento. Si
          prefieres no aparecer, se elimina tu ficha y el resto de tu grupo seguirá teniendo tus
          datos solo por el canal oficial de la liga.
        </p>
      </div>
    </main>
  );
}
