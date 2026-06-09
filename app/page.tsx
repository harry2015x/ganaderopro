export default function Home() {
  return (
    <main className="min-h-screen bg-green-50 p-10">
      <h1 className="text-5xl font-bold text-green-800">
        🐄 GanaderoPro
      </h1>

      <p className="mt-4 text-xl text-gray-700">
        Sistema de gestión ganadera para la Orinoquía
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-2xl font-bold text-green-700">
            Inventario
          </h2>

          <p className="mt-2">
            Total animales registrados
          </p>

          <p className="text-4xl font-bold mt-4">
            250
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-2xl font-bold text-blue-700">
            Vacunación
          </h2>

          <p className="mt-2">
            Próximas vacunas
          </p>

          <p className="text-4xl font-bold mt-4">
            18
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-2xl font-bold text-orange-600">
            Pesajes
          </h2>

          <p className="mt-2">
            Pendientes este mes
          </p>

          <p className="text-4xl font-bold mt-4">
            32
          </p>
        </div>

      </div>
    </main>
  );
}