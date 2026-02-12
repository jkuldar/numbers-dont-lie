# Wellness Platform - Numbers Don't Lie

A privacy-focused wellness platform with AI-powered health insights, comprehensive health tracking, and personalized recommendations.

## 🌟 Overview

This platform helps users track their health metrics, set wellness goals, and receive AI-powered personalized recommendations while maintaining strict privacy and security standards. Built with:

- **Backend:** NestJS + PostgreSQL + Prisma
- **Frontend:** Vanilla JavaScript with Chart.js for visualizations
- **Security:** JWT authentication, 2FA support, secure data storage
- **AI:** OpenAI GPT-3.5-turbo for personalized health insights
- **Deployment:** Docker with single-command setup

## ✨ Key Features

### 🔐 Security & Authentication
- Email verification required for account activation
- OAuth 2.0 (Google + GitHub)
- Password reset via email
- Two-Factor Authentication (TOTP)
- JWT-based session management (access + refresh tokens)
- HTTPS with SSL certificates

### 💪 Health Tracking
- Comprehensive health profile (demographics, physical metrics, goals)
- BMI calculation and classification
- Wellness score (0-100) based on 4 components:
  - BMI contribution (30%)
  - Activity level (30%)
  - Goal progress (20%)
  - Health habits (20%)
- Weight and activity history with timestamps
- Duplicate entry prevention
- Metric units (kg, cm) for all measurements

### 📊 Analytics & Insights
- Weekly and monthly health summaries
- Progress tracking with milestone detection
- Weight loss/gain tracking
- Activity frequency monitoring
- Goal progress visualization

### 🤖 AI-Powered Recommendations
- Personalized health insights based on user profile
- PII removal before AI processing
- Dietary restriction validation
- Medical condition awareness
- Response caching and fallback
- Hallucination detection and safety filtering
- Priority-based recommendations

### 📈 Visualization
- Interactive charts for weight tracking
- Wellness score gauges
- Activity level comparisons
- Goal progress indicators
- Responsive mobile design
- Real-time updates without page refresh

### 🛡️ Privacy & Compliance
- Explicit data usage consent
- Privacy settings management
- Data export functionality (JSON)
- GDPR-compliant data handling
- Encryption at rest and in transit

### ⚡ Performance & Reliability
- Rate limiting (60 req/min) to prevent abuse
- AI response caching (reduces latency and cost)
- Graceful error handling
- Loading states and skeleton UI

## 🔐 Security Features

### Encryption in Transit (HTTPS)
- Self-signed SSL certificates for development
- All data transmitted over HTTPS
- PostgreSQL connections use SSL

### Encryption at Rest
- PostgreSQL configured with SSL
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
   - Frontend: http://localhost:5173
   - Backend API: https://locadlhost:3000
   
   ⚠️ **Note:** You'll see a browser warning about self-signed backend certificates - this is expected in development. Click "Advanced" and proceed.

## 📁 Project Structure

```
.
├── backend/              # NestJS backend
│   ├── src/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
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



## 📖 Usage Guide

### 1. Create an Account

1. Navigate to http://localhost:5173
2. Register with email and password
3. Check email for verification link (or console in dev mode)
4. Verify your email

### 2. Complete Your Health Profile

1. Log in to your account
2. Fill out the health profile form:
   - Demographics (age, biological sex)
   - Physical metrics (height, weight)
   - Goals (target weight, goal type)
   - Lifestyle (activity level, exercise frequency, sleep, stress)
   - Dietary preferences and restrictions
   - Medical conditions and medications
3. Review and accept data usage consent
4. Submit profile

### 3. Track Your Progress

1. **Log Weight:** Add weight entries with dates
2. **Log Activities:** Record exercises with duration and intensity
3. **View Dashboard:** See your BMI, wellness score, and progress charts
4. **Weekly/Monthly Summaries:** Review your progress over time

### 4. Get AI Insights

1. Navigate to AI Insights section
2. View personalized recommendations based on your profile
3. Recommendations adapt when you update your goals or profile
4. High-priority insights are highlighted

### 5. Manage Privacy

1. Go to Privacy Settings
2. Adjust data sharing preferences
3. Export your data anytime (JSON format)
4. Review what data is collected and how it's used

### 6. Enable 2FA (Optional but Recommended)

1. Go to Security Settings
2. Click "Enable Two-Factor Authentication"
3. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
4. Enter the 6-digit code to confirm
5. Future logins will require the code

## 🎯 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/verify-email?code=` - Verify email
- `POST /auth/refresh` - Get new access token
- `POST /auth/forgot-password` - Request password reset
-  `POST /auth/reset-password` - Reset password with token
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/github` - Initiate GitHub OAuth
- `POST /auth/2fa/generate` - Generate 2FA secret
- `POST /auth/2fa/enable` - Enable 2FA
- `POST /auth/2fa/disable` - Disable 2FA

### Health Profile
- `POST /health-profile` - Create profile
- `GET /health-profile` - Get current profile
- `PATCH /health-profile/:id` - Update profile
- `POST /health-profile/weight-history` - Add weight entry
- `GET /health-profile/weight-history` - Get weight history
- `POST /health-profile/activity` - Log activity
- `GET /health-profile/activity` - Get activity history
- `GET /health-profile/progress` - Get goal progress
- `GET /health-profile/milestones` - Get achievements
- `GET /health-profile/summary/weekly` - Weekly summary
- `GET /health-profile/summary/monthly` - Monthly summary

### AI Insights
- `GET /ai/insights` - Get personalized insights (cached)
- `GET /ai/insights/history` - Get insight history
- `POST /ai/invalidate-cache` - Force regeneration

### Privacy
- `GET /privacy-settings` - Get privacy settings
- `PATCH /privacy-settings` - Update settings
- `GET /data-export` - Export all user data

## 📋 Requirements

- **Docker & Docker Compose** (only requirement for running)
- Node.js 18+ (for development)
- PostgreSQL 15+ (handled by Docker)

## 🧪 Testing

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

**Note:** OAuth requires setting up credentials in the `.env` file with Google and GitHub OAuth client IDs and secrets.

## 📊 Development Status

### ✅ Completed Features
- [x] Docker setup with single command execution
- [x] HTTPS with self-signed certificates
- [x] Database encryption with SSL
- [x] Email-password authentication with verification
- [x] JWT access tokens (15 min) + refresh tokens (7 days)
- [x] Protected routes with email verification guards
- [x] OAuth providers (Google + GitHub)
- [x] Password reset via email
- [x] Two-factor authentication (TOTP)
- [x] Health profile system with comprehensive metrics
- [x] BMI calculation and classification
- [x] Wellness score with 4-component calculation
- [x] Weight and activity tracking with timestamps
- [x] Duplicate entry prevention
- [x] Unit normalization (automatic conversions)
- [x] Weekly and monthly health summaries
- [x] AI-powered health insights
- [x] PII removal and privacy protection
- [x] Response validation against dietary restrictions
- [x] AI caching and fallback mechanism
- [x] Hallucination detection and safety checks
- [x] Rate limiting (60 req/min)
- [x] Dashboard with charts and visualizations
- [x] Privacy settings and data export

### 🔮 Future Enhancements
- [ ] Mobile app (React Native)
- [ ] Social features (friend tracking, challenges)
- [ ] Integration with fitness devices (Fitbit, Apple Health)
- [ ] Meal planning and calorie tracking
- [ ] Professional health coach connections
- [ ] Advanced analytics and predictive insights

## 🎓 Development Notes

### AI Implementation

**Model Choice:** GPT-3.5-turbo
- **Reasoning:** Balance of response quality and latency (sub-second), cost-effective for production
- **Alternatives Considered:** GPT-4 (better but 10x cost, slower)

**Prompt Engineering:** Zero-shot approach
- System role: "Health and wellness advisor"
- Structured context: demographics, metrics, goals, restrictions, medical conditions
- Explicit constraints: safety, restrictions, evidence-based
- **Reasoning:** GPT-3.5-turbo has strong instruction-following; examples may not generalize to diverse users

**Context Length:** ~500-800 tokens (full profile)
- **Trade-off:** Higher cost but significantly better personalization
- **Optimization:** Structured format, only relevant fields

**PII Removal Impact:**
- **Removed:** Email, name, database IDs (replaced with UUIDs)
- **Kept:** Age, sex, metrics, goals, preferences (needed for personalization)
- **Result:** Recommendations remain highly personalized through rich health context

**Hallucination Prevention:**
1. Prompt constraints (safety requirements, evidence-based)
2. Response validation (goal alignment, restriction checks)
3. Post-processing filters (dangerous keywords, medical claims)
4. Fallback to generic safe advice if validation fails
5. Human oversight (logging, periodic review)

**Caching Strategy:**
- 24-hour cache per user context
- Invalidated on major profile changes
- Fallback to cached insights if AI service unavailable
- **Trade-off:** Faster responses and lower cost vs. always-fresh insights

### Security Decisions

**JWT Access Token Duration:** 15 minutes
- **Pro:** Reduces damage if token stolen (short-lived)
- **Con:** Requires more frequent refreshes
- **Balance:** 7-day refresh token provides good UX

**Rate Limiting:** 60 requests per minute
- **Reasoning:** Allows bursts (dashboard loading) while preventing abuse
- **Protects:** Server resources, AI API costs, brute force attacks

**BMI Impact on Wellness Score:** 30% contribution
- Normal BMI (18.5-24.9): Higher score
- Underweight/Overweight/Obese: Proportionally lower
- Combined with activity (30%), progress (20%), habits (20%)

### Data Visualization

**Library:** Chart.js
- **Reasoning:** Lightweight, responsive, simple integration, good mobile support
- **Trade-offs:** Limited advanced visualizations vs. simpler maintenance
- **Alternatives:** D3.js (more complex), Recharts (React-specific)

**Metric System:**
- All metrics in standard units (kg, cm)
- **Pros:** Consistent comparisons, accurate calculations, simpler charting
- **Implementation:** Store and display in metric units

**Missing Data Handling:**
- Required fields: Cannot generate insights without basics
- Optional fields: AI adapts with more generic advice
- **Mitigation:** Prompt user to complete profile for better results

## 👨‍💻 Development

## 🤖 AI Features

The platform includes AI-powered personalized health insights with:

- **PII Removal**: User identifiers are anonymized before sending to AI
- **Context Building**: Comprehensive health context from normalized data
- **Response Validation**: Checks for dietary restriction violations and unsafe recommendations
- **Caching**: 24-hour cache with context-based lookup for efficiency
- **Fallback**: Returns last valid insight if AI service is unavailable
- **Hallucination Detection**: Filters unrealistic claims and dangerous advice
- **Priority Tagging**: Insights categorized as high/medium/low priority

### Configuration

Add to your `.env` file:
```bash
OPENAI_API_KEY=sk-...
```

### API Endpoints

- `GET /ai/insight` - Get personalized AI insight (with caching)
- `GET /ai/insights?limit=10` - Get insight history
- `POST /ai/invalidate-cache` - Force regeneration of insights



## �‍💻 Development

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

## � Additional Documentation

- **[project.md](project.md)** - Project requirements and specifications
- **[testing.md](testing.md)** - Testing requirements and criteria

## �🐛 Troubleshooting

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
# Email Not Sending (Development)

In development, emails are logged to console:
```bash
docker-compose logs -f backend | grep "Verification"
```

Copy the verification code/token from the logs.



## 🚀 Production Deployment

### Environment Variables (Production)

**Critical:** Change these from defaults:

```bash
# Strong secrets (min 32 characters)
JWT_ACCESS_SECRET=<generate-random-string>
JWT_REFRESH_SECRET=<generate-random-string>
ENCRYPTION_KEY=<generate-32-char-string>

# Real SMTP server
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com

# OAuth credentials
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GITHUB_CLIENT_ID=<your-client-id>
GITHUB_CLIENT_SECRET=<your-client-secret>

# OpenAI
OPENAI_API_KEY=sk-<your-key>

# Frontend URL
FRONTEND_URL=https://yourdomain.com
```

### Security Checklist

- [ ] Change all default secrets
- [ ] Use real SSL certificates (Let's Encrypt)
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Enable database SSL in production
- [ ] Configure proper logging and monitoring
- [ ] Set up rate limiting alerts
- [ ] Review and adjust rate limits for production traffic
- [ ] Enable SMTP for real email delivery
- [ ] Set up OAuth with proper callback URLs

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Check all services
docker-compose ps

# Check backend logs
docker-compose logs -f backend

# Check database
docker-compose exec postgres psql -U wellness -d wellness_db
```

### Database Maintenance

```bash
# Backup database
docker-compose exec postgres pg_dump -U wellness wellness_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U wellness wellness_db < backup.sql
```

### AI Usage Monitoring

Monitor OpenAI API usage:
- Track request counts in logs
- Monitor costs via OpenAI dashboard
- Adjust caching strategy if costs too high

## 📝 License

This project is part of a wellness platform development exercise.

## 👥 Contributing

This is an educational project demonstrating best practices in:
- Secure authentication and authorization
- Privacy-focused data handling
- AI integration with safety measures
- Comprehensive testing
- Docker-based deployment

Contributions and suggestions are welcome!

## 🙏 Acknowledgments

Built with:
- NestJS - Progressive Node.js framework
- Prisma - Next-generation ORM
- PostgreSQL - Robust relational database
- OpenAI - AI-powered insights
- Chart.js - Simple yet flexible charting
- Docker - Containerization platform

---

**Health Disclaimer:** This platform is for educational and informational purposes only. Always consult with qualified healthcare professionals for medical advice, diagnosis, or treatment.

## 📝 License

This project is part of a wellness platform development exercise.

## 👥 Contributing

This is an educational project. Contributions and suggestions are welcome!
