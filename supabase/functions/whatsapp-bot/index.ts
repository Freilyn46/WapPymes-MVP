const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? "";
const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN") ?? "";
const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
const appSecret = Deno.env.get("WHATSAPP_APP_SECRET") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isConfigured() {
  return Boolean(
    supabaseUrl && serviceRoleKey && accessToken && phoneNumberId && appSecret
  );
}

async function validSignature(body: string, signature: string | null) {
  if (!signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  const expected = Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  const received = signature.slice("sha256=".length);
  return received.length === expected.length &&
    [...received].every((character, index) => character === expected[index]);
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}

async function sendWhatsAppMessage(to: string, body: string) {
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`WhatsApp request failed: ${response.status}`);
  }
}

function helpMessage() {
  return [
    "Para reservar, envía:",
    "RESERVAR slug|servicio|AAAA-MM-DD|HH:MM|tu nombre",
    "",
    "Ejemplo:",
    "RESERVAR demo-negocio|Corte de cabello|2026-09-20|16:00|Juan Pérez",
    "",
    "También puedes escribir AYUDA para ver este formato.",
  ].join("\n");
}

function parseReservation(body: string) {
  const match = body.trim().match(/^reservar\s+(.+)$/i);
  if (!match) return null;

  const values = match[1].split("|").map((value) => value.trim());
  if (values.length < 5) return null;

  const [slug, serviceName, date, time, customerName] = values;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (!/^\d{2}:\d{2}$/.test(time) || !customerName) return null;

  return { slug, serviceName, date, time, customerName };
}

async function createReservation(
  reservation: ReturnType<typeof parseReservation>,
  customerPhone: string,
) {
  if (!reservation) return null;

  const businesses = await supabaseRequest(
    `businesses?select=id,name,whatsapp_phone&slug_url=eq.${encodeURIComponent(reservation.slug)}&limit=1`,
  );
  const business = businesses?.[0];
  if (!business) return { error: "No encontré un negocio con ese slug." };

  const services = await supabaseRequest(
    `services?select=id,name&business_id=eq.${business.id}&active=eq.true`,
  );
  const service = services.find(
    (item: { name: string }) =>
      item.name.toLowerCase() === reservation.serviceName.toLowerCase(),
  );

  if (!service) {
    return {
      error: `No encontré el servicio "${reservation.serviceName}". Revisa el nombre y vuelve a intentarlo.`,
    };
  }

  await supabaseRequest("bookings", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      business_id: business.id,
      service_id: service.id,
      customer_name: reservation.customerName,
      customer_phone: customerPhone,
      requested_date: reservation.date,
      requested_time: reservation.time,
      status: "pending",
    }),
  });

  return { business, service };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(request.url);
  if (request.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === verifyToken && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return json({ error: "Invalid webhook verification" }, 403);
  }

  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isConfigured()) return json({ error: "Bot is not configured" }, 500);

  try {
    const rawBody = await request.text();
    if (!await validSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
      return json({ error: "Invalid webhook signature" }, 401);
    }

    const payload = JSON.parse(rawBody);
    const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message || message.type !== "text") return json({ received: true });

    const from = String(message.from ?? "");
    const text = String(message.text?.body ?? "").trim();
    if (!from || !text) return json({ received: true });

    if (/^ayuda$/i.test(text) || !/^reservar\s+/i.test(text)) {
      await sendWhatsAppMessage(from, helpMessage());
      return json({ received: true });
    }

    const result = await createReservation(parseReservation(text), from);
    if (!result || "error" in result) {
      await sendWhatsAppMessage(from, result && "error" in result ? result.error : helpMessage());
      return json({ received: true });
    }

    await sendWhatsAppMessage(
      from,
      `Reserva recibida para ${result.service.name} el ${text.split("|")[2]} a las ${text.split("|")[3]}. ${result.business.name} la confirmará pronto.`,
    );
    return json({ received: true });
  } catch (error) {
    console.error(error);
    return json({ error: "Webhook processing failed" }, 500);
  }
});
