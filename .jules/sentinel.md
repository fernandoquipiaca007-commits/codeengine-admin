## 2025-05-15 - Removed Supabase Service Role Key Exposure
**Vulnerability:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` was being imported and potentially used in frontend code.
**Learning:** Hardcoded or environment-variable-driven admin keys are often accidentally included in client-side code when sharing logic between frontend and backend.
**Prevention:** Sensitive keys must never use the `VITE_` prefix if they are intended to remain private. Always enforce RLS on the client side using the anonymous key.
