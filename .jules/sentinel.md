# Sentinel Security Journal

## 2025-05-22 - Service Role Key Exposure in Frontend
**Vulnerability:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` was being included in the Vite environment variables and used in `src/lib/supabase-admin.ts`. Since Vite bundles variables prefixed with `VITE_` into the client-side code, this administrative key (which bypasses Row Level Security) was exposed to the browser.
**Learning:** Hardcoded or environment-variable-driven admin keys are often accidentally included in client-side code when sharing logic between frontend and backend.
**Prevention:** Never use the `VITE_` prefix for sensitive server-side keys. Always enforce RLS on the client side using the anonymous key and a valid user session.
