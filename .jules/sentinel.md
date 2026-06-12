# Sentinel's Security Journal 🛡️

## 2025-05-22 - Exposure of Supabase Service Role Key in Frontend
**Vulnerability:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` was being imported and used within `src/lib/supabase-admin.ts`. In Vite, any environment variable prefixed with `VITE_` is bundled into the client-side code if it is referenced anywhere in the source.
**Learning:** Hardcoding or even using environment variables with the `VITE_` prefix for sensitive secrets like service role keys is extremely dangerous as it exposes full database administrative access to anyone with access to the web application.
**Prevention:** Never prefix sensitive server-side keys with `VITE_`. All administrative operations should be performed via a secure backend API, and the frontend should only ever use the `anon` key coupled with strict Row Level Security (RLS) policies.
