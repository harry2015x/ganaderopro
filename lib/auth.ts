import { supabase } from "./supabase";

export async function obtenerRolUsuario() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const { data } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("email", session.user.email)
    .single();

  return data?.rol || null;
}