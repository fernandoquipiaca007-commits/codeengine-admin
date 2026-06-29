## 2025-05-15 - Exposure of Supabase Service Role Key via Vite Environment Variables

**Vulnerability:** The `VITE_SUPABASE_SERVICE_ROLE_KEY` was being included in the client-side bundle because of the `VITE_` prefix. This key bypasses Row Level Security (RLS) and gives full administrative access to the database.

**Learning:** Vite automatically embeds any environment variable prefixed with `VITE_` into the frontend build. Using this prefix for sensitive administrative keys is a critical security risk as it exposes the keys to any user via the browser console or network tab.

**Prevention:** Never prefix sensitive server-side or administrative keys with `VITE_` if they are not intended for client-side use. Enforce Row Level Security (RLS) on the client side by using the anonymous key and authenticated sessions, rather than relying on administrative keys in the browser.
