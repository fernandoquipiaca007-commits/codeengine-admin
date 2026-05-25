# Sentinel Security Journal

## 2025-05-15 - Exposure of Supabase Service Role Key in Frontend
**Vulnerability:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` was included in the client-side environment variables and used to initialize a Supabase client that bypassed Row Level Security (RLS).
**Learning:** Even in an admin dashboard, the service role key should NEVER be exposed to the browser. Admin access should be controlled via RLS policies and authenticated user sessions, rather than a "god-mode" key that can be extracted from the client-side bundle.
**Prevention:** Remove all logic that depends on the service role key from the frontend. Enforce RLS on all tables and ensure the application logic correctly uses authenticated sessions for administrative tasks. Use server-side functions (Edge Functions or a backend API) for operations that absolutely require the service role key.
