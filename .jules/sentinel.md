## 2026-05-28 - [CRITICAL] Removal of VITE_SUPABASE_SERVICE_ROLE_KEY from Frontend

**Vulnerability:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` was exposed in the frontend bundle. In Vite, any environment variable prefixed with `VITE_` is baked into the production client-side code, making it visible to anyone who inspects the network traffic or the Javascript source. This key bypasses Row Level Security (RLS) and allows full administrative access to the database.

**Learning:** The application was using the Service Role Key in the frontend to perform "admin" operations. This is a critical security flaw because it gives any user with access to the frontend the ability to bypass all security controls.

**Prevention:** Never prefix sensitive keys with `VITE_` if they are not intended to be public. Move any logic that requires administrative privileges to a secure backend environment (e.g., Supabase Edge Functions or a dedicated Node.js API) and call those endpoints from the frontend with proper authentication. Always enforce Row Level Security (RLS) on all tables.
