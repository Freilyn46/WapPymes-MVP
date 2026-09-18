---
name: WapPymes Supabase and Booking Security
description: "Use when changing Supabase schema, RLS policies, authentication, bookings, services, business ownership, or database calls in WapPymes."
applyTo:
  - "supabase-schema.sql"
  - "supabase.js"
  - "admin.js"
  - "main.js"
---

# Supabase and Booking Rules

- Treat `supabase-schema.sql` as the source of truth for tables, constraints, indexes, and RLS policies.
- Keep browser code limited to the Supabase URL and publishable anon key. Never add a service-role key or private credential to HTML, JavaScript, generated config, or committed files.
- Every private business, service, and booking read or mutation must be authorized through the authenticated owner relationship and matching RLS policy.
- Public booking creation may accept only the fields needed for a reservation. Do not expose arbitrary business records or customer data to unauthenticated users.
- Validate names, phone numbers, dates, times, service ownership, and status values at the UI boundary and the database boundary.
- Prevent duplicate appointments with a database-backed constraint or transaction-safe rule. A client-side lookup alone is not sufficient.
- Use explicit column lists for sensitive queries. Avoid selecting private columns when the screen does not need them.
- When changing a table or policy, update `supabase-schema.sql`, consider existing deployed databases, and document the required migration or SQL Editor step.
- Test both anonymous customer flows and authenticated owner flows, including denied access, invalid input, duplicate submissions, empty results, and database errors.
- Surface user-friendly error messages in the UI without exposing SQL, tokens, stack traces, or internal configuration.