import { supabase } from "../supabase";
import { Notificacion } from "@/types";

export async function revisarPesajes(): Promise<Notificacion[]> {

  const notificaciones: Notificacion[] = [];

  const { data: animales } = await supabase
    .from("animales")
    .select("*");

  if (!animales) return [];

  for (const animal of animales) {

    const { data: ultimoPesaje } = await supabase
      .from("Pesaje")
      .select("fecha")
      .eq("animal_id", animal.id)
      .order("fecha", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!ultimoPesaje) {

      notificaciones.push({
        id: animal.id,

        titulo: "Animal sin pesajes",

        descripcion: `${animal.nombre} aún no tiene registros de peso.`,

        tipo: "pesaje",

        prioridad: "alta",

        fecha: new Date().toISOString(),

        leida: false,

        animalId: animal.id,

        animalNombre: animal.nombre,

        animalArete: animal.arete,

        accion: "Registrar pesaje",

        url: `/pesajes?animal=${animal.id}`,

        icono: "⚖️",
      });

      continue;
    }

    const dias = Math.floor(
      (Date.now() - new Date(ultimoPesaje.fecha).getTime()) /
      (1000 * 60 * 60 * 24)
    );

    if (dias >= 30) {

      notificaciones.push({

        id: animal.id + 1000,

        titulo: "Pesaje pendiente",

        descripcion: `${animal.nombre} lleva ${dias} días sin pesaje.`,

        tipo: "pesaje",

        prioridad: dias >= 60 ? "critica" : "media",

        fecha: new Date().toISOString(),

        leida: false,

        animalId: animal.id,

        animalNombre: animal.nombre,

        animalArete: animal.arete,

        accion: "Registrar pesaje",

        url: `/pesajes?animal=${animal.id}`,

        icono: "⚖️",
      });

    }

  }

  return notificaciones;

}