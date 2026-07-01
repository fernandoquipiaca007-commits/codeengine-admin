## 2025-05-14 - Exposure of Supabase Service Role Key in Frontend

**Vulnerability:** The Supabase `SERVICE_ROLE_KEY` was being exposed to the client-side bundle via the `VITE_SUPABASE_SERVICE_ROLE_KEY` environment variable. This key bypasses all Row Level Security (RLS) policies, allowing anyone with access to the frontend bundle to perform any operation on the database.

**Learning:** Vite automatically bundles any environment variable prefixed with `VITE_` into the client-side code. Developers often use this prefix for all variables needed by the app, forgetting that some (like service role keys) must remains strictly server-side.

**Prevention:** Never use the `VITE_` prefix for sensitive keys that should only be used by backend services. Ensure the frontend always uses the anonymous key and enforces RLS. If admin-level operations are needed, they should be performed via a secure backend proxy or Edge Functions where the service role key can be safely stored.
