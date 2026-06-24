export type TipoNotificacion =
  | "vacuna"
  | "pesaje"
  | "reproduccion"
  | "parto"
  | "costo"
  | "inventario"
  | "sistema";

export type PrioridadNotificacion =
  | "baja"
  | "media"
  | "alta"
  | "critica";

export interface Notificacion {
  id: number;

  titulo: string;

  descripcion: string;

  tipo: TipoNotificacion;

  prioridad: PrioridadNotificacion;

  fecha: string;

  leida: boolean;

  animalId?: number;

  animalNombre?: string;

  animalArete?: string;

  accion?: string;

  url?: string;

  icono?: string;
}