# Sentinel's Journal 🛡️

## 2026-05-28 - [CRITICAL] Exposure of Supabase Service Role Key in Frontend
**Vulnerability:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` was being imported and used in the client-side code (`src/lib/supabase-admin.ts`).
**Learning:** Hardcoding or importing administrative keys (like Supabase `service_role`) into a browser-based application exposes them to anyone who visits the site. This key bypasses Row Level Security (RLS) entirely, giving full administrative access to the database.
**Prevention:** Never include administrative keys in frontend environment variables or code. All data operations in the frontend must use the `anon` key and rely on RLS policies for security. If administrative actions are needed, they should be performed via a secure backend API that keeps the `service_role` key server-side.
