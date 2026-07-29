# essay-learner
helps learn essay structure and vocabulary

## Authentication

The app is configured for one user. Copy `.env.example` to `.env`, choose an
`AUTH_USERNAME`, generate a password hash with `python -m backend.auth`, and
set `AUTH_PASSWORD_HASH` plus a long random `AUTH_SECRET`. Set
`AUTH_COOKIE_SECURE=true` when deploying behind HTTPS.

The health check and login/logout/session endpoints are public by design. All
topic, progress, essay-generation, and paragraph-evaluation endpoints require
the signed HttpOnly session cookie, so the Groq API key is never sent to the
browser.
