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

El comando genera automáticamente `config.js` (ignorado por git) y abre el servidor en http://localhost:8000. Para una versión estática compilada:

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

## Supabase

1. Abre el SQL Editor de Supabase y ejecuta `supabase-schema.sql`.
2. En la landing crea un nombre, slug y teléfono; guarda el negocio.
3. Abre el enlace generado (`business.html?slug=tu-negocio`) para probar la lectura por slug.
4. Inserta servicios opcionales en `services`; la página pública los cargará automáticamente.
5. Completa una reserva: se registra en `bookings` y se abre un mensaje codificado en WhatsApp.
