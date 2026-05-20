# Authentication

<!-- maturity: ✅ Stable -->
> **✅ Stable** — This feature is ready for production


Zorux includes a complete authentication system with 8 auth methods, 36 OAuth providers, organizations/teams, and enterprise-grade security.

## Overview

| Method | Description |
|---|---|
| Email/Password | Traditional registration with bcrypt hashing |
| JWT | HS256 tokens with configurable expiry |
| Sessions | Refresh tokens (30-day expiry) |
| API Keys | `Zorux_` prefixed keys with optional expiry |
| OAuth/Social | 36 providers (Google, GitHub, Discord, etc.) |
| Magic Link | Passwordless email login |
| Email OTP | 6-digit one-time code |
| WebAuthn | Passkeys/biometric authentication |
| 2FA/TOTP | Google Authenticator compatible |

## Configuration

```yaml
models:
  User:
    fields:
      name: string required
      email: email required unique
      password: string
      role: string enum:admin,user default:user
    auth: password            # ← Makes this the auth model
    timestamps: true

auth:
  model: User                 # Auth model name
  registration: open          # open | invite | admin
  roles: [admin, user]
  defaultRole: user
  passwordMinLength: 8
  sessionExpiry: 24           # hours
  refreshTokenExpiry: 30      # days
  social:
    google:
      clientId: ${GOOGLE_CLIENT_ID}
      clientSecret: ${GOOGLE_CLIENT_SECRET}
  organization:
    enabled: true
    roles: [owner, admin, member]
    inviteExpiresIn: 7
```

## Email/Password

### Register

```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:** Same as register.

### Password Hashing

Passwords are hashed with `Bun.password.hash()` using bcrypt. The hash is stored in the `password` field of the auth model.

## JWT Tokens

### Token Structure

- **Algorithm:** HS256
- **Secret:** `process.env.JWT_SECRET` or `"zorux-dev-secret-change-in-production"`
- **Expiry:** 24 hours (configurable via `sessionExpiry`)
- **Payload:** `{ id, email, role, iat, exp }`

### Using Tokens

**Header:**

```
Authorization: Bearer <token>
```

**Cookie:**

```
Cookie: token=<token>
```

### Refresh Tokens

```bash
POST /api/auth/refresh
Content-Type: application/json

{ "refreshToken": "eyJhbGci..." }
```

Returns new JWT and refresh token. Refresh tokens expire in 30 days.

## Social / OAuth Login

### Supported Providers (36)

| Provider | Config Keys |
|---|---|
| Google | `clientId`, `clientSecret`, `redirectUri` |
| GitHub | `clientId`, `clientSecret` |
| Discord | `clientId`, `clientSecret` |
| Apple | `clientId`, `clientSecret`, `teamId`, `keyId`, `privateKey` |
| Facebook | `clientId`, `clientSecret` |
| Twitter | `clientId`, `clientSecret` |
| LinkedIn | `clientId`, `clientSecret` |
| Microsoft | `clientId`, `clientSecret` |
| Slack | `clientId`, `clientSecret` |
| Spotify | `clientId`, `clientSecret` |
| Twitch | `clientId`, `clientSecret` |
| Reddit | `clientId`, `clientSecret` |
| Atlassian | `clientId`, `clientSecret` |
| Cognito | `clientId`, `clientSecret`, `domain` |
| Dropbox | `clientId`, `clientSecret` |
| Figma | `clientId`, `clientSecret` |
| GitLab | `clientId`, `clientSecret` |
| HuggingFace | `clientId`, `clientSecret` |
| Kakao | `clientId`, `clientSecret` |
| Kick | `clientId`, `clientSecret` |
| Line | `clientId`, `clientSecret` |
| Linear | `clientId`, `clientSecret` |
| Naver | `clientId`, `clientSecret` |
| Notion | `clientId`, `clientSecret` |
| PayPal | `clientId`, `clientSecret` |
| Polar | `clientId`, `clientSecret` |
| Railway | `clientId`, `clientSecret` |
| Roblox | `clientId`, `clientSecret` |
| Salesforce | `clientId`, `clientSecret` |
| TikTok | `clientId`, `clientSecret` |
| Vercel | `clientId`, `clientSecret` |
| VK | `clientId`, `clientSecret` |
| WeChat | `clientId`, `clientSecret` |
| Zoom | `clientId`, `clientSecret` |
| Paybin | `clientId`, `clientSecret` |
| Huawei | `clientId`, `clientSecret` |

### OAuth Flow

1. **Redirect to provider:**

```
GET /api/auth/social/google/authorize
```

Redirects to Google's OAuth consent screen.

2. **Callback:**

```
GET /api/auth/social/google/callback?code=xxx&state=xxx
```

Exchanges code for token, creates/updates user, returns JWT.

3. **Result:**

Redirects to your app with JWT in cookie or URL parameter.

### Social Account Linking

Link multiple OAuth providers to one account:

```bash
POST /api/auth/social/link
Authorization: Bearer <token>
Content-Type: application/json

{ "provider": "github", "code": "xxx" }
```

List linked accounts:

```bash
GET /api/auth/social/accounts
Authorization: Bearer <token>
```

## Magic Link

Passwordless login via email link.

### Send Magic Link

```bash
POST /api/auth/magic-link/send
Content-Type: application/json

{ "email": "john@example.com" }
```

Sends an email with a login link. Token expires in 15 minutes.

### Login via Magic Link

```
GET /api/auth/magic-link?token=<token>
```

Validates token, logs in user, returns JWT.

## Email OTP

One-time password via email.

### Send OTP

```bash
POST /api/auth/otp/send
Content-Type: application/json

{ "email": "john@example.com" }
```

Sends a 6-digit code. Expires in 10 minutes. Single-use only.

### Verify OTP

```bash
POST /api/auth/otp/verify
Content-Type: application/json

{
  "email": "john@example.com",
  "code": "123456"
}
```

Returns JWT on success.

## WebAuthn / Passkeys

Passwordless authentication with biometrics (fingerprint, Face ID) or security keys.

### Setup Registration

```bash
POST /api/auth/webauthn/register/begin
Authorization: Bearer <token>
```

Returns challenge and options for the browser's WebAuthn API.

### Complete Registration

```bash
POST /api/auth/webauthn/register/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "id": "credential-id",
  "rawId": "base64rawid",
  "response": {
    "clientDataJSON": "...",
    "attestationObject": "..."
  },
  "type": "public-key"
}
```

Stores credential in `_webauthn_credentials` table.

### Authenticate

```bash
POST /api/auth/webauthn/auth/begin
Content-Type: application/json

{ "email": "john@example.com" }
```

Returns challenge for authentication.

```bash
POST /api/auth/webauthn/auth/complete
Content-Type: application/json

{
  "id": "credential-id",
  "rawId": "base64rawid",
  "response": {
    "clientDataJSON": "...",
    "authenticatorData": "...",
    "signature": "...",
    "userHandle": "..."
  },
  "type": "public-key"
}
```

Returns JWT on success.

### Manage Credentials

```bash
GET /api/auth/webauthn/credentials
Authorization: Bearer <token>

DELETE /api/auth/webauthn/credentials/:id
Authorization: Bearer <token>
```

## 2FA / TOTP

Time-based one-time passwords compatible with Google Authenticator, Authy, and 1Password.

### Setup

```bash
POST /api/auth/2fa/setup
Authorization: Bearer <token>
```

**Response:**

```json
{
  "secret": "base32secretkey",
  "base32": "BASE32SECRETKEY",
  "otpauth": "otpauth://totp/MyApp:john@example.com?secret=BASE32SECRETKEY&issuer=MyApp"
}
```

Show the `otpauth` URL as a QR code for the user to scan.

### Confirm Setup

```bash
POST /api/auth/2fa/confirm
Authorization: Bearer <token>
Content-Type: application/json

{ "code": "123456" }
```

Verifies the code and enables 2FA. Generates 10 recovery codes.

### Disable

```bash
POST /api/auth/2fa/disable
Authorization: Bearer <token>
Content-Type: application/json

{ "code": "123456" }
```

### Login with 2FA

After successful login, if 2FA is enabled, the response includes:

```json
{
  "requires2FA": true,
  "tempToken": "temp-xxx"
}
```

Then verify with:

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password",
  "totpCode": "123456"
}
```

## API Keys

Generate API keys for programmatic access.

### Create

```bash
POST /api/auth/api-keys
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Production API Key",
  "expiresAt": "2027-01-01T00:00:00Z"
}
```

**Response:**

```json
{
  "id": 1,
  "name": "Production API Key",
  "key": "Zorux_a1b2c3d4e5f6...",
  "expiresAt": "2027-01-01T00:00:00Z"
}
```

> **Important:** The full key is only shown once. Store it securely.

### Key Format

- Prefix: `Zorux_`
- Length: 64 random bytes (hex encoded)
- Storage: Hashed with bcrypt (same as passwords)
- Display: `Zorux_xxxxxxxx...` (prefix only)

### Using API Keys

```bash
GET /api/posts
Authorization: Bearer Zorux_a1b2c3d4e5f6...
```

API keys support the same permissions as user tokens, including rate limiting per key.

### List Keys

```bash
GET /api/auth/api-keys
Authorization: Bearer <token>
```

### Revoke

```bash
DELETE /api/auth/api-keys/:id
Authorization: Bearer <token>
```

## Password Reset

### Request Reset

```bash
POST /api/auth/forgot-password
Content-Type: application/json

{ "email": "john@example.com" }
```

Sends a password reset email with a token. Token expires in 1 hour.

### Reset Password

```bash
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "password": "newpassword123"
}
```

## Email Verification

### Send Verification

```bash
POST /api/auth/send-verification
Authorization: Bearer <token>
```

### Verify Email

```
GET /api/auth/verify-email?token=<token>
```

Returns new JWT with `emailVerified: true`.

## Session Management

### List Sessions

```bash
GET /api/auth/sessions
Authorization: Bearer <token>
```

**Response:**

```json
{
  "sessions": [
    {
      "id": "session-id",
      "ip": "127.0.0.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-01-01T00:00:00Z",
      "expiresAt": "2026-01-31T00:00:00Z",
      "current": true
    }
  ]
}
```

### Revoke Session

```bash
DELETE /api/auth/sessions/:id
Authorization: Bearer <token>
```

### Revoke All Sessions

```bash
POST /api/auth/sessions/revoke-all
Authorization: Bearer <token>
```

Logs out all devices except the current one.

## Organizations / Teams

Multi-organization support with invites and roles.

### Create Organization

```bash
POST /api/auth/orgs
Authorization: Bearer <token>
Content-Type: application/json

{ "name": "Acme Corp", "slug": "acme" }
```

The creator becomes the `owner`.

### List My Organizations

```bash
GET /api/auth/orgs
Authorization: Bearer <token>
```

### Get Organization

```bash
GET /api/auth/orgs/:id
Authorization: Bearer <token>
```

Returns org details with members.

### Update Organization

```bash
PUT /api/auth/orgs/:id
Authorization: Bearer <token>
Content-Type: application/json

{ "name": "New Name" }
```

### Delete Organization

```bash
DELETE /api/auth/orgs/:id
Authorization: Bearer <token>
```

Only the owner can delete.

### List Members

```bash
GET /api/auth/orgs/:id/members
Authorization: Bearer <token>
```

### Invite Member

```bash
POST /api/auth/orgs/:id/invite
Authorization: Bearer <token>
Content-Type: application/json

{ "email": "new@example.com", "role": "member" }
```

Sends an invite email with a token.

### Accept Invite

```
GET /api/auth/orgs/accept-invite?token=<invite-token>
Authorization: Bearer <token>
```

### Decline Invite

```bash
POST /api/auth/orgs/decline-invite
Authorization: Bearer <token>
Content-Type: application/json

{ "token": "invite-token" }
```

### Update Member Role

```bash
POST /api/auth/orgs/:id/members/:memberId
Authorization: Bearer <token>
Content-Type: application/json

{ "role": "admin" }
```

### Remove Member

```bash
DELETE /api/auth/orgs/:id/members/:memberId
Authorization: Bearer <token>
```

### Organization Roles

| Role | Permissions |
|---|---|
| `owner` | Full control, can delete org, transfer ownership |
| `admin` | Manage members, update org settings |
| `member` | View org, access scoped resources |

### Scoped Models

Models with `scoped: true` are automatically filtered by organization:

```yaml
models:
  Project:
    fields:
      name: string required
    scoped: true    # ← Auto-filters by X-Org-ID header
```

Access scoped models with:

```bash
GET /api/projects
X-Org-ID: 1
```

## OAuth Provider (IdP)

Turn your Zorux app into an OAuth 2.0 + OpenID Connect provider.

### Register OAuth Client

```bash
POST /api/oauth/register
Content-Type: application/json

{
  "name": "Third Party App",
  "redirectUri": "https://thirdparty.com/callback"
}
```

Returns `client_id` and `client_secret`.

### Authorization Code Flow

1. **Redirect user to authorize:**

```
GET /api/oauth/authorize?response_type=code&client_id=xxx&redirect_uri=xxx&scope=openid&state=xxx
```

2. **User approves** (login screen if not authenticated)

3. **Redirect back with code:**

```
https://thirdparty.com/callback?code=xxx&state=xxx
```

4. **Exchange code for token:**

```bash
POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=xxx&client_id=xxx&client_secret=xxx&redirect_uri=xxx
```

**Response:**

```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### OIDC Discovery

```
GET /api/oauth/.well-known/openid-configuration
```

Returns standard OIDC configuration document.

### JWKS

```
GET /api/oauth/.well-known/jwks.json
```

Returns JSON Web Key Set for token verification.

### Userinfo

```
GET /api/oauth/userinfo
Authorization: Bearer <access-token>
```

Returns user profile.

## Registration Modes

| Mode | Description |
|---|---|
| `open` | Anyone can register |
| `invite` | Only users with a valid invite token can register |
| `admin` | Only admins can create accounts (no self-registration) |

## Cookie Security

Authentication cookies are hardened with:

- `HttpOnly` — Not accessible via JavaScript
- `Secure` — Only sent over HTTPS (production)
- `SameSite=Strict` — CSRF protection (production) / `Lax` (development)

## Database Tables

| Table | Purpose |
|---|---|
| `_sessions` | Refresh tokens and session data |
| `_social_accounts` | Linked OAuth provider accounts |
| `_webauthn_credentials` | Passkey credentials |
| `_totp_secrets` | 2FA TOTP secrets |
| `_auth_tokens` | Password reset, magic link, OTP tokens |
| `_api_keys` | API key hashes |
| `_organizations` | Organization records |
| `_org_members` | Organization memberships |
| `_org_invites` | Pending invitations |
| `_oauth_clients` | OAuth client applications |
| `_oauth_codes` | Authorization codes |
| `_oauth_tokens` | OAuth access/refresh tokens |
