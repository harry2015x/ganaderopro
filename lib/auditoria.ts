import { supabase } from "./supabase";

export async function registrarAuditoria(
  usuarioId: string,
  usuarioNombre: string,
  accion: string,
  modulo: string,
  descripcion: string
) {
  await supabase
    .from("auditoria")
    .insert({
      usuario_id: usuarioId,
      usuario_nombre: usuarioNombre,
      accion,
      modulo,
      descripcion,
    });
}