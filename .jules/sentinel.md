# Sentinel's Journal

This journal documents critical security learnings and vulnerability patterns found in the AI Knowledge Store Admin Dashboard.


## 2026-07-03 - Removed Exposed Supabase Service Role Key
**Vulnerability:** The Supabase `VITE_SUPABASE_SERVICE_ROLE_KEY` was being imported and used in the frontend code via `src/lib/supabase-admin.ts`. Since Vite prefixes starting with `VITE_` are bundled into the client-side code, this administrative key was exposed to anyone visiting the site.
**Learning:** Hardcoded or environment-variable-driven admin keys are often accidentally included in client-side code when sharing logic between frontend and backend. Always enforce RLS on the client side using the anonymous key and keep administrative operations on the server side.
**Prevention:** Never use the `VITE_` prefix for sensitive server-side keys. Ensure that the frontend only uses the `anon` key and rely on Row Level Security (RLS) for data protection.
