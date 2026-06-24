import { supabase } from "./supabase";

export async function registrarAuditoria(
  usuarioId: string,
  usuarioNombre: string,
  accion: string,
  modulo: string,
  descripcion: string
) {
  const { error } = await supabase
    .from("auditoria")
    .insert({
      usuario_id: usuarioId,
      usuario_nombre: usuarioNombre,
      accion,
      modulo,
      descripcion,
    });

  if (error) {
    console.error("ERROR AUDITORIA:", error);
  } else {
    console.log("AUDITORIA REGISTRADA");
  }
}