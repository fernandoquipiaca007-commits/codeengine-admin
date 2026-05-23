## 2026-05-23 - [Information Disclosure via raw alerts]
**Vulnerability:** Use of `alert()` to display raw error objects/messages to end-users.
**Learning:** Multiple pages (`Categories.tsx`, `News.tsx`) and components were found to pass raw `error.message` or the error object itself to `alert()`, which can leak sensitive database schema details or internal system information.
**Prevention:** Always use a centralized error mapping utility (like `mapError`) and a toast/notification system to provide sanitized, user-friendly messages. Technical details should be logged to the console or a logging service, but never shown directly to the user.
