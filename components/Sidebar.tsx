import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-green-800 text-white min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-8">
        🐄 GanaderoPro
      </h1>

      <nav className="flex flex-col gap-4">

        <Link href="/">
          📊 Dashboard
        </Link>

        <Link href="/ganado">
          🐂 Ganado
        </Link>

        <Link href="#">
          💉 Vacunación
        </Link>

        <Link href="#">
          ⚖️ Pesajes
        </Link>

        <Link href="#">
          ❤️ Reproducción
        </Link>

        <Link href="#">
          💰 Costos
        </Link>

      </nav>
    </aside>
  );
}