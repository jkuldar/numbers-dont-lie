# Wellness Platform - Numbers Don't Lie

A privacy-focused wellness platform with AI-powered health insights.

## 🔐 Security Features

### Encryption in Transit (HTTPS)
- Self-signed SSL certificates for development
- All data transmitted over HTTPS
- PostgreSQL connections use SSL

### Encryption at Rest
- PostgreSQL configured with SSL
- Field-level encryption for sensitive data using AES-256-GCM
- Password hashing with bcrypt

### Authentication & Authorization
- JWT-based authentication (access + refresh tokens)
- Email verification required
- OAuth 2.0 (Google + GitHub)
- Password reset via email
- Two-Factor Authentication (TOTP)
- Protected routes with guards
- Session management

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd numbers-dont-lie
   ```

2. **Generate SSL certificates for development**
   ```bash
   cd backend
   chmod +x generate-ssl.sh
   ./generate-ssl.sh
   cd ..
   ```

3. **Start the application**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: https://localhost:5173
   - Backend API: https://localhost:3000
   
   ⚠️ **Note:** You'll see a browser warning about self-signed certificates - this is expected in development. Click "Advanced" and proceed.

## 📁 Project Structure

```
.
├── backend/              # NestJS backend
│   ├── src/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── encryption.service.ts
│   │   ├── jwt-auth.guard.ts
│   │   ├── jwt.strategy.ts
│   │   └── ...
│   ├── prisma/
│   │   └── schema.prisma
│   ├── certs/           # SSL certificates (generated)
│   ├── Dockerfile
│   └── package.json
├── frontend/            # Frontend application
│   ├── src/
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` in the backend directory and update the values:

```bash
cd backend
cp .env.example .env
```

**Important:** Change all secrets in production!

- `DATABASE_URL` - PostgreSQL connection string with SSL
- `JWT_ACCESS_SECRET` - Secret for access tokens (min 32 chars)
- `JWT_REFRESH_SECRET` - Secret for refresh tokens (min 32 chars)
- `ENCRYPTION_KEY` - Key for field-level encryption (32 chars)
- `SMTP_*` - Email configuration for verification emails

## 🧪 Testing

### Test Authentication Flow

1. **Register a new user:**
   ```bash
   curl -k -X POST https://localhost:3000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"securepass123"}'
   ```

2. **Verify email:**
   ```bash
   curl -k -X POST "https://localhost:3000/auth/verify-email?code=<verification_code>"
   ```

3. **Login:**
   ```bash
   curl -k -X POST https://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"securepass123"}'
   ```

4. **Access protected routes:**
   ```bash
   curl -k https://localhost:3000/protected \
     -H "Authorization: Bearer <access_token>"
   ```

5. **Refresh access token:**
   ```bash
   curl -k -X POST https://localhost:3000/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{"refreshToken":"<refresh_token>"}'
   ```

### Test Password Reset

1. **Request password reset:**
   ```bash
   curl -k -X POST https://localhost:3000/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

2. **Reset password with token from email:**
   ```bash
   curl -k -X POST https://localhost:3000/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token":"<reset_token>","newPassword":"newpassword123"}'
   ```

### Test 2FA

1. **Generate 2FA secret (requires login):**
   ```bash
   curl -k -X POST https://localhost:3000/auth/2fa/generate \
     -H "Authorization: Bearer <access_token>"
   ```

2. **Enable 2FA with token from authenticator app:**
   ```bash
   curl -k -X POST https://localhost:3000/auth/2fa/enable \
     -H "Authorization: Bearer <access_token>" \
     -H "Content-Type: application/json" \
     -d '{"token":"123456"}'
   ```

3. **Login with 2FA:**
   ```bash
   curl -k -X POST https://localhost:3000/auth/2fa/verify \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"securepass123","token":"123456"}'
   ```

### Test OAuth

1. **Google OAuth:**
   - Navigate to `https://localhost:3000/auth/google`
   - Complete Google login
   - You'll be redirected to frontend with tokens

2. **GitHub OAuth:**
   - Navigate to `https://localhost:3000/auth/github`
   - Complete GitHub login
   - You'll be redirected to frontend with tokens

**Note:** OAuth requires setting up credentials. See [OAUTH_2FA_SETUP.md](OAUTH_2FA_SETUP.md) for details.

## 📊 Development Status

### ✅ Completed (Day 1-3)
- [x] Docker setup with single command execution
- [x] HTTPS with self-signed certificates
- [x] Database encryption (SSL + field-level encryption)
- [x] Email-password authentication
- [x] Email verification
- [x] JWT access tokens (15 min expiry)
- [x] JWT refresh tokens (7 day expiry)
- [x] Protected routes with guards
- [x] Environment configuration
- [x] OAuth providers (Google + GitHub)
- [x] Password reset via email
- [x] Two-factor authentication (TOTP)

### 🚧 In Progress / Planned
- [ ] Health profile system
- [ ] BMI & Wellness score calculations
- [ ] AI-powered health insights
- [ ] Data visualization
- [ ] Progress tracking

## 🛠️ Development

### Run Database Migrations

```bash
docker-compose exec backend npx prisma migrate dev
```

### Generate Prisma Client

```bash
docker-compose exec backend npx prisma generate
```

### View Database

```bash
docker-compose exec backend npx prisma studio
```

## 🐛 Troubleshooting

### SSL Certificate Issues

If you see SSL errors, regenerate certificates:
```bash
cd backend
rm -rf certs
./generate-ssl.sh
docker-compose down
docker-compose up --build
```

### Database Connection Issues

Check if PostgreSQL is running with SSL:
```bash
docker-compose logs postgres
```

### Port Already in Use

If ports 3000 or 5173 are already in use:
```bash
docker-compose down
# Change ports in docker-compose.yml
docker-compose up
```

## 📝 License

This project is part of a wellness platform development exercise.

## 👥 Contributing

This is an educational project. Contributions and suggestions are welcome!
