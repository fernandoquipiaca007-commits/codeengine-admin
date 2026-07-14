## 2025-05-14 - Removed Exposed Supabase Service Role Key

**Vulnerability:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` was being imported and used in the frontend code (`src/lib/supabase-admin.ts`). This key bypasses Row Level Security (RLS) and provides full administrative access to the Supabase database. Because it was prefixed with `VITE_`, it was automatically bundled into the client-side code, exposing it to any user of the application.

**Learning:** Prefixes like `VITE_` in environment variables cause them to be bundled into the browser's JavaScript. Administrative or sensitive keys should never be prefixed this way if they are intended for server-side use only. In a purely frontend application, such keys should be avoided entirely in favor of RLS and authenticated sessions.

**Prevention:**
1. Remove all references to the service role key from frontend code.
2. Ensure all data operations use the authenticated `anon` client, which is governed by RLS.
3. Review `vite-env.d.ts` and environment variables to ensure no sensitive keys are being exposed via the `VITE_` prefix.
4. Remove sensitive console logs that might expose authentication state or internal data structures in production.
