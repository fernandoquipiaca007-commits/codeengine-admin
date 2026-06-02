## 2025-05-15 - Removed exposed Supabase Service Role Key
**Vulnerability:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` was being imported and used in the frontend client-side code (`src/lib/supabase-admin.ts`). This key provides full administrative access to the Supabase database, bypassing all Row Level Security (RLS) policies.
**Learning:** Hardcoding or importing administrative credentials in frontend code is a critical security risk as they are exposed in the browser bundle. Any user can extract this key and gain full control over the database.
**Prevention:** Never expose service role keys or administrative credentials in the frontend. Always use the authenticated anonymous client for client-side operations and enforce security using Supabase Row Level Security (RLS) policies.
