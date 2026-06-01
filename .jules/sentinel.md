## 2024-05-30 - Exposure of Supabase Service Role Key in Frontend

**Vulnerability:** The Supabase `service_role` key was exposed to the client-side code by prefixing it with `VITE_`. This key bypasses all Row Level Security (RLS) policies and allows full administrative access to the database.

**Learning:** Any environment variable prefixed with `VITE_` in a Vite project is automatically bundled into the client-side code and is visible to anyone inspecting the network traffic or the bundled JavaScript. Using it for administrative secrets is a critical security flaw.

**Prevention:** Never use the `VITE_` prefix for sensitive server-side secrets. All administrative data operations in a frontend application should be governed by Row Level Security (RLS) and use the authenticated anonymous client, or be proxied through a secure backend API that does not expose the service role key to the browser.
