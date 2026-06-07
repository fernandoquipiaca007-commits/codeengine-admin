## 2026-06-07 - [Exposed Supabase Service Role Key]
**Vulnerability:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` was being bundled in the frontend and used to initialize a Supabase client (`getDataClient`) that bypassed all Row Level Security (RLS) policies.
**Learning:** Hardcoding or including administrative keys in the client-side bundle allows any user to bypass database security rules. Service role keys should only be used in secure, server-side environments.
**Prevention:** Always use the anonymous key with Row Level Security (RLS) for frontend database interactions. Any operations requiring administrative privileges should be moved to a secure backend or controlled via strict RLS policies bound to the user's session.
