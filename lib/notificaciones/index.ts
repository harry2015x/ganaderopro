import { Notificacion } from "@/types";
import { revisarPesajes } from "./pesajes";
import { generarInteligencia } from "./inteligencia";

export async function obtenerNotificaciones(): Promise<Notificacion[]> {

  const notificaciones: Notificacion[] = [];

  const pesajes = await revisarPesajes();

notificaciones.push(...pesajes);

//--------------------------------------
// Inteligencia del sistema
//--------------------------------------

const inteligentes = await generarInteligencia(notificaciones);

notificaciones.push(...inteligentes);

return notificaciones;

}