# Google Calendar Integration

This module handles the OAuth 2.0 flow for connecting a professional's Google Calendar to the application. It provides endpoints for initiating the connection, handling the callback from Google, checking the integration status, and disconnecting.

## OAuth 2.0 Flow

The integration follows a secure Authorization Code Flow with CSRF protection:

### 1. Initiation (`GET /connect`)
- Generates a cryptographically signed `state` containing the `profileId`, a `nonce`, and an `issuedAt` timestamp.
- Signs the state using an HMAC (`sha256`) with the system's `BETTER_AUTH_SECRET`.
- Sets a secure, `httpOnly` cookie (`gcal_oauth_state`) with the signed state.
- Redirects the user to Google's consent screen with `access_type: 'offline'` (to obtain a refresh token) and `prompt: 'consent'`.

### 2. Callback (`GET /callback`)
- Receives the `code` and `state` from Google.
- **CSRF Validation:** Verifies that the `state` in the query matches the `state` in the cookie.
- **Cryptographic Validation:** Re-verifies the HMAC signature and checks if the state has expired (TTL: 10 minutes).
- **Token Exchange:** Exchanges the authorization code for an `access_token`, `refresh_token`, and `id_token`.
- **Identity Verification:** Verifies the `id_token` to extract the user's permanent Google ID (`sub`) and email.
- **Persistence:** Upserts the integration details into the `google_calendar_integrations` table.

### 3. Status (`GET /status`)
- Returns the current connection state, the integrated email, and the last sync status for the authenticated professional.

### 4. Disconnect (`POST /disconnect`)
- **Revocation:** Performs a best-effort revocation of the `refresh_token` via Google's OAuth 2.0 revocation endpoint.
- **Cleanup:** Deletes the integration record from the local database.

## Technical Details

- **Scopes:** `calendar.events` (for sync), `openid` (for identity), and `email`.
- **Security:** Uses `crypto.timingSafeEqual` for state verification to prevent timing attacks.
- **Offline Access:** Crucial for background synchronization processes that run when the user is not actively using the application.
