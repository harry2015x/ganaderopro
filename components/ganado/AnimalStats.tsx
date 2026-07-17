import Card from "./Card";
import { Animal } from "./types";

type AnimalStatsProps = {
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

export default function AnimalStats({
  animal,
}: AnimalStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-8">

      <Card
        titulo="Peso"
        valor={`${animal.peso} kg`}
      />

      <Card
        titulo="Sexo"
        valor={animal.sexo ?? "Sin registro"}
      />

      <Card
        titulo="Raza"
        valor={animal.raza}
      />

      <Card
        titulo="Nacimiento"
        valor={formatearFecha(animal.fecha_nacimiento)}
      />

    </div>
  );
}