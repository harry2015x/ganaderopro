import { Notificacion } from "@/types";
import { revisarPesajes } from "./pesajes";

export async function obtenerNotificaciones(): Promise<Notificacion[]> {

  const notificaciones: Notificacion[] = [];

  const pesajes = await revisarPesajes();

  notificaciones.push(...pesajes);

  return notificaciones;

}