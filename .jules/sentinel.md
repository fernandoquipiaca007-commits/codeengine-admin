## 2026-06-23 - Enforced RLS by removing Service Role Key
**Vulnerability:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` was exposed to the client-side bundle via Vite's environment variable prefixing. This key bypasses Row Level Security (RLS).
**Learning:** Even if a key is intended for "admin" use, if it's prefixed with `VITE_` it will be bundled into the frontend. Admin dashboards should still use authenticated user sessions with RLS rather than service role keys whenever possible.
**Prevention:** Remove service role keys from client-side code entirely. Use the anonymous key with a valid user session and enforce permissions via RLS policies in the database.
