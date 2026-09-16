import { getSupabaseServerClient } from "@/lib/supabaseServer";
import BookingForm from "@/components/BookingForm";

export const dynamic = "force-dynamic";

async function getBusinessData() {
  const slug = process.env.NEXT_PUBLIC_BUSINESS_SLUG;
  const supabase = getSupabaseServerClient();

  if (!slug) return { business: null, services: [] };

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, whatsapp_phone, business_type, logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!business) return { business: null, services: [] };

  const { data: services } = await supabase
    .from("services")
    .select("id, name, description, price, duration_minutes")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("created_at", { ascending: true });

  return { business, services: services || [] };
}

export default async function PublicBookingPage() {
  const { business, services } = await getBusinessData();

  if (!business) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-display text-xl font-semibold text-ink">
          Este negocio aún no está configurado
        </h1>
        <p className="text-sm text-muted">
          Verifica que NEXT_PUBLIC_BUSINESS_SLUG en tu .env.local coincida con
          el slug creado en la tabla businesses de Supabase.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-16 pt-10">
      <header className="mb-8">
        {business.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logo_url}
            alt={business.name}
            className="mb-4 h-14 w-14 rounded-ticket object-cover"
          />
        ) : (
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-ticket bg-brand-500 font-display text-xl font-bold text-white">
            {business.name.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="font-display text-2xl font-semibold leading-snug text-ink">
          {business.name}
        </h1>
        {business.business_type && (
          <p className="mt-1 text-sm text-muted">{business.business_type}</p>
        )}
      </header>

      <BookingForm business={business} services={services} />
    </main>
  );
}