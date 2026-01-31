# OAuth & 2FA Setup Guide

## Setting up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen
6. Create OAuth client ID:
   - Application type: Web application
   - Authorized redirect URIs: `https://localhost:3000/auth/google/callback`
7. Copy Client ID and Client Secret
8. Add to your `.env` file or set as environment variables

## Setting up GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - Application name: Wellness Platform
   - Homepage URL: `https://localhost:5173`
   - Authorization callback URL: `https://localhost:3000/auth/github/callback`
4. Register application
5. Copy Client ID and generate Client Secret
6. Add to your `.env` file or set as environment variables

## Testing OAuth (Development)

For development without setting up OAuth apps, you can:
- Use mock authentication
- Skip OAuth testing and focus on password-based auth
- Register real OAuth apps with localhost URLs (both Google and GitHub support this)

## Using 2FA

### Enable 2FA:
1. Login to your account
2. Call `POST /auth/2fa/generate` with your access token
3. Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.)
4. Call `POST /auth/2fa/enable` with a token from your authenticator app
5. 2FA is now enabled

### Login with 2FA:
1. Call `POST /auth/login` with email and password
2. If 2FA is enabled, you'll get `{ requires2FA: true }`
3. Call `POST /auth/2fa/verify` with email, password, and 2FA token

### Disable 2FA:
1. Call `POST /auth/2fa/disable` with your access token and current 2FA token

## Password Reset Flow

1. User requests reset: `POST /auth/forgot-password` with email
2. User receives email with reset link
3. User clicks link and submits new password: `POST /auth/reset-password`
4. Password is updated, user can login with new password
