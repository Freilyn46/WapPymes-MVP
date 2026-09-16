import { getSupabaseServerClient } from "@/lib/supabaseServer";

/**
 * Devuelve el negocio del usuario autenticado (MVP de un solo negocio por
 * cuenta). Si el usuario aún no ha creado su negocio, retorna null.
 */
export async function getMyBusiness() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, business: null };

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  return { user, business: business || null };
}