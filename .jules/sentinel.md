# Sentinel's Journal

## 2025-05-22 - Supabase Service Role Key Exposure
**Vulnerability:** The Supabase Service Role Key (`VITE_SUPABASE_SERVICE_ROLE_KEY`) was being imported and used in the frontend code (`src/lib/supabase-admin.ts`). This key bypasses Row Level Security (RLS) and should never be exposed in a client-side bundle.
**Learning:** Even if the key is intended for "admin" tasks, including it in the frontend allows anyone with access to the site to extract it and gain full administrative access to the database.
**Prevention:** Always use the `anon` key in the frontend and enforce security via Row Level Security (RLS) policies. Sensitive administrative operations should be performed on a secure backend or through authenticated Supabase clients that respect RLS.

## 2025-05-22 - Sensitive Information Leakage in Logs
**Vulnerability:** The `AuthContext` and `supabase-admin.ts` were logging sensitive information, including user data, authentication event details, and key lengths, to the browser console.
**Learning:** Verbose logging during development often makes its way into production, leaking internal state and user information to anyone who opens the browser's developer tools.
**Prevention:** Remove or sanitize logs before deployment. Use environment-aware logging or dedicated error tracking services that don't expose sensitive data in the client.
