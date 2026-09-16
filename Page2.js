import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getMyBusiness } from "@/lib/getMyBusiness";
import OrdersPanel from "@/components/OrdersPanel";

export default async function AdminOrdersPage() {
  const { business } = await getMyBusiness();

  if (!business) {
    redirect("/admin/configuracion");
  }

  const supabase = getSupabaseServerClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*, services(name)")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-ink">
          Pedidos y citas
        </h1>
        <p className="mt-1 text-sm text-muted">
          Tu página pública para clientes es la URL raíz de tu sitio ( / ).
          Slug configurado: <span className="font-medium text-ink">{business.slug}</span>
        </p>
      </div>
      <OrdersPanel initialOrders={orders || []} />
    </div>
  );
}