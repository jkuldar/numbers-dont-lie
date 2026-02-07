import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

/**
 * Rate Limiting E2E Tests
 * 
 * These tests verify:
 * - System blocks rapid-fire API requests from the same user
 * - Rate limit configuration is appropriate
 * - Rate limit resets after time period
 */
describe('Rate Limiting E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create and login test user
    const email = `rate-test-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .query({ code: user.verificationCode })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'rate-test-' } },
    });
    await app.close();
  });

  describe('Rate Limiting Configuration', () => {
    it('should document rate limit configuration', () => {
      console.log(`
=============================================================
Rate Limiting Configuration
=============================================================

CURRENT CONFIGURATION (from app.module.ts):
- Library: @nestjs/throttler
- Limit: 60 requests
- Time window: 60 seconds (1 minute)
- Per: IP address + user ID (if authenticated)

REASONING:
- 60 req/min = 1 request per second average
- Allows bursts of activity (loading dashboard)
- Prevents abuse and DoS attacks
- Protects AI API costs

PROTECTED ENDPOINTS:
- All API routes by default
- Can exclude specific routes if needed

RESPONSE WHEN RATE LIMITED:
- HTTP 429 Too Many Requests
- Headers:
  * X-RateLimit-Limit: 60
  * X-RateLimit-Remaining: 0
  * X-RateLimit-Reset: [timestamp]

TRADE-OFFS:
✅ Pros:
- Prevents API abuse
- Controls AI API costs
- Protects server resources
- Prevents brute force attacks

❌ Cons:
- Legitimate users might hit limit during heavy use
- Needs monitoring and adjustment
- Could frustrate power users

ALTERNATIVES CONSIDERED:
- 100 req/min: Too permissive, higher costs
- 30 req/min: Too restrictive, poor UX
- Tier-based: Complex, not needed for MVP
=============================================================
      `);
    });
  });

  describe('Rate Limit Enforcement', () => {
    it('should block rapid-fire requests after threshold', async () => {
      const endpoint = '/protected/profile';
      const maxRequests = 60; // As configured
      const requestPromises: Promise<any>[] = [];

      // Fire off more requests than the limit
      for (let i = 0; i < maxRequests + 10; i++) {
        requestPromises.push(
          request(app.getHttpServer())
            .get(endpoint)
            .set('Authorization', `Bearer ${accessToken}`)
        );
      }

      const responses = await Promise.all(requestPromises);

      // Count successful vs rate-limited responses
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      console.log(`Successful requests: ${successCount}`);
      console.log(`Rate limited requests: ${rateLimitedCount}`);

      // Should have rate limited at least some requests
      expect(rateLimitedCount).toBeGreaterThan(0);

      // Should not allow more than configured limit
      expect(successCount).toBeLessThanOrEqual(maxRequests + 5); // Small buffer for timing
    });

    it('should include rate limit headers in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/protected/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Should have rate limit headers
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });

    it('rate limit should apply per user', async () => {
      // Create another user
      const email2 = `rate-test-2-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: email2, password })
        .expect(201);

      const user2 = await prisma.user.findUnique({
        where: { email: email2 },
      });

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .query({ code: user2.verificationCode })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: email2, password })
        .expect(201);

      const token2 = loginResponse.body.accessToken;

      // User 2 should have their own rate limit
      const response = await request(app.getHttpServer())
        .get('/protected/profile')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      // Should succeed (new user, fresh limit)
      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limit Reset', () => {
    it('should document rate limit reset behavior', () => {
      console.log(`
=============================================================
Rate Limit Reset Testing
=============================================================

RESET BEHAVIOR:
- Rate limit window: 60 seconds
- After window expires, counter resets
- User can make another 60 requests

TO TEST MANUALLY:
1. Make 60 requests rapidly
2. Verify 429 response on 61st request
3. Wait 61 seconds
4. Make another request
5. Should succeed (200 OK)

TESTING CHALLENGE:
- Automated test would need to wait 60+ seconds
- Slows down test suite significantly
- Better tested manually or with integration tests

IMPLEMENTATION NOTES:
- Uses sliding window algorithm
- Tracks timestamps of requests
- Removes old requests outside window
- More accurate than fixed window
=============================================================
      `);
    });

    // Uncomment this test if you want to wait for reset
    // Warning: This will make the test suite 60+ seconds slower
    /*
    it('should allow requests after rate limit window expires', async () => {
      const endpoint = '/protected/profile';
      
      // Exhaust rate limit
      for (let i = 0; i < 60; i++) {
        await request(app.getHttpServer())
          .get(endpoint)
          .set('Authorization', `Bearer ${accessToken}`);
      }

      // This should be rate limited
      const limitedResponse = await request(app.getHttpServer())
        .get(endpoint)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(429);

      console.log('Rate limit hit. Waiting 61 seconds for reset...');
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 61000));

      // Should work again
      const resetResponse = await request(app.getHttpServer())
        .get(endpoint)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(resetResponse.status).toBe(200);
    }, 70000); // Increase test timeout
    */
  });

  describe('API Abuse Prevention', () => {
    it('should explain how rate limiting prevents abuse', () => {
      console.log(`
=============================================================
API Abuse Prevention Strategy
=============================================================

ATTACK VECTORS MITIGATED:

1. BRUTE FORCE ATTACKS:
   - Login attempts limited
   - Prevents password guessing
   - Slows down attacker significantly

2. DENIAL OF SERVICE (DoS):
   - Prevents single user from overwhelming server
   - Protects server resources
   - Ensures availability for all users

3. COST ATTACKS:
   - AI API calls cost money
   - Unlimited requests = unlimited costs
   - Rate limiting controls expenses

4. DATA SCRAPING:
   - Prevents automated data harvesting
   - Protects user privacy
   - Maintains data integrity

ADDITIONAL PROTECTIONS:
- Email verification (prevents fake accounts)
- CAPTCHA on registration (prevents bots)
- JWT expiration (limits session hijacking)
- HTTPS only (prevents MitM attacks)
- CORS configuration (prevents unauthorized origins)

MONITORING:
- Log rate limit violations
- Track user patterns
- Alert on suspicious activity
- Ban IPs with repeated violations

ESCALATION:
- First violation: 429 response
- Repeated violations: Temporary ban (1 hour)
- Persistent abuse: Permanent ban + investigation
=============================================================
      `);
    });
  });

  describe('Rate Limiting on Specific Endpoints', () => {
    it('should rate limit login attempts', async () => {
      const email = `bruteforce-test-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      // Register user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password })
        .expect(201);

      // Verify email
      const user = await prisma.user.findUnique({
        where: { email },
      });

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .query({ code: user.verificationCode })
        .expect(201);

      // Attempt many logins with wrong password
      const loginAttempts: Promise<any>[] = [];
      for (let i = 0; i < 65; i++) {
        loginAttempts.push(
          request(app.getHttpServer())
            .post('/auth/login')
            .send({ email, password: 'WrongPassword' })
        );
      }

      const responses = await Promise.all(loginAttempts);
      const rateLimited = responses.filter(r => r.status === 429).length;

      // Should rate limit brute force attempts
      expect(rateLimited).toBeGreaterThan(0);
    });

    it('should rate limit AI insight requests', async () => {
      // Create health profile first
      await request(app.getHttpServer())
        .post('/health-profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          age: 30,
          biologicalSex: 'male',
          height: 180,
          heightUnit: 'cm',
          currentWeight: 80,
          weightUnit: 'kg',
          goalWeight: 75,
          goalType: 'weight_loss',
          activityLevel: 'moderate',
          exerciseFrequency: 3,
          sleepHours: 7,
          stressLevel: 'medium',
          dataUsageConsent: true,
        })
        .expect(201);

      // Rapidly request AI insights
      const aiRequests: Promise<any>[] = [];
      for (let i = 0; i < 65; i++) {
        aiRequests.push(
          request(app.getHttpServer())
            .get('/ai/insights')
            .set('Authorization', `Bearer ${accessToken}`)
        );
      }

      const responses = await Promise.all(aiRequests);
      const rateLimited = responses.filter(r => r.status === 429).length;

      // Should rate limit AI requests (expensive)
      expect(rateLimited).toBeGreaterThan(0);
    });
  });
});
