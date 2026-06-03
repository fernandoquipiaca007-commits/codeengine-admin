## 2026-05-28 - Removal of Service Role Key from Frontend
**Vulnerability:** The Supabase Service Role Key was exposed to the frontend, which could allow any user to bypass Row Level Security (RLS) if they extracted the key from the browser bundle.
**Learning:** Hardcoding or including administrative keys in client-side environment variables (`VITE_*`) is a critical security risk as they are bundled into the public assets.
**Prevention:** Always use the Anonymous key on the frontend and enforce security via Row Level Security (RLS). Administrative operations should be handled by a secure backend.
