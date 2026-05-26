# Sentinel's Security Journal

## 2025-05-14 - Removed Service Role Key Exposure
**Vulnerability:** The Supabase `service_role` key was being referenced and potentially bundled into the frontend code via `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY`. This key bypasses Row Level Security (RLS) and gives full administrative access to the database.
**Learning:** Even if a secret is not currently set in the environment, its presence in the codebase (including type definitions) creates a critical vulnerability if it's accidentally added to the production environment, as Vite bundles all `VITE_` prefixed variables into the client-side code.
**Prevention:** NEVER use the `service_role` key on the frontend. Always rely on the `anon` key and enforce security via Row Level Security (RLS) policies in the database. All administrative actions should be performed by an authenticated user with the appropriate roles/permissions defined in the database.
