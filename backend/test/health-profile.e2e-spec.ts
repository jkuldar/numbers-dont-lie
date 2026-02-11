import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

/**
 * Health Profile & Analytics E2E Tests
 * 
 * These tests verify:
 * - Duplicate activity/weight entry prevention (same timestamp)
 * - BMI calculation and classifications
 * - Wellness score calculation and real-time updates
 * - Weekly/monthly summaries generation
 * - Progress tracking and milestones
 */
describe('Health Profile & Analytics E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let testUserEmail: string;
  let profileId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create test user and login
    testUserEmail = `health-test-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    // Register
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testUserEmail, password })
      .expect(201);

    // Get verification code
    const user = await prisma.user.findUnique({
      where: { email: testUserEmail },
    });
    userId = user.id;

    // Verify email
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .query({ code: user.verificationCode })
      .expect(201);

    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUserEmail, password })
      .expect(201);

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Clean up
    await prisma.user.deleteMany({
      where: { email: { contains: 'health-test-' } },
    });
    await app.close();
  });

  describe('Health Profile Creation', () => {
    it('should create health profile with all required fields', async () => {
      const profileData = {
        // Demographics
        age: 30,
        biologicalSex: 'male',
        // Physical metrics (will be normalized to kg/cm)
        height: 180,
        heightUnit: 'cm',
        currentWeight: 80,
        weightUnit: 'kg',
        // Goals
        goalWeight: 75,
        goalType: 'weight_loss',
        // Lifestyle
        activityLevel: 'moderate',
        exerciseFrequency: 3,
        sleepHours: 7,
        stressLevel: 'medium',
        // Dietary
        dietaryPreferences: ['vegetarian'],
        dietaryRestrictions: ['gluten-free'],
        // Medical
        medicalConditions: [],
        medications: [],
        // Consent
        dataUsageConsent: true,
      };

      const response = await request(app.getHttpServer())
        .post('/health-profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(profileData)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.bmi).toBeDefined();
      expect(response.body.bmiCategory).toBeDefined();
      expect(response.body.wellnessScore).toBeDefined();

      profileId = response.body.id;

      // Verify data was normalized
      expect(response.body.height).toBe(180); // cm
      expect(response.body.currentWeight).toBe(80); // kg
    });

    it('should calculate BMI correctly', async () => {
      const profile = await prisma.healthProfile.findUnique({
        where: { id: profileId },
      });

      // BMI = weight(kg) / (height(m))^2
      // 80 / (1.8)^2 = 24.69
      expect(profile.bmi).toBeCloseTo(24.69, 1);
      expect(profile.bmiCategory).toBe('normal');
    });

    it('should classify BMI categories correctly', async () => {
      const testCases = [
        { height: 180, weight: 55, expectedCategory: 'underweight' }, // BMI 17
        { height: 180, weight: 70, expectedCategory: 'normal' },      // BMI 21.6
        { height: 180, weight: 85, expectedCategory: 'overweight' },  // BMI 26.2
        { height: 180, weight: 100, expectedCategory: 'obese' },      // BMI 30.9
      ];

      for (const testCase of testCases) {
        // Update profile with new weight
        const response = await request(app.getHttpServer())
          .patch(`/health-profile/${profileId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            currentWeight: testCase.weight,
            weightUnit: 'kg',
          })
          .expect(200);

        expect(response.body.bmiCategory).toBe(testCase.expectedCategory);
      }
    });

    it('should handle invalid BMI values', async () => {
      await request(app.getHttpServer())
        .patch(`/health-profile/${profileId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentWeight: -1,
          weightUnit: 'kg',
        })
        .expect(400);
    });
  });

  describe('Wellness Score Calculation', () => {
    it('should calculate wellness score from 4 components', async () => {
      const profile = await prisma.healthProfile.findUnique({
        where: { id: profileId },
      });

      // Wellness Score = BMI (30%) + Activity (30%) + Progress (20%) + Habits (20%)
      expect(profile.wellnessScore).toBeDefined();
      expect(profile.wellnessScore).toBeGreaterThanOrEqual(0);
      expect(profile.wellnessScore).toBeLessThanOrEqual(100);
    });

    it('should update wellness score when BMI changes', async () => {
      // Get initial score
      let profile = await prisma.healthProfile.findUnique({
        where: { id: profileId },
      });
      const initialScore = profile.wellnessScore;

      // Change weight (changes BMI)
      await request(app.getHttpServer())
        .patch(`/health-profile/${profileId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentWeight: 75,
          weightUnit: 'kg',
        })
        .expect(200);

      // Check score updated
      profile = await prisma.healthProfile.findUnique({
        where: { id: profileId },
      });

      expect(profile.wellnessScore).not.toBe(initialScore);
    });

    it('should update wellness score when activity frequency changes', async () => {
      // Get initial score
      let profile = await prisma.healthProfile.findUnique({
        where: { id: profileId },
      });
      const initialScore = profile.wellnessScore;

      // Change exercise frequency
      await request(app.getHttpServer())
        .patch(`/health-profile/${profileId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          exerciseFrequency: 5,
        })
        .expect(200);

      // Check score updated
      profile = await prisma.healthProfile.findUnique({
        where: { id: profileId },
      });

      expect(profile.wellnessScore).not.toBe(initialScore);
      expect(profile.wellnessScore).toBeGreaterThan(initialScore); // More exercise = better score
    });
  });

  describe('Weight History Tracking', () => {
    it('should track weight changes with timestamps', async () => {
      const weights = [
        { weight: 80, date: new Date('2026-01-01') },
        { weight: 79, date: new Date('2026-01-08') },
        { weight: 78, date: new Date('2026-01-15') },
      ];

      for (const entry of weights) {
        await request(app.getHttpServer())
          .post('/health-profile/weight-history')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            weight: entry.weight,
            unit: 'kg',
            recordedAt: entry.date,
          })
          .expect(201);
      }

      // Fetch history
      const response = await request(app.getHttpServer())
        .get('/health-profile/weight-history')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(3);
      expect(response.body[0].recordedAt).toBeDefined();
    });

    it('should prevent duplicate weight entries for same timestamp', async () => {
      const timestamp = new Date();

      // First entry should succeed
      await request(app.getHttpServer())
        .post('/health-profile/weight-history')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          weight: 77,
          unit: 'kg',
          recordedAt: timestamp,
        })
        .expect(201);

      // Duplicate should fail
      await request(app.getHttpServer())
        .post('/health-profile/weight-history')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          weight: 76,
          unit: 'kg',
          recordedAt: timestamp,
        })
        .expect(400);
    });
  });

  describe('Activity Entry & Duplicate Prevention', () => {
    it('should create activity entry with timestamp', async () => {
      const response = await request(app.getHttpServer())
        .post('/health-profile/activity')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          activityType: 'running',
          duration: 30,
          intensity: 'moderate',
          recordedAt: new Date(),
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.activityType).toBe('running');
    });

    it('should prevent duplicate activity entries for same timestamp', async () => {
      const timestamp = new Date();

      // First entry should succeed
      await request(app.getHttpServer())
        .post('/health-profile/activity')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          activityType: 'cycling',
          duration: 45,
          intensity: 'high',
          recordedAt: timestamp,
        })
        .expect(201);

      // Duplicate timestamp should fail
      const response = await request(app.getHttpServer())
        .post('/health-profile/activity')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          activityType: 'swimming',
          duration: 60,
          intensity: 'moderate',
          recordedAt: timestamp,
        })
        .expect(400);

      expect(response.body.message).toContain('duplicate');
    });
  });

  describe('Progress & Milestones', () => {
    it('should track progress towards goal weight', async () => {
      const response = await request(app.getHttpServer())
        .get('/health-profile/progress')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.goalProgress).toBeDefined();
      expect(response.body.goalProgress.current).toBeDefined();
      expect(response.body.goalProgress.target).toBeDefined();
      expect(response.body.goalProgress.percentComplete).toBeDefined();
    });

    it('should track milestones for weight loss', async () => {
      // Milestones: every 5% towards goal
      const response = await request(app.getHttpServer())
        .get('/health-profile/milestones')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.weightMilestones).toBeDefined();
      expect(Array.isArray(response.body.weightMilestones)).toBe(true);
    });

    it('should track activity milestones (days per week)', async () => {
      const response = await request(app.getHttpServer())
        .get('/health-profile/milestones')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.activityMilestones).toBeDefined();
    });
  });

  describe('Weekly & Monthly Summaries', () => {
    it('should generate weekly health summary', async () => {
      const response = await request(app.getHttpServer())
        .get('/health-profile/summary/weekly')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.period).toBe('weekly');
      expect(response.body.activityLevels).toBeDefined();
      expect(response.body.wellnessScoreChange).toBeDefined();
      expect(response.body.goalProgress).toBeDefined();
      expect(response.body.startDate).toBeDefined();
      expect(response.body.endDate).toBeDefined();
    });

    it('should generate monthly health summary', async () => {
      const response = await request(app.getHttpServer())
        .get('/health-profile/summary/monthly')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.period).toBe('monthly');
      expect(response.body.activityLevels).toBeDefined();
      expect(response.body.wellnessScoreChange).toBeDefined();
      expect(response.body.goalProgress).toBeDefined();
      expect(response.body.startDate).toBeDefined();
      expect(response.body.endDate).toBeDefined();
    });

    it('weekly summary should include all required metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/health-profile/summary/weekly')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Must include: activity, score changes, progress
      expect(response.body.activityLevels.totalActivities).toBeDefined();
      expect(response.body.activityLevels.totalDuration).toBeDefined();
      expect(response.body.wellnessScoreChange.startScore).toBeDefined();
      expect(response.body.wellnessScoreChange.endScore).toBeDefined();
      expect(response.body.goalProgress.percentComplete).toBeDefined();
    });

    it('monthly summary should include all required metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/health-profile/summary/monthly')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Must include: activity, score changes, progress
      expect(response.body.activityLevels.totalActivities).toBeDefined();
      expect(response.body.activityLevels.averagePerWeek).toBeDefined();
      expect(response.body.wellnessScoreChange).toBeDefined();
      expect(response.body.goalProgress).toBeDefined();
    });
  });

  describe('Data Privacy & Consent', () => {
    it('should require data usage consent before creating profile', async () => {
      const newEmail = `consent-test-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      // Register, verify, login
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: newEmail, password });

      const user = await prisma.user.findUnique({
        where: { email: newEmail },
      });

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .query({ code: user.verificationCode });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: newEmail, password });

      const token = loginResponse.body.accessToken;

      // Try to create profile without consent
      await request(app.getHttpServer())
        .post('/health-profile')
        .set('Authorization', `Bearer ${token}`)
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
          dataUsageConsent: false, // No consent
        })
        .expect(400);
    });
  });
});
