"use client";

import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { buildOrderMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

const initialForm = {
  serviceId: "",
  date: "",
  time: "",
  customerName: "",
  customerPhone: "",
  detail: "",
};

export default function BookingForm({ business, services }) {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState("");

  const selectedService = useMemo(
    () => services.find((s) => s.id === form.serviceId) || null,
    [services, form.serviceId]
  );

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const isValid = form.customerName.trim().length > 1 && form.customerPhone.trim().length >= 7;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid) {
      setErrorMsg("Escribe tu nombre y un teléfono válido para continuar.");
      return;
    }
    setErrorMsg("");
    setStatus("sending");

    const message = buildOrderMessage({
      businessName: business.name,
      serviceName: selectedService?.name,
      date: form.date,
      time: form.time,
      customerName: form.customerName,
      detail: form.detail,
    });
    const whatsappUrl = buildWhatsAppUrl(business.whatsapp_phone, message);

    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.from("orders").insert({
        business_id: business.id,
        service_id: form.serviceId || null,
        customer_name: form.customerName.trim(),
        customer_phone: form.customerPhone.trim(),
        requested_date: form.date || null,
        requested_time: form.time || null,
        detail: form.detail || null,
      });
      // El pedido se registra igual aunque falle el insert: lo prioritario
      // es que el cliente pueda contactar al negocio por WhatsApp.
    } catch (err) {
      // No bloqueamos el envío por un error de guardado.
    } finally {
      setStatus("sent");
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {services.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-ink">
            ¿Qué necesitas?
          </h2>
          <div className="flex flex-col gap-2">
            {services.map((service) => {
              const active = service.id === form.serviceId;
              return (
                <button
                  type="button"
                  key={service.id}
                  onClick={() =>
                    update("serviceId", active ? "" : service.id)
                  }
                  className={`flex items-start justify-between gap-3 rounded-ticket border px-4 py-3 text-left transition-colors ${
                    active
                      ? "border-brand-500 bg-brand-50"
                      : "border-line bg-white hover:border-brand-300"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-medium text-ink">
                      {service.name}
                    </span>
                    {service.description && (
                      <span className="mt-0.5 block text-xs text-muted">
                        {service.description}
                      </span>
                    )}
                    {service.duration_minutes && (
                      <span className="mt-0.5 block text-xs text-muted">
                        {service.duration_minutes} min
                      </span>
                    )}
                  </span>
                  {service.price != null && (
                    <span className="whitespace-nowrap text-sm font-semibold text-brand-600">
                      RD$ {Number(service.price).toLocaleString("es-DO")}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-field" htmlFor="date">
            Fecha (opcional)
          </label>
          <input
            id="date"
            type="date"
            className="input-field"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
          />
        </div>
        <div>
          <label className="label-field" htmlFor="time">
            Hora (opcional)
          </label>
          <input
            id="time"
            type="time"
            className="input-field"
            value={form.time}
            onChange={(e) => update("time", e.target.value)}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <label className="label-field" htmlFor="customerName">
            Tu nombre
          </label>
          <input
            id="customerName"
            type="text"
            required
            className="input-field"
            placeholder="Juan Pérez"
            value={form.customerName}
            onChange={(e) => update("customerName", e.target.value)}
          />
        </div>
        <div>
          <label className="label-field" htmlFor="customerPhone">
            Tu teléfono
          </label>
          <input
            id="customerPhone"
            type="tel"
            required
            className="input-field"
            placeholder="809 555 1234"
            value={form.customerPhone}
            onChange={(e) => update("customerPhone", e.target.value)}
          />
        </div>
        <div>
          <label className="label-field" htmlFor="detail">
            Nota adicional (opcional)
          </label>
          <textarea
            id="detail"
            rows={3}
            className="input-field resize-none"
            placeholder="Ej: prefiero después de las 3pm"
            value={form.detail}
            onChange={(e) => update("detail", e.target.value)}
          />
        </div>
      </section>

      <OrderTicket business={business} service={selectedService} form={form} />

      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

      <button type="submit" className="btn-primary w-full" disabled={status === "sending"}>
        {status === "sending" ? "Abriendo WhatsApp…" : "Enviar por WhatsApp"}
      </button>

      {status === "sent" && (
        <p className="text-center text-xs text-muted">
          Si no se abrió WhatsApp automáticamente, revisa que tu navegador
          permita ventanas emergentes e inténtalo de nuevo.
        </p>
      )}
    </form>
  );
}

function OrderTicket({ business, service, form }) {
  const hasContent =
    service || form.date || form.time || form.customerName || form.detail;

  return (
    <section className="card border-dashed">
      <p className="mb-3 font-display text-xs font-semibold uppercase tracking-wide text-muted">
        Resumen para {business.name}
      </p>
      {!hasContent ? (
        <p className="text-sm text-muted">
          Completa el formulario y aquí verás lo que se enviará por WhatsApp.
        </p>
      ) : (
        <dl className="flex flex-col gap-2 text-sm">
          {service && (
            <Row label="Servicio" value={service.name} />
          )}
          {form.date && <Row label="Fecha" value={form.date} />}
          {form.time && <Row label="Hora" value={form.time} />}
          {form.customerName && (
            <Row label="Cliente" value={form.customerName} />
          )}
          {form.detail && <Row label="Nota" value={form.detail} />}
        </dl>
      )}
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-line pb-2 last:border-none last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}