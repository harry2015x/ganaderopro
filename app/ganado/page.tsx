"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function GanadoPage() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  const [arete, setArete] = useState("");
  const [nombre, setNombre] = useState("");
  const [raza, setRaza] = useState("");
  const [peso, setPeso] = useState("");
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null);

  // BUSCADOR DE ANIMALES
const [busqueda, setBusqueda] = useState("");

const [animales, setAnimales] = useState<{
  arete: string;
  nombre: string;
  raza: string;
  peso: number;
}[]>([
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
]);

  useEffect(() => {
    const animalesGuardados = localStorage.getItem("animales");
  
    if (animalesGuardados) {
      setAnimales(JSON.parse(animalesGuardados));
    }
  }, []);
  
  async function guardarAnimal() {

    if (editandoIndex !== null) {
  
      const nuevosAnimales = [...animales];
  
      nuevosAnimales[editandoIndex] = {
        arete,
        nombre,
        raza,
        peso: Number(peso),
      };
  
      setAnimales(nuevosAnimales);
  
      localStorage.setItem(
        "animales",
        JSON.stringify(nuevosAnimales)
      );
  
      setArete("");
      setNombre("");
      setRaza("");
      setPeso("");
  
      setEditandoIndex(null);
      setMostrarFormulario(false);
  
      return;
    }
  
    const nuevoAnimal = {
      arete,
      nombre,
      raza,
      peso: Number(peso),
    };
  
    const { error } = await supabase
  .from("animales")
  .insert([nuevoAnimal]);

  if (error) {
    console.log(error);
    alert(error.message);
    return;
  }

const nuevosAnimales = [...animales, nuevoAnimal];

setAnimales(nuevosAnimales);

localStorage.setItem(
  "animales",
  JSON.stringify(nuevosAnimales)
);

setArete("");
setNombre("");
setRaza("");
setPeso("");

setMostrarFormulario(false);

} // <- ESTA LLAVE CIERRA guardarAnimal()

function eliminarAnimal(index: number) {

    //CONFIRMAR SI QUIERE BORRAR EL REGISTRO//
    if (!confirm("¿Está seguro de eliminar este animal?")) {
      return;
    }
    const nuevosAnimales = animales.filter(
      (_, i) => i !== index
    );
  
    setAnimales(nuevosAnimales);
  
    localStorage.setItem(
      "animales",
      JSON.stringify(nuevosAnimales)
    );
  }

  function editarAnimal(index: number) {
    const animal = animales[index];
  
    setArete(animal.arete);
    setNombre(animal.nombre);
    setRaza(animal.raza);
    setPeso(String(animal.peso));
  
    setEditandoIndex(index);
  
    setMostrarFormulario(true);
  }

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
        

  <button
  onClick={() => setMostrarFormulario(!mostrarFormulario)}
  className="bg-blue-600 text-white px-4 py-2 rounded mb-6 ml-4"
>
  ➕ Registrar Animal
</button>

<div className="mb-6">
  <input
    type="text"
    placeholder="🔍 Buscar por arete o nombre"
    value={busqueda}
    onChange={(e) => setBusqueda(e.target.value)}
    className="border p-3 rounded w-full max-w-md"
  />
</div>

{mostrarFormulario && (
  <div className="bg-white p-6 rounded-lg shadow mb-6 border">
    <h2 className="text-2xl font-bold text-green-700 mb-4">
  {editandoIndex !== null
    ? "Editar Animal"
    : "Registrar Animal"}
</h2>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

    <input
  type="text"
  placeholder="Número de Arete"
  value={arete}
  onChange={(e) => setArete(e.target.value)}
  className="border p-3 rounded"
/>

<input
  type="text"
  placeholder="Nombre"
  value={nombre}
  onChange={(e) => setNombre(e.target.value)}
  className="border p-3 rounded"
/>

<input
  type="text"
  placeholder="Raza"
  value={raza}
  onChange={(e) => setRaza(e.target.value)}
  className="border p-3 rounded"
/>

<input
  type="number"
  placeholder="Peso"
  value={peso}
  onChange={(e) => setPeso(e.target.value)}
  className="border p-3 rounded"
/>

      <input
        type="date"
        className="border p-3 rounded"
      />

      <select className="border p-3 rounded">
        <option>Macho</option>
        <option>Hembra</option>
      </select>

    </div>
    <button
  onClick={guardarAnimal}
  className="mt-4 bg-green-700 text-white px-6 py-3 rounded"
>
  {editandoIndex !== null
    ? "Actualizar Animal"
    : "Guardar Animal"}
</button>
    </div>



)}
<table className="w-full border border-gray-300 mt-6">
  <thead>
    <tr className="bg-green-700 text-white">
      <th className="border p-3">Arete</th>
      <th className="border p-3">Nombre</th>
      <th className="border p-3">Raza</th>
      <th className="border p-3">Peso</th>
      <th className="border p-3">Acciones</th>
    </tr>
  </thead>

  <tbody>
  {animales
  .filter(
    (animal) =>
      animal.arete
        .toLowerCase()
        .includes(busqueda.toLowerCase()) ||
      animal.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase())
  )
  .map((animal, index) => (
  <tr key={index}>
    <td className="border p-3">{animal.arete}</td>
    <td className="border p-3">{animal.nombre}</td>
    <td className="border p-3">{animal.raza}</td>
    <td className="border p-3">{animal.peso} kg</td>

    <td className="border p-3 text-center">

<button
  onClick={() => editarAnimal(index)}
  className="bg-yellow-500 text-white px-3 py-1 rounded mr-2"
>
  ✏️ Editar
</button>

<button
  onClick={() => eliminarAnimal(index)}
  className="bg-red-600 text-white px-3 py-1 rounded"
>
  🗑️ Eliminar
</button>

</td>
  </tr>
))}


  </tbody>
</table>


</main>
);
}