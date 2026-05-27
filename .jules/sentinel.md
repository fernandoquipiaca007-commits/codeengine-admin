# Sentinel Security Journal

## 2025-05-14 - [CRITICAL] Service Role Key Exposure in Browser Bundle
**Vulnerability:** The highly privileged `VITE_SUPABASE_SERVICE_ROLE_KEY` was being included in the client-side bundle. This key bypasses Row Level Security (RLS) and grants full administrative access to the entire database.
**Learning:** In Vite, any environment variable prefixed with `VITE_` is automatically exposed to the frontend. Using such a prefix for administrative secrets like a Supabase service role key is a critical security flaw.
**Prevention:** Never use the `VITE_` prefix for sensitive server-side keys. Enforce Row Level Security (RLS) on the client side and use the `anon` key with authenticated user sessions. Perform administrative actions through a secure backend or restricted RLS policies.
