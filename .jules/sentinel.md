# 🛡️ Sentinel's Security Journal

## 2026-05-30 - Exposure of Supabase Service Role Key in Frontend
**Vulnerability:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` was being imported and used in the frontend application via `src/lib/supabase-admin.ts`.
**Learning:** Hardcoding or including administrative keys (like Supabase's `service_role` key) in frontend environment variables is a critical security risk. These keys are bundled into the client-side code and can be easily extracted by anyone, allowing them to bypass all Row Level Security (RLS) policies and gain full administrative access to the database.
**Prevention:** Never expose `service_role` or other administrative keys to the frontend. All database operations from the browser must use the `anon` key combined with proper RLS policies. Operations requiring elevated privileges should be performed through a secure backend API.
