## 2025-05-14 - Removed Service Role Key Exposure
**Vulnerability:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` was being included in the frontend bundle through `src/lib/supabase-admin.ts`. This key bypasses Row Level Security (RLS) and provides full administrative access to the Supabase project.
**Learning:** Vite environment variables prefixed with `VITE_` are automatically bundled into the client-side code. Developers often use these variables for both frontend and backend logic when sharing code.
**Prevention:** Sensitive keys should never use the `VITE_` prefix if they are intended for server-side use only. For frontend applications, always enforce Row Level Security (RLS) on the database and use the anonymous key with proper user authentication.
