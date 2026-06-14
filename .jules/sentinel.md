## 2025-05-22 - [CRITICAL] Fixed Supabase Service Role Key exposure in frontend
**Vulnerability:** The Supabase Service Role Key was included in the `ImportMetaEnv` interface and referenced in client-side code (`supabase-admin.ts`). Since Vite bundles environment variables prefixed with `VITE_` into the frontend build, this administrative key would have been exposed to end-users, allowing them to bypass Row Level Security (RLS) and perform unauthorized database operations.
**Learning:** Prefixing environment variables with `VITE_` makes them available in the browser. Service keys, which have "God mode" access, should never be handled or referenced by frontend code. The application should rely on the `anon` key and user-based authentication for all data operations.
**Prevention:**
1. Never prefix server-side secrets with `VITE_`.
2. Explicitly exclude sensitive keys from `vite-env.d.ts` to prevent accidental usage.
3. Use a single authenticated client for all client-side data operations to ensure RLS is always enforced.
