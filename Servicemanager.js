"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  duration_minutes: "",
};

export default function ServicesManager({ businessId, initialServices }) {
  const [services, setServices] = useState(initialServices);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startEdit(service) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description || "",
      price: service.price ?? "",
      duration_minutes: service.duration_minutes ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    const supabase = getSupabaseBrowserClient();
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.price === "" ? null : Number(form.price),
      duration_minutes:
        form.duration_minutes === "" ? null : Number(form.duration_minutes),
    };

    if (editingId) {
      const { data } = await supabase
        .from("services")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
      setServices((prev) =>
        prev.map((s) => (s.id === editingId ? data : s))
      );
    } else {
      const { data } = await supabase
        .from("services")
        .insert({ ...payload, business_id: businessId, active: true })
        .select()
        .single();
      if (data) setServices((prev) => [data, ...prev]);
    }

    setSaving(false);
    cancelEdit();
  }

  async function toggleActive(service) {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from("services")
      .update({ active: !service.active })
      .eq("id", service.id)
      .select()
      .single();
    setServices((prev) => prev.map((s) => (s.id === service.id ? data : s)));
  }

  async function removeService(service) {
    if (!confirm(`¿Eliminar "${service.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    const supabase = getSupabaseBrowserClient();
    await supabase.from("services").delete().eq("id", service.id);
    setServices((prev) => prev.filter((s) => s.id !== service.id));
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleSubmit} className="card flex flex-col gap-4">
        <p className="text-sm font-medium text-ink">
          {editingId ? "Editar servicio" : "Agregar servicio o producto"}
        </p>
        <div>
          <label className="label-field" htmlFor="name">
            Nombre
          </label>
          <input
            id="name"
            className="input-field"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Corte de pelo + barba"
          />
        </div>
        <div>
          <label className="label-field" htmlFor="description">
            Descripción (opcional)
          </label>
          <input
            id="description"
            className="input-field"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field" htmlFor="price">
              Precio (RD$)
            </label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              className="input-field"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
            />
          </div>
          <div>
            <label className="label-field" htmlFor="duration">
              Duración (min)
            </label>
            <input
              id="duration"
              type="number"
              min="0"
              className="input-field"
              value={form.duration_minutes}
              onChange={(e) => update("duration_minutes", e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Agregar"}
          </button>
          {editingId && (
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="flex flex-col gap-3">
        {services.length === 0 && (
          <p className="text-sm text-muted">
            Aún no has agregado servicios o productos.
          </p>
        )}
        {services.map((service) => (
          <div key={service.id} className="card flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">
                {service.name}
                {!service.active && (
                  <span className="ml-2 text-xs font-normal text-muted">
                    (oculto)
                  </span>
                )}
              </p>
              {service.description && (
                <p className="mt-0.5 text-xs text-muted">{service.description}</p>
              )}
              <p className="mt-1 text-xs text-muted">
                {service.price != null ? `RD$ ${service.price}` : "Sin precio"}
                {service.duration_minutes ? ` · ${service.duration_minutes} min` : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                onClick={() => startEdit(service)}
                className="rounded-ticket border border-line px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
              >
                Editar
              </button>
              <button
                onClick={() => toggleActive(service)}
                className="rounded-ticket border border-line px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
              >
                {service.active ? "Ocultar" : "Mostrar"}
              </button>
              <button
                onClick={() => removeService(service)}
                className="rounded-ticket border border-line px-3 py-1.5 text-xs font-medium text-red-600 hover:border-red-300"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}