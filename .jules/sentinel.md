# Sentinel Security Journal 🛡️

## 2025-05-15 - Removed Supabase Service Role Key from Frontend
**Vulnerability:** The Supabase Service Role Key (`VITE_SUPABASE_SERVICE_ROLE_KEY`) was being imported and used in the frontend code via `src/lib/supabase-admin.ts`. This key bypasses Row Level Security (RLS) and provides full administrative access to the database.
**Learning:** Hardcoding or even importing administrative keys in a client-side bundle is a critical security risk as they can be easily extracted from the browser. The application was attempting to use it for "admin data ops", but this should be handled either by RLS on the authenticated user or through a secure backend proxy.
**Prevention:** Never include service role keys or any administrative secrets in frontend environment variables or code. Enforce security via RLS policies and ensure all client-side operations use the minimally privileged authenticated client.
