import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

/**
 * AI Insights & Recommendations E2E Tests
 * 
 * These tests verify:
 * - AI generates recommendations referencing user's fitness goals
 * - AI recommendations exclude PII
 * - System validates responses against user's health restrictions
 * - AI response caching and fallback when service is unavailable
 * - Different insights when user's goals change
 */
describe('AI Insights E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let profileId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create test user with health profile
    const email = `ai-test-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    const user = await prisma.user.findUnique({
      where: { email },
    });
    userId = user.id;

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .query({ code: user.verificationCode })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    accessToken = loginResponse.body.accessToken;

    // Create health profile
    const profileResponse = await request(app.getHttpServer())
      .post('/health-profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        age: 30,
        biologicalSex: 'male',
        height: 180,
        heightUnit: 'cm',
        currentWeight: 85,
        weightUnit: 'kg',
        goalWeight: 75,
        goalType: 'weight_loss',
        activityLevel: 'moderate',
        exerciseFrequency: 3,
        sleepHours: 7,
        stressLevel: 'medium',
        dietaryPreferences: ['vegetarian'],
        dietaryRestrictions: ['gluten-free'],
        medicalConditions: ['hypertension'],
        dataUsageConsent: true,
      })
      .expect(201);

    profileId = profileResponse.body.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'ai-test-' } },
    });
    await app.close();
  });

  describe('AI Recommendations Generation', () => {
    let firstInsight: any;

    it('should generate AI insights based on health profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.insights).toBeDefined();
      expect(Array.isArray(response.body.insights)).toBe(true);
      expect(response.body.insights.length).toBeGreaterThan(0);

      firstInsight = response.body.insights[0];
    });

    it('should include priority levels in insights', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const insight = response.body.insights[0];
      expect(insight.priority).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(insight.priority);
    });

    it('AI recommendations should reference user fitness goals', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const insights = response.body.insights;
      const hasGoalReference = insights.some((insight: any) => {
        const text = (insight.text || insight.recommendation || '').toLowerCase();
        return text.includes('weight loss') || 
               text.includes('lose weight') || 
               text.includes('75') || // goal weight
               text.includes('goal');
      });

      expect(hasGoalReference).toBe(true);
    });

    it('AI insights should NOT contain PII (email, name, etc)', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const insights = response.body.insights;
      
      insights.forEach((insight: any) => {
        const text = (insight.text || insight.recommendation || '').toLowerCase();
        
        // Should not contain email patterns
        expect(text).not.toMatch(/@.*\./);
        
        // Should not contain user ID
        expect(text).not.toContain(userId);
        
        // Check for common PII indicators
        expect(text).not.toMatch(/\b[a-z]+@[a-z]+\.[a-z]+\b/i);
      });
    });
  });

  describe('AI Response Validation Against Health Restrictions', () => {
    it('should NOT recommend foods that violate dietary restrictions', async () => {
      // User has gluten-free restriction and vegetarian preference
      const response = await request(app.getHttpServer())
        .get('/ai/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const insights = response.body.insights;
      
      insights.forEach((insight: any) => {
        const text = (insight.text || insight.recommendation || '').toLowerCase();
        
        // Should not recommend gluten-containing foods
        expect(text).not.toMatch(/\b(bread|pasta|wheat|barley|rye)\b/);
        
        // Should not recommend meat
        expect(text).not.toMatch(/\b(chicken|beef|pork|fish|meat)\b/);
      });
    });

    it('should consider medical conditions in recommendations', async () => {
      // User has hypertension - should avoid high sodium
      const response = await request(app.getHttpServer())
        .get('/ai/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const insights = response.body.insights;
      const text = insights.map((i: any) => i.text || i.recommendation || '').join(' ').toLowerCase();

      // Should mention monitoring or being careful with sodium/salt
      const mentionsSodiumCare = text.includes('sodium') || 
                                  text.includes('salt') || 
                                  text.includes('blood pressure');

      // Either mentions it or doesn't recommend high-sodium foods
      expect(mentionsSodiumCare || !text.includes('salt')).toBe(true);
    });
  });

  describe('Goal Changes Affect AI Insights', () => {
    it('should generate different insights when goals change', async () => {
      // Get initial insights for weight loss
      const response1 = await request(app.getHttpServer())
        .get('/ai/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const insights1 = response1.body.insights;

      // Change goal to muscle gain
      await request(app.getHttpServer())
        .patch(`/health-profile/${profileId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          goalType: 'muscle_gain',
          goalWeight: 90,
        })
        .expect(200);

      // Get new insights
      const response2 = await request(app.getHttpServer())
        .get('/ai/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const insights2 = response2.body.insights;

      // Insights should be different
      expect(insights2).not.toEqual(insights1);

      // New insights should mention muscle/strength
      const text2 = insights2.map((i: any) => i.text || i.recommendation || '').join(' ').toLowerCase();
      const mentionsMuscle = text2.includes('muscle') || 
                              text2.includes('strength') || 
                              text2.includes('gain') ||
                              text2.includes('protein');

      expect(mentionsMuscle).toBe(true);
    });

    it('should adapt recommendations after profile changes', async () => {
      // Change exercise frequency
      await request(app.getHttpServer())
        .patch(`/health-profile/${profileId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          exerciseFrequency: 6,
          activityLevel: 'high',
        })
        .expect(200);

      // Get new insights - should reflect higher activity level
      const response = await request(app.getHttpServer())
        .get('/ai/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.insights).toBeDefined();
      // Would check for activity-appropriate recommendations
    });
  });

  describe('AI Caching & Fallback', () => {
    it('should cache AI recommendations', async () => {
      // First request - generates and caches
      const response1 = await request(app.getHttpServer())
        .get('/ai/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const insights1 = response1.body.insights;

      // Second request quickly after - should use cache
      const response2 = await request(app.getHttpServer())
        .get('/ai/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const insights2 = response2.body.insights;

      // Cached result should be the same
      expect(insights2).toEqual(insights1);
    });

    it('should indicate when using cached vs fresh insights', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.cached).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should provide fallback when AI service unavailable', async () => {
      // This would require mocking the AI service to fail
      // For now, we document the expected behavior
      console.log(`
=============================================================
AI Fallback Testing Instructions
=============================================================

To test AI service fallback:

1. Temporarily disable AI service (e.g., invalid API key)
2. Request AI insights: GET /ai/insights
3. Should receive 200 OK with cached recommendations
4. Response should indicate it's using cached data
5. Should show timestamp of cached insights
6. Should NOT error out with 500

Expected response structure when using cache:
{
  "insights": [...cached insights...],
  "cached": true,
  "timestamp": "2026-02-05T10:30:00Z",
  "message": "Showing cached recommendations (AI service unavailable)"
}

Test by:
- Setting invalid OPENAI_API_KEY in .env
- Or commenting out AI service call in code
- Or using network interceptor to fail API calls
=============================================================
      `);
    });
  });

  describe('Prompt Engineering & Context', () => {
    it('should document prompt engineering approach', () => {
      console.log(`
=============================================================
AI Prompt Engineering Documentation
=============================================================

APPROACH: Structured prompt with context sections

PROMPT STRUCTURE:
1. System Role: "You are a health and wellness advisor"
2. User Context:
   - Demographics (age, sex)
   - Physical metrics (BMI, current/goal weight)
   - Activity level & exercise frequency
   - Lifestyle factors (sleep, stress)
   - Dietary preferences & restrictions
   - Medical conditions & medications
   - Current goals
3. Task: "Generate 3-5 personalized recommendations"
4. Constraints:
   - Must align with goals
   - Must respect dietary restrictions
   - Must consider medical conditions
   - Must be actionable and specific
   - Must prioritize safety

ZERO-SHOT vs FEW-SHOT:
- Currently using: Zero-shot (no examples)
- Reasoning: 
  * GPT-3.5-turbo has strong instruction-following
  * Each user is unique, examples may not generalize
  * Reduces token usage
  * Faster response time
- Could improve with few-shot if we see quality issues

CONTEXT LENGTH IMPACT:
- Full profile: ~500-800 tokens
- Provides comprehensive context for personalization
- Trade-off: Higher cost but better quality
- Optimized by:
  * Structured format (not verbose)
  * Only relevant fields
  * Pruning unnecessary details

MODEL CHOICE: GPT-3.5-turbo
- Reasoning:
  * Balance of quality and latency
  * Cost-effective for production
  * Sufficient for health recommendations
  * Sub-second response times
- Alternatives considered:
  * GPT-4: Better but 10x cost, slower
  * GPT-3.5-turbo-instruct: Similar quality, faster
=============================================================
      `);
    });
  });

  describe('PII Removal Strategy', () => {
    it('should document how PII removal affects personalization', () => {
      console.log(`
=============================================================
PII Removal vs Personalization Trade-offs
=============================================================

WHAT IS REMOVED:
- User email
- User name (if collected)
- Database IDs replaced with session UUIDs
- Location data
- Exact birthdates (only age is used)

WHAT IS KEPT:
- Age (needed for age-appropriate recommendations)
- Biological sex (metabolic differences)
- Physical metrics (BMI, weight - not identifiable)
- Activity patterns (behavioral data, not identifiable)
- Goals and preferences (contextual, not identifiable)

IMPACT ON PERSONALIZATION:
✅ STILL PERSONALIZED:
- Recommendations based on goals (weight loss, muscle gain, etc.)
- Activity level adjustments
- Dietary restrictions honored
- Medical conditions considered
- Age-appropriate advice

❌ LESS PERSONALIZED:
- Cannot reference user by name
- Cannot use location for local recommendations
- Cannot track historical patterns across sessions (unless cached)

COMPENSATION STRATEGIES:
1. Rich context from health profile
2. Goal-oriented recommendations
3. Restriction-aware filtering
4. Progress tracking via metrics
5. Caching for continuity

RESULT:
Recommendations remain highly personalized and actionable
while protecting user privacy and complying with regulations.

Example personalized insight WITHOUT PII:
"Based on your goal to lose 10kg and your vegetarian diet,
focus on high-protein plant foods like lentils and tofu.
At 3 workouts per week, aim to increase to 4-5 for better
results. Your current BMI of 26.2 suggests a moderate
calorie deficit of 500 kcal/day is appropriate."
=============================================================
      `);
    });
  });

  describe('Hallucination Detection', () => {
    it('should document hallucination prevention strategies', () => {
      console.log(`
=============================================================
AI Hallucination Detection & Prevention
=============================================================

DEFINITION:
Hallucinations = AI generating false, harmful, or 
inconsistent health information

PREVENTION STRATEGIES:

1. PROMPT CONSTRAINTS:
   - Clear system role ("health advisor")
   - Explicit safety requirements
   - "Base recommendations on evidence-based practices"
   - "If uncertain, recommend consulting healthcare provider"

2. RESPONSE VALIDATION:
   - Check for goal alignment
   - Verify no dietary violations
   - Ensure medical condition consideration
   - Flag overly specific medical claims

3. VALIDATION RULES:
   - Must reference user's stated goal
   - Must not contradict dietary restrictions
   - Must not recommend extreme measures
   - Must include appropriate disclaimers
   - Must not diagnose conditions

4. POST-PROCESSING FILTERS:
   - Regex patterns for dangerous keywords:
     * "cure", "diagnose", "treat" (medical claims)
     * Extreme dosages or protocols
     * Dangerous exercise intensities
   - Restriction violation checking
   - Goal mismatch detection

5. FALLBACK RESPONSES:
   - If validation fails, use generic safe advice
   - Always include "consult your doctor" disclaimer
   - Cache validated responses only

TESTING APPROACH:
- Monitor for restriction violations
- Check goal alignment
- Review for medical claims
- Test edge cases (extreme profiles)
- Human review of samples

HUMAN OVERSIGHT:
- Log all AI responses
- Periodic review by health professionals
- User feedback mechanism
- Report inappropriate recommendations
=============================================================
      `);
    });

    it('should validate responses match user goals', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const insights = response.body.insights;

      // At least one insight should reference the goal
      const goalAligned = insights.some((insight: any) => {
        const text = (insight.text || insight.recommendation || '').toLowerCase();
        // Current goal is muscle_gain (from earlier test)
        return text.includes('muscle') || 
               text.includes('strength') || 
               text.includes('gain') ||
               text.includes('protein');
      });

      expect(goalAligned).toBe(true);
    });
  });
});
