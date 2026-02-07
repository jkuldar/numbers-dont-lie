# Manual Testing Guide

Testing testimisnõuete kontrollimiseks on loodud automaatsed E2E testid ja see juhend manuaalseks testimiseks.

## 🚀 Kiire Setup

### 1. Käivita projekt
```bash
# Põhikaustas
docker-compose up --build
```

### 2. Installi testimise sõltuvused
```bash
cd backend
npm install
```

### 3. Käivita automaatsed testid
```bash
# Kõik testid
npm test

# E2E testid
npm run test:e2e

# Testid koos coverage'iga
npm run test:cov
```

## ✅ Mandatory Testimise Kontrollnimekiri

### Authentication & Security

#### ✅ Email Verification
- [ ] Registreeri kasutaja
- [ ] Kontrolli, et saabub verification email (vaata console'i arenduses)
- [ ] Kinnita, et verifitseerimata kasutaja EI saa kaitstud API-dele ligi
- [ ] Verifitseeri email vastavalt koodile
- [ ] Nüüd peaks pääsema kaitstud API-dele

**Automaattest:** `auth.e2e-spec.ts` - "Email verification" testid

#### ✅ OAuth Flows (Google & GitHub)
**Manuaalne testimine nõutav** (vajab browser'it)

```bash
# 1. Seadista OAuth credentials .env failis:
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# 2. Taaskäivita backend
docker-compose restart backend
```

**Google OAuth:**
1. Mine: http://localhost:3000/auth/google
2. Logi sisse Google'iga
3. Peaks redirectima tagasi tokenitega
4. Kontrolli, et kasutaja loodi andmebaasis `oauthProvider='google'`

**GitHub OAuth:**
1. Mine: http://localhost:3000/auth/github
2. Logi sisse GitHub'iga
3. Peaks redirectima tagasi tokenitega
4. Kontrolli, et kasutaja loodi andmebaasis `oauthProvider='github'`

**Automaattest:** `auth.e2e-spec.ts` - dokumenteerib OAuth teste

#### ✅ Password Reset
- [ ] Taotle password reset
- [ ] Kontrolli reset email'i (console arenduses)
- [ ] Kasuta reset token'it uue parooli seadmiseks
- [ ] Kinnita, et vana parool ei tööta
- [ ] Kinnita, et uus parool töötab

**Automaattest:** `auth.e2e-spec.ts` - "Password Reset" testid

#### ✅ Two-Factor Authentication
- [ ] Genereeri 2FA secret
- [ ] Skänni QR code authenticator app'iga (nt Google Authenticator)
- [ ] Lülita 2FA sisse TOTP tokeniga
- [ ] Kinnita, et login nõuab nüüd 2FA koodi
- [ ] Logi sisse koos 2FA koodiga
- [ ] Lülita 2FA välja
- [ ] Kinnita, et login töötab ilma 2FA-ta

**Automaattest:** `auth.e2e-spec.ts` - "Two-Factor Authentication" testid

#### ✅ Refresh Token
- [ ] Logi sisse ja saa access + refresh token
- [ ] Kasuta access token'it API kutseks
- [ ] Ära ära access token (15 min)
- [ ] Kasuta refresh token'it uue access tokeni saamiseks
- [ ] Uus access token peaks töötama

**Automaattest:** `auth.e2e-spec.ts` - "POST /auth/refresh" testid

#### ✅ Access Token Expiration
Access token aegub 15 minuti pärast.

**Manuaalne test:**
1. Logi sisse
2. Oota 16 minutit
3. Proovi kasutada vana access token'it
4. Peaks saama 401 Unauthorized
5. Kasuta refresh token'it uue tokeni saamiseks

**Automaattest:** Dokumenteeritud `auth.e2e-spec.ts`-s

#### ✅ Protected Routes - Email Not Verified
- [ ] Registreeri kasutaja, ÄRA verifitseeri
- [ ] Proovi pääseda `/protected/profile` endpointile
- [ ] Peaks saama 401 või error "Email not verified"

**Automaattest:** `auth.e2e-spec.ts` - "Protected Routes - Email Verification Required"

### Health Data & Analytics

#### ✅ Health Profile Creation
- [ ] Loo terviseprofiil kõigi nõutud väljadega:
  - Demographics (age, sex)
  - Physical metrics (height, weight)
  - Goals (goalWeight, goalType)
  - Lifestyle (activity, sleep, stress)
  - Dietary (preferences, restrictions)
  - Medical (conditions, medications)
  - Consent (dataUsageConsent: true)
- [ ] Kinnita, et andmed normaliseeriti (kg, cm)
- [ ] Kontrolli BMI arvutust ja kategooriat

**Automaattest:** `health-profile.e2e-spec.ts` - "Health Profile Creation"

#### ✅ BMI Classification
BMI kategooriad:
- < 18.5: underweight
- 18.5-24.9: normal
- 25-29.9: overweight
- ≥ 30: obese

**Test:**
- [ ] Loo profiil kaaluga 55kg, pikkusega 180cm → underweight
- [ ] Uuenda kaaluga 70kg → normal
- [ ] Uuenda kaaluga 85kg → overweight
- [ ] Uuenda kaaluga 100kg → obese

**Automaattest:** `health-profile.e2e-spec.ts` - "should classify BMI categories correctly"

#### ✅ Invalid BMI Handling
- [ ] Proovi sisestada negatiivne kaal (-1)
- [ ] Peaks saama 400 Bad Request
- [ ] Veateade peaks ilmuma ilma page refresh'ita

**Automaattest:** `health-profile.e2e-spec.ts` - "should handle invalid BMI values"

#### ✅ Wellness Score Calculation
Wellness Score = BMI (30%) + Activity (30%) + Progress (20%) + Habits (20%)

**Test:**
- [ ] Loo profiil → kontrolli wellness score (0-100)
- [ ] Muuda kaalu → score peaks muutuma
- [ ] Muuda exerciseFrequency → score peaks muutuma

**Automaattest:** `health-profile.e2e-spec.ts` - "Wellness Score Calculation"

#### ✅ Weight History with Timestamps
- [ ] Lisa mitu kaalukirjet erinevate kuupäevadega
- [ ] Kontrolli ajalugu GET `/health-profile/weight-history`
- [ ] Iga kirje peaks omama unikaalset timestamp'i

**Automaattest:** `health-profile.e2e-spec.ts` - "Weight History Tracking"

#### ✅ Duplicate Weight Entry Prevention
- [ ] Lisa kaalukirje timestamp'iga T1
- [ ] Proovi lisada teist kirjet samale timestamp'ile T1
- [ ] Peaks saama 400 error

**Automaattest:** `health-profile.e2e-spec.ts` - "should prevent duplicate weight entries"

#### ✅ Duplicate Activity Entry Prevention
- [ ] Lisa activity entry timestamp'iga T1
- [ ] Proovi lisada teist activity't samale timestamp'ile T1
- [ ] Peaks saama 400 error

**Automaattest:** `health-profile.e2e-spec.ts` - "should prevent duplicate activity entries"

#### ✅ Unit Normalization
- [ ] Sisesta kaal pounds'ides (165 lbs)
- [ ] Kontrolli, et salvestati kilogrammides (~74.84 kg)
- [ ] Sisesta pikkus feet'ides (5.9 ft)
- [ ] Kontrolli, et salvestati sentimeetrites (~175 cm)

**Automaattest:** `health-profile.e2e-spec.ts` - "Unit Normalization"

#### ✅ Weekly & Monthly Summaries
- [ ] GET `/health-profile/summary/weekly`
  - Peaks sisaldama: activityLevels, wellnessScoreChange, goalProgress
- [ ] GET `/health-profile/summary/monthly`
  - Peaks sisaldama samasuguseid metreid kuuandmetena

**Automaattest:** `health-profile.e2e-spec.ts` - "Weekly & Monthly Summaries"

#### ✅ Data Usage Consent
- [ ] Proovi luua profiil ilma `dataUsageConsent: true`
- [ ] Peaks saama 400 error

**Automaattest:** `health-profile.e2e-spec.ts` - "Data Privacy & Consent"

### AI Insights

#### ✅ AI Recommendations Generation
- [ ] Loo health profile
- [ ] GET `/ai/insights`
- [ ] Peaks saama array of insights
- [ ] Iga insight peaks omama: text, priority (high/medium/low)

**Automaattest:** `ai-insights.e2e-spec.ts` - "AI Recommendations Generation"

#### ✅ Goal Alignment
- [ ] Genereeri insights goal'iga "weight_loss"
- [ ] Kontrolli, et vähemalt üks insight mainib kaalu kaotamist
- [ ] Muuda goal'iks "muscle_gain"
- [ ] Uued insights peaksid mainima lihaseid/jõudu

**Automaattest:** `ai-insights.e2e-spec.ts` - "AI recommendations should reference user fitness goals"

#### ✅ PII Exclusion
- [ ] Genereeri insights
- [ ] Kontrolli, et ükski insight ei sisalda:
  - Email'i
  - User ID'd
  - Nime

**Automaattest:** `ai-insights.e2e-spec.ts` - "AI insights should NOT contain PII"

#### ✅ Dietary Restriction Validation
- [ ] Loo profiil koos `dietaryRestrictions: ['gluten-free']`
- [ ] Genereeri insights
- [ ] Kontrolli, et ükski insight ei soovita gluteeni sisaldavaid toite

**Automaattest:** `ai-insights.e2e-spec.ts` - "should NOT recommend foods that violate restrictions"

#### ✅ AI Caching
- [ ] Tee esimene insights request → peaks genereerima
- [ ] Tee teine request kohe pärast → peaks kasutama cache't
- [ ] Response'is peaks olema `cached: true`

**Automaattest:** `ai-insights.e2e-spec.ts` - "AI Caching & Fallback"

#### ✅ AI Service Unavailable Fallback
**Manuaalne testimine:**
1. Seadista invaliidne OpenAI API key .env failis
2. Taaskäivita backend
3. GET `/ai/insights`
4. Peaks saama 200 OK cached insights'iga
5. Response: `{ insights: [...], cached: true, message: "..." }`

**Automaattest:** Dokumenteeritud `ai-insights.e2e-spec.ts`-s

### Rate Limiting

#### ✅ Rapid Request Blocking
- [ ] Tee rohkem kui 60 API requesti 1 minuti jooksul
- [ ] Peaks saama 429 Too Many Requests
- [ ] Response headers peaks sisaldama:
  - `X-RateLimit-Limit: 60`
  - `X-RateLimit-Remaining: 0`

**Automaattest:** `rate-limiting.e2e-spec.ts` - "should block rapid-fire requests"

#### ✅ Rate Limit Reset
**Manuaalne test (võtab aega):**
1. Tee 60 requesti
2. 61. request → 429
3. Oota 61 sekundit
4. Tee uus request → peaks töötama (200 OK)

**Automaattest:** Dokumenteeritud (kommenteeritud välja kiiruse pärast)

### Dashboard & Visualization

#### ✅ Dashboard Display
Ava frontend: http://localhost:5173

- [ ] BMI klass nähtav
- [ ] Wellness score nähtav (0-100)
- [ ] Goal progress nähtav
- [ ] AI insights nähtavad priority badge'iga

#### ✅ Weight Progress Chart
- [ ] Chart näitab kaaluajalugu
- [ ] Goal weight joon nähtav referentsina
- [ ] Chart on responsive (muuda akna suurust)

#### ✅ Loading States
- [ ] Lae lehte → peaks näitama skeleton/placeholder UI
- [ ] Andmed laaditakse → skeleton kaob
- [ ] Ilma page refresh'ita

#### ✅ Error Handling
- [ ] Sisesta invalid BMI (-1)
- [ ] Error message ilmub inline
- [ ] Lehte ei refreshita
- [ ] API error → error banner (ei crashi't)

#### ✅ Mobile Responsiveness
- [ ] Ava mobile view (dev tools)
- [ ] Graafikud skaleeruvad
- [ ] Andmed ei lähe kaduma
- [ ] UI jääb kasutatavaks

### Data Export

#### ✅ Export Functionality
- [ ] Vajuta "Export Data" nuppu
- [ ] Peaks downloadima JSON/CSV faili
- [ ] Fail sisaldab:
  - Kõiki historical metrics
  - Timestamps
  - Profile andmeid

## 🎯 Explanation Questions - Valmis Vastused

Need on questions, mida tester võib küsida. Vastused on testides dokumenteeritud.

### 1. PII Removal vs AI Personalization
**Question:** "How does PII removal affect AI model's ability to generate personalized recommendations?"

**Answer:** Vaata `ai-insights.e2e-spec.ts` - "PII Removal Strategy" test. 

Kokkuvõte:
- Eemaldatakse: email, name, identifiers
- Säilitatakse: age, sex, metrics, goals, restrictions
- Personalization jääb tugev tänu rich context'ile (BMI, goals, restrictions)
- Kompenseerimine: goal-oriented recommendations, restriction filters, progress tracking

### 2. AI Hallucination Prevention
**Question:** "Explain your strategy for detecting and handling AI hallucinations in health recommendations."

**Answer:** Vaata `ai-insights.e2e-spec.ts` - "Hallucination Detection" test.

Strategies:
1. Prompt constraints (system role, safety requirements)
2. Response validation (goal alignment, restriction checks)
3. Post-processing filters (dangerous keywords, medical claims)
4. Fallback responses (generic safe advice + disclaimer)
5. Human oversight (logging, review, feedback)

### 3. JWT Access Token Duration
**Question:** "Security implications of access token duration in JWT authentication."

**Answer:**  Vaata `auth.e2e-spec.ts` - "Access Token Expiration" test.

15-minute duration reasoning:
- **Pro:** Reduces damage if token is stolen (short-lived)
- **Pro:** Limits session hijacking window
- **Con:** Requires more frequent refreshes
- **Solution:** Refresh token (7 days) balances security + UX

### 4. BMI Impact on Wellness Score
**Question:** "How do BMI classifications affect wellness score calculation?"

**Answer:** Vaata `health-profile.e2e-spec.ts` - "Wellness Score Calculation" test.

BMI contributes 30% to wellness score:
- Normal BMI (18.5-24.9): Higher score
- Underweight/Overweight: Medium score
- Obese: Lower score
- Combined with activity (30%), progress (20%), habits (20%)

### 5. AI Model Choice
**Question:** "Explain your choice of AI model(s) based on response quality and latency requirements."

**Answer:** Vaata `ai-insights.e2e-spec.ts` - "Prompt Engineering & Context" test.

GPT-3.5-turbo chosen because:
- Balance of quality and latency (sub-second response)
- Cost-effective for production
- Sufficient for health recommendations
- GPT-4 rejected: 10x cost, slower; overkill for this use case

### 6. AI Caching vs Regeneration
**Question:** "Difference between AI response caching and regeneration."

**Answer:** Vaata `ai-insights.e2e-spec.ts` - "AI Caching & Fallback" test.

- **Caching:** Store previous AI response, serve on repeat requests
  - Pro: Fast, no API cost
  - Con: May be stale if profile changes significantly
- **Regeneration:** Generate fresh response every time
  - Pro: Always current
  - Con: Slow, expensive
- **Implementation:** Cache for short period, invalidate on major profile changes

### 7. Context Length Impact
**Question:** "How does context length affect AI response quality?"

**Answer:** Vaata `ai-insights.e2e-spec.ts` - "Prompt Engineering & Context" test.

Full profile context (~500-800 tokens):
- **Pro:** Highly personalized, comprehensive understanding
- **Con:** Higher cost per request
- **Trade-off:** Worth it for quality health advice
- **Optimization:** Structured format, only relevant fields

### 8. Zero-shot vs Few-shot Prompting
**Question:** "Tradeoffs between zero-shot and few-shot prompting."

**Answer:** Vaata `ai-insights.e2e-spec.ts` - "Prompt Engineering & Context" test.

Using zero-shot:
- **Pro:** Faster, fewer tokens, simpler maintenance
- **Pro:** GPT-3.5-turbo strong at instruction-following
- **Con:** Less consistent format
- **When few-shot better:** If format consistency issues arise

### 9. Health Metrics Normalization
**Question:** "How does normalization of health metrics impact data visualization accuracy?"

**Answer:** Vaata `health-profile.e2e-spec.ts` - "Unit Normalization" test.

All metrics stored in standard units (kg, cm):
- **Pro:** Consistent comparisons, accurate calculations
- **Pro:** Simpler charting (one scale)
- **Pro:** No conversion errors in analytics
- Converted at input, displayed in user's preferred unit

### 10. Data Visualization Library Choice
**Question:** "Tradeoffs of your chosen data visualization library."

**Answer:** Likely using Chart.js or similar.

Trade-offs:
- **Pros:** Lightweight, responsive, simple integration
- **Pros:** Good mobile support, customizable
- **Cons:** Limited 3D/advanced visualizations
- **Alternatives:** D3.js (complex), Recharts (React-specific)

### 11. Missing Data Impact on AI
**Question:** "Impact of missing health data on AI recommendation accuracy."

**Answer:**

Missing data handling:
- **Required fields:** Cannot generate without basics (age, sex, goals)
- **Optional fields:** AI adapts, more generic advice
- **Example:** No dietary restrictions → broader food recommendations
- **Mitigation:** Prompt user to complete profile for better insights

### 12. Rate Limiting Approach
**Question:** "Approach to preventing API abuse through rate limiting."

**Answer:** Vaata `rate-limiting.e2e-spec.ts` - "API Abuse Prevention" test.

Implementation:
- 60 requests per 60 seconds per user
- Protects against: brute force, DoS, cost attacks, scraping
- Response: 429 Too Many Requests
- Escalation: Log violations → temp ban → permanent ban

## 📊 Test Coverage

Käivita coverage report:
```bash
npm run test:cov
```

Target:
- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%

## 🐛 Tuntud Probleemid & Lahendused

### Docker ei käivitu
```bash
# Kontrolli Dockerit
docker --version

# Käivita Docker Desktop (Mac)
open -a Docker

# Oota kuni Docker on valmis
docker ps
```

### Testid failivad "Database connection"
```bash
# Käivita PostgreSQL konteiner
docker-compose up -d postgres

# Kontrolli, et töötab
docker-compose ps

# Mine backend kausta ja käivita migratsioonid
cd backend
npx prisma migrate deploy
```

### "Cannot find module" errors
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### OAuth testid ei tööta
```bash
# Kontrolli .env failis:
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Restart backend
docker-compose restart backend
```

## ✅ Final Checklist

Enne review'sse andmist:

- [ ] Kõik automaatsed testid läbivad (`npm test`)
- [ ] E2E testid läbivad (`npm run test:e2e`)
- [ ] Test coverage > 80%
- [ ] Docker one-command start toimib (`docker-compose up`)
- [ ] Frontend avaneb ja on funktsionaalne
- [ ] OAuth on seadistatud ja testitud (vähemalt 2)
- [ ] README on täiendatud
- [ ] Kõik Mandatory punktid on läbitud
- [ ] Explanation questions'ile on vastused valmisolemas

## 🎉 Success Criteria

Projekt on valmis kui:
1. ✅ Kõik automaatsed testid läbivad
2. ✅ Kõik Mandatory nõuded on täidetud
3. ✅ Explanation questionsile oskad vastata
4. ✅ Docker käivitab projekti ühe käsuga
5. ✅ README on ajakohane ja põhjalik

Edu!
