/**
 * Limpia un número de teléfono dejando solo dígitos, listo para wa.me
 */
export function cleanPhone(phone) {
  return (phone || "").replace(/\D/g, "");
}

/**
 * Arma el texto estructurado del pedido/cita que se enviará por WhatsApp.
 */
export function buildOrderMessage({
  businessName,
  serviceName,
  date,
  time,
  customerName,
  detail,
}) {
  const lines = [
    `Hola ${businessName}! Quisiera hacer el siguiente pedido/reserva:`,
    "",
    serviceName ? `Servicio: ${serviceName}` : null,
    date ? `Fecha: ${date}` : null,
    time ? `Hora: ${time}` : null,
    `Cliente: ${customerName}`,
    detail ? `Nota: ${detail}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}

/**
 * Construye la URL final de https://wa.me/ con el mensaje codificado.
 */
export function buildWhatsAppUrl(phone, message) {
  return `https://wa.me/${cleanPhone(phone)}?text=${encodeURIComponent(message)}`;
}