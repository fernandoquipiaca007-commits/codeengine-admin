## 2025-05-22 - [CRITICAL] Removal of Supabase Service Role Key from Frontend
**Vulnerability:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` was being imported and used to initialize a `SupabaseClient` in the frontend code.
**Learning:** This key bypasses Row Level Security (RLS) and provides full administrative access to the database. Including it in a client-side bundle (Vite) exposes it to anyone who visits the site, allowing them to bypass all security controls.
**Prevention:** Always use the `ANON_KEY` in the frontend and enforce security through Row Level Security (RLS) policies. Service role keys should only ever be used in secure, server-side environments.
