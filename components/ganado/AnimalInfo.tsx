import { Animal } from "./types";

type AnimalInfoProps = {
  animal: Animal;
};

function formatearFecha(fecha: string | null) {
  if (!fecha) return "No registrada";

  return new Date(fecha).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AnimalInfo({
  animal,
}: AnimalInfoProps) {
  return (
    <div className="px-8 pb-8">

      <div className="rounded-2xl border border-green-100 bg-green-50 p-6">

        <h2 className="text-2xl font-bold text-green-800 mb-6">
          Información General
        </h2>

        <div className="grid md:grid-cols-2 gap-6">

          <Campo
            titulo="Nombre"
            valor={animal.nombre}
          />

          <Campo
            titulo="Arete"
            valor={animal.arete}
          />

          <Campo
            titulo="Sexo"
            valor={animal.sexo ?? "Sin registro"}
          />

          <Campo
            titulo="Raza"
            valor={animal.raza}
          />

          <Campo
            titulo="Peso"
            valor={`${animal.peso} kg`}
          />

          <Campo
            titulo="Fecha de nacimiento"
            valor={formatearFecha(animal.fecha_nacimiento)}
          />

        </div>

      </div>

    </div>
  );
}

function Campo({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div>

      <p className="text-sm text-gray-500">
        {titulo}
      </p>

      <p className="mt-1 text-lg font-semibold text-gray-800">
        {valor}
      </p>

    </div>
  );
}