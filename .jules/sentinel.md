## 2026-05-28 - Removal of VITE_SUPABASE_SERVICE_ROLE_KEY from Frontend
**Vulnerability:** Exposure of `VITE_SUPABASE_SERVICE_ROLE_KEY` in the browser bundle.
**Learning:** The service role key bypasses Row Level Security (RLS) entirely. Even if used "carefully" in the frontend, it is accessible to any user who inspects the application bundle, allowing them to perform any database operation with full administrative privileges.
**Prevention:** Never include the service role key in frontend code or environment variables exposed to the frontend (like those prefixed with `VITE_` in Vite). All data operations in the frontend must use an authenticated client governed by RLS. If administrative actions are needed that cannot be handled via RLS, they should be performed via a secure backend API.
