import { Animal } from "./types";

type AnimalHeaderProps = {
  animal: Animal;
};

export default function AnimalHeader({
  animal,
}: AnimalHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-green-700 via-green-600 to-emerald-600 rounded-3xl shadow-xl overflow-hidden mb-8">

      <div className="p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">

        <div className="w-36 h-36 rounded-full bg-white flex items-center justify-center shadow-lg">

          <span className="text-7xl">
            🐂
          </span>

        </div>

        <div className="text-white flex-1">

          <p className="uppercase tracking-[4px] text-green-100 font-semibold">
            Ficha del Animal
          </p>

          <h1 className="text-5xl font-black mt-2">
            {animal.nombre}
          </h1>

          <div className="flex flex-wrap gap-3 mt-5">

            <span className="bg-white/20 px-4 py-2 rounded-full">
              🏷 Arete #{animal.arete}
            </span>

            <span className="bg-white/20 px-4 py-2 rounded-full">
              🐄 {animal.raza}
            </span>

            <span className="bg-white/20 px-4 py-2 rounded-full">
              ⚥ {animal.sexo ?? "Sin registro"}
            </span>

          </div>

        </div>

      </div>

    </div>
  );
}