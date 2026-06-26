import { Notificacion } from "@/types";

export async function generarInteligencia(
  notificaciones: Notificacion[]
): Promise<Notificacion[]> {

  const inteligentes: Notificacion[] = [];

  //--------------------------------------------------
  // Regla 1
  //--------------------------------------------------

  const pendientesPesaje = notificaciones.filter(
    n => n.tipo === "pesaje"
  );

  if (pendientesPesaje.length >= 5) {

    inteligentes.push({

      id: 900000,

      titulo: "Atención",

      descripcion:
        `Hay ${pendientesPesaje.length} animales con pesajes pendientes.`,

      tipo: "sistema",

      prioridad: "alta",

      fecha: new Date().toISOString(),

      leida: false,

      accion: "Revisar animales",

      url: "/pesajes",

      icono: "🧠",

    });

  }

  return inteligentes;

}