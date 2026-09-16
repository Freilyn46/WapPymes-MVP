"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

const STATUS_LABEL = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  completado: "Completado",
  cancelado: "Cancelado",
};

const STATUS_STYLE = {
  pendiente: "bg-amber-400/20 text-amber-600",
  confirmado: "bg-brand-50 text-brand-700",
  completado: "bg-line text-muted",
  cancelado: "bg-red-50 text-red-600",
};

export default function OrdersPanel({ initialOrders }) {
  const [orders, setOrders] = useState(initialOrders);
  const [filter, setFilter] = useState("todos");

  async function updateStatus(orderId, status) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
    const supabase = getSupabaseBrowserClient();
    await supabase.from("orders").update({ status }).eq("id", orderId);
  }

  const visibleOrders =
    filter === "todos" ? orders : orders.filter((o) => o.status === filter);

  if (orders.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-sm text-muted">
          Todavía no has recibido pedidos. Comparte el enlace de tu página
          pública para empezar a recibirlos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {["todos", "pendiente", "confirmado", "completado", "cancelado"].map(
          (key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-ticket px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === key
                  ? "bg-ink text-white"
                  : "bg-white text-muted hover:text-ink border border-line"
              }`}
            >
              {key === "todos" ? "Todos" : STATUS_LABEL[key]}
            </button>
          )
        )}
      </div>

      <div className="flex flex-col gap-3">
        {visibleOrders.map((order) => (
          <div key={order.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {order.customer_name}
                </p>
                <p className="text-xs text-muted">{order.customer_phone}</p>
              </div>
              <span
                className={`rounded-ticket px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[order.status]}`}
              >
                {STATUS_LABEL[order.status]}
              </span>
            </div>

            <dl className="mt-3 flex flex-col gap-1 text-sm">
              {order.services?.name && (
                <div className="flex justify-between">
                  <dt className="text-muted">Servicio</dt>
                  <dd className="font-medium text-ink">
                    {order.services.name}
                  </dd>
                </div>
              )}
              {order.requested_date && (
                <div className="flex justify-between">
                  <dt className="text-muted">Fecha</dt>
                  <dd className="font-medium text-ink">
                    {order.requested_date}
                    {order.requested_time ? ` · ${order.requested_time}` : ""}
                  </dd>
                </div>
              )}
              {order.detail && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Nota</dt>
                  <dd className="text-right text-ink">{order.detail}</dd>
                </div>
              )}
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              {Object.keys(STATUS_LABEL)
                .filter((s) => s !== order.status)
                .map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(order.id, s)}
                    className="rounded-ticket border border-line px-3 py-1.5 text-xs font-medium text-muted hover:border-brand-500 hover:text-brand-600"
                  >
                    Marcar {STATUS_LABEL[s].toLowerCase()}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}