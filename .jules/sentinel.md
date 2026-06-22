## 2025-05-15 - Exposure of Supabase Service Role Key in Frontend
**Vulnerability:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` was included in the frontend environment variables and used to initialize a Supabase client in the browser.
**Learning:** Vite automatically bundles any environment variable prefixed with `VITE_` into the client-side code. Using the service role key on the client side bypasses Row Level Security (RLS) and gives anyone with access to the site full administrative control over the Supabase database.
**Prevention:** Never prefix sensitive server-side keys with `VITE_`. Administrative operations should be performed on a secure backend, or the frontend should strictly use the anonymous key and rely on RLS for security.
