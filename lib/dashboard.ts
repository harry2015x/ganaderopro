import { supabase } from "./supabase";
import { DashboardResumen } from "@/types";

export async function obtenerResumenDashboard(): Promise<DashboardResumen> {

  // Total animales
  const { count: animalesCount } = await supabase
    .from("animales")
    .select("*", {
      count: "exact",
      head: true,
    });

  // Total pesajes
  const { count: pesajesCount } = await supabase
    .from("Pesaje")
    .select("*", {
      count: "exact",
      head: true,
    });

  // Último peso registrado
  const { data: ultimoRegistro } = await supabase
    .from("Pesaje")
    .select("peso")
    .order("id", {
      ascending: false,
    })
    .limit(1)
    .single();

  // Todos los pesos
  const { data: todosPesajes } = await supabase
    .from("Pesaje")
    .select("peso");

  let pesoPromedio = 0;

  if (todosPesajes && todosPesajes.length > 0) {

    const suma = todosPesajes.reduce(
      (total, item) => total + Number(item.peso),
      0
    );

    pesoPromedio = Number(
      (suma / todosPesajes.length).toFixed(1)
    );

  }

  return {

    totalAnimales: animalesCount ?? 0,

    totalPesajes: pesajesCount ?? 0,

    ultimoPeso: ultimoRegistro?.peso ?? 0,

    pesoPromedio,

  };

}