# Sentinel Security Journal

## 2026-05-28 - Removal of VITE_SUPABASE_SERVICE_ROLE_KEY from frontend
**Vulnerability:** The Supabase service role key was exposed in the frontend environment variables and used in the browser bundle.
**Learning:** Hardcoding or including administrative keys like `service_role` in a frontend application allows anyone to bypass Row Level Security (RLS) by extracting the key from the browser.
**Prevention:** Never include administrative secrets in frontend code. Always use the `anon` key and rely on RLS for security. If administrative actions are needed, they should be performed via a secure backend or Supabase Edge Functions.

## 2026-05-30 - Removal of sensitive debug logs in AuthContext
**Vulnerability:** Authentication results and user data were being logged to the console in production-like environments.
**Learning:** Verbose logging can leak sensitive information (PII, session details) to the browser console, where it can be intercepted or viewed by unauthorized parties.
**Prevention:** Disable or remove debug logging in production code. Use a centralized logging service that sanitizes data if logging is necessary.
