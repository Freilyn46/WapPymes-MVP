# Wappymes

Proyecto de landing page con generador de links personalizados y conexión a Supabase.

## Requisitos
- Node.js 18+
- Una cuenta en Supabase
- Un proyecto con la URL y claves

## Instalación

```bash
npm install
```

## Compilar CSS

```bash
npm run build:css
```

## Ejecutar localmente

```bash
npm run dev
```

Luego abre http://localhost:8000

## Supabase

1. Crea un proyecto en Supabase.
2. Copia la URL y las claves a tu `.env`.
3. En la tabla `businesses`, crea una estructura como:

```sql
create table if not exists public.businesses (
  id bigserial primary key,
  slug text unique not null,
  name text,
  created_at timestamptz default now()
);
```

4. En la página, pega tu `URL` y `ANON KEY` para conectar el frontend.

## Funcionalidad principal
- Generador de links personalizados tipo `https://wappymes.com/tu-negocio`
- Copiar al portapapeles
- Guardar slug en Supabase
- Simulador de WhatsApp para enviar reservas o pedidos
