import Link from "next/link";
export default function GanadoPage() {
    const animales = [
      {
        arete: "001",
        nombre: "Lucera",
        raza: "Brahman",
        peso: 450,
      },
      {
        arete: "002",
        nombre: "Relámpago",
        raza: "Gyr",
        peso: 520,
      },
    ];
  
    return (
      <main className="p-10">
        <Link
  href="/"
  className="inline-block bg-green-700 text-white px-4 py-2 rounded mb-6"
>
  ← Volver al Dashboard
</Link>
        <h1 className="text-4xl font-bold text-green-700 mb-6">
          Inventario Ganadero
        </h1>
  
        <table className="w-full border">
          <thead className="bg-green-700 text-white">
            <tr>
              <th className="p-3">Arete</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Raza</th>
              <th className="p-3">Peso</th>
            </tr>
          </thead>
  
          <tbody>
            {animales.map((animal) => (
              <tr key={animal.arete}>
                <td className="border p-3">{animal.arete}</td>
                <td className="border p-3">{animal.nombre}</td>
                <td className="border p-3">{animal.raza}</td>
                <td className="border p-3">
                  {animal.peso} kg
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    );
  }