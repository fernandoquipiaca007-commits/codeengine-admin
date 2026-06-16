## 2025-05-15 - Exposure of Supabase Service Role Key in Frontend
**Vulnerability:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` was being imported and used in `src/lib/supabase-admin.ts`, and defined in `src/vite-env.d.ts`. This key bypasses Row Level Security (RLS) and should never be exposed in a browser bundle.
**Learning:** Hardcoded or environment-variable-driven admin keys are often accidentally included in client-side code when sharing logic between frontend and backend or when attempting to perform "admin" actions directly from the UI.
**Prevention:** Always enforce RLS on the client side by using the anonymous key and authenticated user sessions. Sensitive administrative operations should be performed via a secure backend API that validates the user's role and permissions.
