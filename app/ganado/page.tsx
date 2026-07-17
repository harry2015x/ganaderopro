"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import AuthGuard from "../../components/AuthGuard";
import { obtenerRolUsuario } from "../../lib/auth";
import { registrarAuditoria } from "../../lib/auditoria";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Plus, FileSpreadsheet, FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useSearchParams } from "next/navigation";

type Animal = {
  id?: number;
  arete: string;
  nombre: string;
  raza: string;
  peso: number;
  fecha_nacimiento?: string;
  sexo?: string;
};

export default function GanadoPage() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [rol, setRol] = useState<string | null>(null);

  const [arete, setArete] = useState("");
  const [nombre, setNombre] = useState("");
  const [raza, setRaza] = useState("");
  const [peso, setPeso] = useState("");
  const [fecha, setFecha] = useState("");
  const [sexo, setSexo] = useState("Macho");

  // Guarda el ID real del animal en edición (NO la posición en el array)
  const [editandoId, setEditandoId] = useState<number | null>(null);

  // BUSCADOR DE ANIMALES
  const [busqueda, setBusqueda] = useState("");

  const [animales, setAnimales] = useState<Animal[]>([]);

  useEffect(() => {
    cargarAnimales();
    cargarRol();
  }, []);

  async function cargarRol() {
    const rolUsuario = await obtenerRolUsuario();
    setRol(rolUsuario);
  }

  async function cargarAnimales() {
    const { data, error } = await supabase.from("animales").select("*");

    if (error) {
      console.log(error);
      return;
    }

    setAnimales(data || []);
  }

  async function exportarExcel() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Ganado");

    worksheet.columns = [
      { header: "Arete", key: "arete", width: 20 },
      { header: "Nombre", key: "nombre", width: 25 },
      { header: "Raza", key: "raza", width: 25 },
      { header: "Peso", key: "peso", width: 15 },
    ];

    animales.forEach((animal) => {
      worksheet.addRow({
        arete: animal.arete,
        nombre: animal.nombre,
        raza: animal.raza,
        peso: animal.peso,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    saveAs(
      new Blob([buffer]),
      `Inventario_Ganadero_${new Date().toISOString().slice(0, 10)}.xlsx`
    );

    const usuarioGuardado = localStorage.getItem("usuario");

    if (usuarioGuardado) {
      const usuario = JSON.parse(usuarioGuardado);

      await registrarAuditoria(
        usuario.id,
        usuario.nombre,
        "EXPORTAR_EXCEL",
        "GANADO",
        "Usuario exportó inventario ganadero"
      );
    }
  }

  async function exportarPDF() {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("GanaderoPro", 14, 20);

    doc.setFontSize(12);
    doc.text(`Inventario Ganadero - ${new Date().toLocaleDateString()}`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [["Arete", "Nombre", "Raza", "Peso"]],
      body: animales.map((animal) => [
        animal.arete,
        animal.nombre,
        animal.raza,
        `${animal.peso} kg`,
      ]),
    });

    doc.save(`Inventario_Ganadero_${new Date().toISOString().slice(0, 10)}.pdf`);

    const usuarioGuardado = localStorage.getItem("usuario");

    if (usuarioGuardado) {
      const usuario = JSON.parse(usuarioGuardado);

      await registrarAuditoria(
        usuario.id,
        usuario.nombre,
        "EXPORTAR_PDF",
        "GANADO",
        "Usuario exportó inventario ganadero en PDF"
      );
    }
  }

  function limpiarCampos() {
    setArete("");
    setNombre("");
    setRaza("");
    setPeso("");
    setFecha("");
    setSexo("Macho");
    setEditandoId(null);
  }

  function cerrarFormulario() {
    limpiarCampos();
    setMostrarFormulario(false);
  }

  function alternarFormulario() {
    if (mostrarFormulario) {
      cerrarFormulario();
    } else {
      setMostrarFormulario(true);
    }
  }

  async function guardarAnimal() {
    if (editandoId !== null && rol !== "admin") {
      alert("Solo el administrador puede editar animales");
      return;
    }

    if (editandoId !== null) {
      const { error } = await supabase
        .from("animales")
        .update({
          arete,
          nombre,
          raza,
          peso: Number(peso),
          fecha_nacimiento: fecha,
          sexo,
        })
        .eq("id", editandoId);

      if (error) {
        alert(error.message);
        return;
      }

      const usuarioGuardado = localStorage.getItem("usuario");

      if (usuarioGuardado) {
        const usuarioActual = JSON.parse(usuarioGuardado);

        await registrarAuditoria(
          usuarioActual.id,
          usuarioActual.nombre,
          "EDITAR_ANIMAL",
          "GANADO",
          `Animal editado - Arete ${arete}`
        );
      }

      await cargarAnimales();
      cerrarFormulario();
      return;
    }

    const nuevoAnimal = {
      arete,
      nombre,
      raza,
      peso: Number(peso),
      fecha_nacimiento: fecha,
      sexo,
    };

    const { error } = await supabase.from("animales").insert([nuevoAnimal]);

    if (error) {
      console.log(error);
      alert(error.message);
      return;
    }

    const usuarioGuardado = localStorage.getItem("usuario");

    if (usuarioGuardado) {
      const usuario = JSON.parse(usuarioGuardado);

      await registrarAuditoria(
        usuario.id,
        usuario.nombre,
        "CREAR_ANIMAL",
        "GANADO",
        `Animal creado - Arete ${arete}`
      );
    }

    await cargarAnimales();
    cerrarFormulario();
  }

  async function eliminarAnimal(id: number) {
    if (rol !== "admin") {
      alert("Solo el administrador puede eliminar animales");
      return;
    }

    if (!confirm("¿Está seguro de eliminar este animal?")) {
      return;
    }

    const animal = animales.find((a) => a.id === id);
    if (!animal) return;

    const { error } = await supabase.from("animales").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    const usuarioGuardado = localStorage.getItem("usuario");

    if (usuarioGuardado) {
      const usuarioActual = JSON.parse(usuarioGuardado);

      await registrarAuditoria(
        usuarioActual.id,
        usuarioActual.nombre,
        "ELIMINAR_ANIMAL",
        "GANADO",
        `Animal eliminado - Arete ${animal.arete}`
      );
    }

    await cargarAnimales();
  }

  function editarAnimal(id: number) {
    const animal = animales.find((a) => a.id === id);
    if (!animal) return;

    setArete(animal.arete);
    setNombre(animal.nombre);
    setRaza(animal.raza);
    setPeso(String(animal.peso));
    setFecha(animal.fecha_nacimiento ?? "");
    setSexo(animal.sexo ?? "Macho");

    setEditandoId(id);

    setMostrarFormulario(true);
  }

  const animalesFiltrados = animales.filter(
    (animal) =>
      (animal.arete ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
      (animal.nombre ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6 md:p-10">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-green-700 hover:text-green-900 font-medium mb-6 transition-colors"
          >
            ← Volver al Dashboard
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-green-800 to-emerald-600 bg-clip-text text-transparent">
                Inventario Ganadero
              </h1>
              <p className="text-gray-500 mt-1">
                {animales.length}{" "}
                {animales.length === 1 ? "animal registrado" : "animales registrados"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {rol !== "visualizador" && (
                <button
                  onClick={alternarFormulario}
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 active:from-green-800 active:to-emerald-800 text-white font-semibold px-5 py-3 rounded-xl shadow-md shadow-green-900/20 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                  {mostrarFormulario ? "Cancelar registro" : "Registrar Animal"}
                </button>
              )}

              <button
                onClick={exportarExcel}
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-5 py-3 rounded-xl shadow-md shadow-blue-900/20 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all duration-200"
              >
                <FileSpreadsheet className="w-4 h-4" strokeWidth={2.5} />
                Exportar Excel
              </button>

              <button
                onClick={exportarPDF}
                className="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold px-5 py-3 rounded-xl shadow-md shadow-red-900/20 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-all duration-200"
              >
                <FileText className="w-4 h-4" strokeWidth={2.5} />
                Exportar PDF
              </button>
            </div>
          </div>

          {/* Buscador */}
          <div className="mb-6 relative max-w-md">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
            <input
              type="text"
              placeholder="Buscar por arete o nombre"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full border border-gray-200 bg-white/80 backdrop-blur-sm pl-11 pr-4 py-3 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Formulario */}
          {mostrarFormulario && (
            <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg ring-1 ring-gray-100 mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
              <h2 className="text-xl font-bold text-green-700 mb-5 flex items-center gap-2">
                {editandoId !== null ? "✏️ Editar Animal" : "📝 Registrar Animal"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Número de Arete
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 0234"
                    value={arete}
                    onChange={(e) => setArete(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Lucero"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Raza
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Brahman"
                    value={raza}
                    onChange={(e) => setRaza(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 320"
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Sexo
                  </label>
                  <select
                    value={sexo}
                    onChange={(e) => setSexo(e.target.value)}
                    className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    <option value="Macho">Macho</option>
                    <option value="Hembra">Hembra</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={guardarAnimal}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-green-900/20 hover:shadow-lg transition-all"
                >
                  {editandoId !== null ? "Actualizar Animal" : "Guardar Animal"}
                </button>

                <button
                  onClick={cerrarFormulario}
                  className="px-6 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Tabla */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md ring-1 ring-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gradient-to-r from-green-700 to-emerald-700 text-white">
                    <th className="p-4 font-semibold text-sm uppercase tracking-wide">Arete</th>
                    <th className="p-4 font-semibold text-sm uppercase tracking-wide">Nombre</th>
                    <th className="p-4 font-semibold text-sm uppercase tracking-wide">Raza</th>
                    <th className="p-4 font-semibold text-sm uppercase tracking-wide">Peso</th>
                    <th className="p-4 font-semibold text-sm uppercase tracking-wide text-center">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {animalesFiltrados.map((animal) => (
                    <tr key={animal.id} className="hover:bg-green-50/60 transition-colors">
                      <td className="p-4">
                      <Link
  href={`/ganado/${animal.id}`}
  className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold hover:bg-green-200 transition"
>
  {animal.arete}
</Link>
                      </td>
                      <td className="p-4">
  <Link
    href={`/ganado/${animal.id}`}
    className="font-semibold text-green-700 hover:text-green-900 hover:underline transition-colors"
  >
    {animal.nombre}
  </Link>
</td>
                      <td className="p-4 text-gray-600">{animal.raza}</td>
                      <td className="p-4 text-gray-800 font-semibold">{animal.peso} kg</td>

                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          {rol === "admin" && (
                            <button
                              onClick={() => animal.id !== undefined && editarAnimal(animal.id)}
                              className="inline-flex items-center gap-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 text-sm font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                            >
                              ✏️ Editar
                            </button>
                          )}

<Link
  href={`/pesajes?animal=${animal.id}`}
  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold"
>
  ⚖️ Pesajes
</Link>

                          {rol === "admin" && (
                            <button
                              onClick={() => animal.id !== undefined && eliminarAnimal(animal.id)}
                              className="inline-flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                            >
                              🗑️ Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {animalesFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-gray-400">
                        No se encontraron animales{busqueda ? ` para "${busqueda}"` : ""}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}
