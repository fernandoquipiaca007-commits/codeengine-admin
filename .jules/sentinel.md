## 2025-05-14 - Log and Error Sanitization
**Vulnerability:** Information leakage through verbose console logs and technical error messages.
**Learning:** Hardcoded `console.log` statements used for debugging during development often persist into production, leaking authentication flow details and user metadata. Similarly, passing raw database error messages to the client can expose internal schema details and system state.
**Prevention:** Always sanitize logs before commit. Implement centralized error handlers that log technical details to the server/console for admins while returning generic, safe messages to the end-user.
