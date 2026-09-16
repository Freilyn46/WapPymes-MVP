# Bot de reservas por WhatsApp

Esta función recibe mensajes de WhatsApp Cloud API, crea la reserva en
`bookings` y responde al cliente inmediatamente.

## Formato del mensaje

```text
RESERVAR slug-del-negocio|Nombre del servicio|AAAA-MM-DD|HH:MM|Nombre del cliente
```

Ejemplo:

```text
RESERVAR demo-negocio|Corte de cabello|2026-09-20|16:00|Juan Pérez
```

## Configuración

Desde la carpeta del proyecto:

```bash
supabase functions deploy whatsapp-bot
supabase secrets set \
  WHATSAPP_VERIFY_TOKEN="crea-un-token-largo" \
  WHATSAPP_APP_SECRET="app-secret-de-Meta" \
  WHATSAPP_ACCESS_TOKEN="token-de-Meta" \
  WHATSAPP_PHONE_NUMBER_ID="id-del-numero-de-Meta"
```

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son variables reservadas de
Supabase Edge Functions. La service role key nunca debe ir en GitHub Pages ni
en el navegador.

En Meta Developers configura como callback:

```text
https://<PROJECT_REF>.supabase.co/functions/v1/whatsapp-bot
```

Usa el mismo `WHATSAPP_VERIFY_TOKEN`, verifica el webhook y suscríbelo al
evento `messages`.
