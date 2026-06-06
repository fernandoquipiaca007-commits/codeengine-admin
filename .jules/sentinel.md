# Sentinel Security Journal

## 2026-05-28 - Removal of VITE_SUPABASE_SERVICE_ROLE_KEY to prevent database bypass
**Vulnerability:** Exposure of the Supabase service role key (VITE_SUPABASE_SERVICE_ROLE_KEY) in the client-side bundle allows any user to bypass Row Level Security (RLS) and perform administrative actions on the database.
**Learning:** Hardcoding or including administrative keys in frontend environment variables is a critical security risk as they are bundled into the public JavaScript. Even if used "carefully" in the frontend, they are accessible to anyone inspecting the network traffic or the source code.
**Prevention:** Always enforce Row Level Security (RLS) and use the 'anon' key with user-specific JWTs for frontend operations. Administrative tasks should be handled via a secure backend or Supabase Edge Functions where secrets are not exposed to the client.
