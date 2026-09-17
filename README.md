# Wappymes

Proyecto MVP para generar enlaces de negocio y enviar reservas o pedidos por WhatsApp usando Supabase.

## Requisitos
- Node.js 18+
- Python 3
- Un proyecto en Supabase con URL y anon key (publishable key)

## Instalación

```bash
npm install
cp .env.example .env
```

Edita el archivo `.env` con tu proyecto de Supabase. La anon key es segura para el navegador si las políticas RLS del esquema están activadas; nunca pongas una service role key en este archivo:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_anon_key
APP_BASE_URL=http://localhost:8000
```

## Ejecutar localmente

```bash
npm run dev
```

El comando genera automáticamente `app-config.js` (ignorado por git) y abre el servidor en http://localhost:8000. Para una versión estática compilada:

```bash
npm run build:css
npm run start
```

## Funcionalidad principal
- Generador de slugs seguros para cada negocio
- Guardado de negocio en Supabase
- Lectura por slug desde la página pública
- Envío de reserva al WhatsApp del negocio
- Carga de variables de entorno sin claves hardcodeadas
- Bot de WhatsApp Cloud API mediante Supabase Edge Functions

## Supabase

1. Abre el SQL Editor de Supabase y ejecuta `supabase-schema.sql`.
2. En la landing crea un nombre, slug y teléfono; guarda el negocio.
3. Abre el enlace generado (`business.html?slug=tu-negocio`) para probar la lectura por slug.
4. Inserta servicios opcionales en `services`; la página pública los cargará automáticamente.
5. Completa una reserva: se registra en `bookings` y se abre un mensaje codificado en WhatsApp.

## Panel del negocio

Abre `admin.html` desde el sitio publicado para crear una cuenta e iniciar sesión con Supabase. Desde el panel puedes guardar los datos del negocio, agregar servicios y actualizar el estado de las reservas recibidas.

Ejecuta la sección de cambios de `supabase-schema.sql` en el SQL Editor después de actualizar el esquema para habilitar propietarios y políticas del panel.

## Publicar con GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` construye y publica el sitio automáticamente cada vez que hay cambios en `main`.

Antes de activar Pages, crea estos secretos en **Settings → Secrets and variables → Actions**:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

Después, en **Settings → Pages**, selecciona **GitHub Actions** como fuente de despliegue. La aplicación quedará disponible en:

```text
https://freilyn46.github.io/WapPymes-MVP/
```

La configuración de Supabase se genera como `app-config.js` durante el workflow y no se guarda en el repositorio. No uses nunca una `SUPABASE_SERVICE_ROLE_KEY` en el frontend.

## Bot automático de WhatsApp

La función `supabase/functions/whatsapp-bot` recibe mensajes de WhatsApp Cloud API,
crea la reserva inmediatamente en `bookings` y responde al cliente. Requiere
crear una cuenta de WhatsApp Business en Meta, desplegar la función con la CLI
de Supabase y configurar sus secretos. La guía completa está en
`supabase/functions/whatsapp-bot/README.md`.
