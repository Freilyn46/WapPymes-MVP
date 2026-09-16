"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

const links = [
  { href: "/admin", label: "Pedidos" },
  { href: "/admin/servicios", label: "Servicios" },
  { href: "/admin/horarios", label: "Horarios" },
  { href: "/admin/configuracion", label: "Configuración" },
];

export default function AdminNav({ businessName }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="font-display text-sm font-semibold text-ink">
            {businessName || "CitaFlow"}
          </p>
          <p className="text-xs text-muted">Panel del negocio</p>
        </div>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-ticket px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            onClick={handleSignOut}
            className="ml-1 rounded-ticket px-3 py-1.5 text-sm font-medium text-muted hover:text-ink"
          >
            Cerrar sesión
          </button>
        </nav>
      </div>
    </header>
  );
}