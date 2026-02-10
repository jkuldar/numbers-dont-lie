import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EncryptionService } from './encryption.service';

type SummaryPeriod = 'week' | 'month';

@Injectable()
export class HealthProfileService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  /**
   * Normalize units to kg and cm before storing
   */
  normalizeUnits(data: any): any {
    const normalized = { ...data };

    // Height normalization
    if (data.height !== undefined && data.heightUnit) {
      normalized.heightCm = this.convertHeightToCm(data.height, data.heightUnit);
      delete normalized.height;
      delete normalized.heightUnit;
    }

    // Weight normalization
    if (data.currentWeight !== undefined && data.weightUnit) {
      normalized.currentWeightKg = this.convertWeightToKg(data.currentWeight, data.weightUnit);
      delete normalized.currentWeight;
      delete normalized.weightUnit;
    }

    if (data.targetWeight !== undefined && data.weightUnit) {
      normalized.targetWeightKg = this.convertWeightToKg(data.targetWeight, data.weightUnit);
      delete normalized.targetWeight;
    }

    return normalized;
  }

  /**
   * Convert height to cm
   */
  convertHeightToCm(value: number, unit: string): number {
    switch (unit.toLowerCase()) {
      case 'cm':
        return value;
      case 'm':
        return value * 100;
      case 'ft':
        return value * 30.48;
      case 'in':
        return value * 2.54;
      default:
        throw new BadRequestException(`Unsupported height unit: ${unit}`);
    }
  }

  /**
   * Convert weight to kg
   */
  convertWeightToKg(value: number, unit: string): number {
    switch (unit.toLowerCase()) {
      case 'kg':
        return value;
      case 'g':
        return value / 1000;
      case 'lb':
        return value * 0.453592;
      case 'oz':
        return value * 0.0283495;
      default:
        throw new BadRequestException(`Unsupported weight unit: ${unit}`);
    }
  }

  /**
   * Create or update health profile with consent
   */
  async createOrUpdateProfile(userId: string, data: any) {
    // For updates, only require consent on first save
    const existingProfile = await this.prisma.healthProfile.findUnique({
      where: { userId },
    });
    
    // If profile exists and was consented before, no need to check again
    if (!existingProfile && !data.consentGiven) {
      throw new BadRequestException('Consent required to save health data');
    }

    const profileData = {
      consentGiven: data.consentGiven,
      consentTimestamp: new Date(),
      age: data.age,
      gender: data.gender,
      heightCm: data.heightCm,
      currentWeightKg: data.currentWeightKg,
      targetWeightKg: data.targetWeightKg,
      activityLevel: data.activityLevel,
      sleepHoursPerDay: data.sleepHoursPerDay,
      stressLevel: data.stressLevel,
      dietaryPreferences: this.encryptArray(data.dietaryPreferences),
      allergies: this.encryptArray(data.allergies),
      restrictions: this.encryptArray(data.restrictions),
      primaryGoal: data.primaryGoal,
      targetDate: data.targetDate ? new Date(data.targetDate) : null,
      weeklyActivityGoal: data.weeklyActivityGoal,
      fitnessLevel: data.fitnessLevel,
      medicalConditions: this.encryptArray(data.medicalConditions),
      medications: this.encryptArray(data.medications),
    };

    // Upsert health profile
    const profile = await this.prisma.healthProfile.upsert({
      where: { userId },
      update: profileData,
      create: {
        userId,
        ...profileData,
      },
    });

    await this.recalculateDerivedMetrics(userId);

    return {
      message: 'Health profile saved successfully',
      profile,
    };
  }

  /**
   * Get health profile
   */
  async getProfile(userId: string) {
    const profile = await this.prisma.healthProfile.findUnique({
      where: { userId },
    });

    return this.decryptProfile(profile);
  }

  /**
   * Update consent status
   */
  async updateConsent(userId: string, consentGiven: boolean) {
    const profile = await this.prisma.healthProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Create minimal profile with consent
      return await this.prisma.healthProfile.create({
        data: {
          userId,
          consentGiven,
          consentTimestamp: consentGiven ? new Date() : null,
        },
      });
    }

    return await this.prisma.healthProfile.update({
      where: { userId },
      data: {
        consentGiven,
        consentTimestamp: consentGiven ? new Date() : null,
      },
    });
  }

  /**
   * Add weight entry with timestamp
   */
  async addWeightEntry(userId: string, weightKg: number, note?: string) {
    try {
      const entry = await this.prisma.weightHistory.create({
        data: {
          userId,
          weightKg,
          note,
          recordedAt: new Date(),
        },
      });

      // Update current weight in profile
      await this.prisma.healthProfile.updateMany({
        where: { userId },
        data: { currentWeightKg: weightKg },
      });

      await this.recalculateDerivedMetrics(userId);

      return {
        message: 'Weight entry added successfully',
        entry,
      };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('Duplicate weight entry for this timestamp');
      }
      throw error;
    }
  }

  /**
   * Get weight history
   */
  async getWeightHistory(userId: string) {
    return await this.prisma.weightHistory.findMany({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async addActivityEntry(
    userId: string,
    data: {
      type?: string;
      durationMin?: number;
      intensity?: string;
      calories?: number;
      steps?: number;
      loggedAt?: Date;
      note?: string;
    },
  ) {
    try {
      const entry = await this.prisma.activityEntry.create({
        data: {
          userId,
          type: data.type,
          durationMin: data.durationMin,
          intensity: data.intensity,
          calories: data.calories,
          steps: data.steps,
          loggedAt: data.loggedAt ? new Date(data.loggedAt) : new Date(),
          note: data.note,
        },
      });

      await this.recalculateDerivedMetrics(userId);

      return {
        message: 'Activity entry added successfully',
        entry,
      };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('Duplicate activity entry for this timestamp');
      }
      throw error;
    }
  }

  /**
   * Get activity entries for a user
   */
  async getActivityEntries(userId: string) {
    return await this.prisma.activityEntry.findMany({
      where: { userId },
      orderBy: { loggedAt: 'desc' },
    });
  }

  async addHabitLog(userId: string, habitType: string, loggedDate?: Date, note?: string) {
    try {
      const log = await this.prisma.habitLog.create({
        data: {
          userId,
          habitType,
          loggedDate: loggedDate ? new Date(loggedDate) : new Date(),
          note,
        },
      });

      await this.recalculateDerivedMetrics(userId);

      return {
        message: 'Habit logged successfully',
        log,
      };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('Duplicate habit entry for this date');
      }
      throw error;
    }
  }

  async getWellnessSnapshot(userId: string) {
    const profile = await this.prisma.healthProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new BadRequestException('Health profile not found');
    }
    const recomputed = await this.recalculateDerivedMetrics(userId);
    return {
      bmi: recomputed.bmi,
      bmiClass: recomputed.bmiClass,
      wellnessScore: recomputed.wellnessScore,
      progressPercent: recomputed.progressPercent,
      nextMilestonePercent: recomputed.nextMilestonePercent,
      activityStreakDays: recomputed.activityStreakDays,
      habitStreakDays: recomputed.habitStreakDays,
    };
  }

  async getSummary(userId: string, period: SummaryPeriod) {
    const start = period === 'week' ? this.startOfWeek(new Date()) : this.startOfMonth(new Date());
    const now = new Date();

    const [activityEntries, weightEntries, currentMetrics, previousMetrics] = await Promise.all([
      this.prisma.activityEntry.findMany({
        where: { userId, loggedAt: { gte: start, lte: now } },
      }),
      this.prisma.weightHistory.findMany({ where: { userId, recordedAt: { gte: start, lte: now } } }),
      this.recalculateDerivedMetrics(userId),
      this.computeWellnessScoreAt(userId, start),
    ]);

    const totalActivityMinutes = activityEntries.reduce((sum, e) => sum + (e.durationMin || 0), 0);
    const activityDays = new Set(
      activityEntries.map((e) => e.loggedAt.toISOString().substring(0, 10)),
    ).size;

    const averageWeight = weightEntries.length
      ? weightEntries.reduce((sum, e) => sum + e.weightKg, 0) / weightEntries.length
      : undefined;

    return {
      period,
      from: start,
      to: now,
      activity: {
        totalMinutes: totalActivityMinutes,
        days: activityDays,
        entries: activityEntries.length,
      },
      weightChange:
        weightEntries.length >= 2
          ? weightEntries[weightEntries.length - 1].weightKg - weightEntries[0].weightKg
          : 0,
      averageWeight,
      wellnessScoreChange:
        (currentMetrics.wellnessScore || 0) - (previousMetrics.wellnessScore || 0),
      progressChange: (currentMetrics.progressPercent || 0) - (previousMetrics.progressPercent || 0),
    };
  }

  /**
   * Export all user data (GDPR compliance)
   */
  async exportUserData(userId: string, format: 'json' | 'csv') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const healthProfile = await this.prisma.healthProfile.findUnique({
      where: { userId },
    });

    const decryptedHealthProfile = this.decryptProfile(healthProfile);

    const weightHistory = await this.prisma.weightHistory.findMany({
      where: { userId },
      orderBy: { recordedAt: 'asc' },
    });

    const privacySettings = await this.prisma.privacySettings.findUnique({
      where: { userId },
    });

    const exportData = {
      user,
      healthProfile: decryptedHealthProfile,
      weightHistory,
      privacySettings,
      exportedAt: new Date().toISOString(),
    };

    if (format === 'csv') {
      return this.convertToCSV(exportData);
    }

    return exportData;
  }

  /**
   * Convert export data to CSV format
   */
  private convertToCSV(data: any): string {
    let csv = '';

    // User info
    csv += 'USER INFORMATION\n';
    csv += 'Field,Value\n';
    if (data.user) {
      Object.entries(data.user).forEach(([key, value]) => {
        csv += `${key},${value}\n`;
      });
    }
    csv += '\n';

    // Health Profile
    csv += 'HEALTH PROFILE\n';
    csv += 'Field,Value\n';
    if (data.healthProfile) {
      Object.entries(data.healthProfile).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          csv += `${key},"${value.join(', ')}"\n`;
        } else {
          csv += `${key},${value}\n`;
        }
      });
    }
    csv += '\n';

    // Weight History
    csv += 'WEIGHT HISTORY\n';
    csv += 'Date,Weight (kg),Note\n';
    if (data.weightHistory && data.weightHistory.length > 0) {
      data.weightHistory.forEach((entry: any) => {
        csv += `${entry.recordedAt},${entry.weightKg},${entry.note || ''}\n`;
      });
    }
    csv += '\n';

    // Privacy Settings
    csv += 'PRIVACY SETTINGS\n';
    csv += 'Setting,Value\n';
    if (data.privacySettings) {
      Object.entries(data.privacySettings).forEach(([key, value]) => {
        csv += `${key},${value}\n`;
      });
    }

    csv += `\nExported at,${data.exportedAt}\n`;

    return csv;
  }

  private encryptArray(values?: string[]): string[] {
    if (!values || values.length === 0) return [];
    return values.map((v) => this.encryptionService.encrypt(v));
  }

  private decryptArray(values?: string[]): string[] {
    if (!values || values.length === 0) return [];
    return values.map((v) => {
      try {
        return this.encryptionService.decrypt(v);
      } catch {
        return v;
      }
    });
  }

  private decryptProfile(profile: any) {
    if (!profile) return profile;
    return {
      ...profile,
      dietaryPreferences: this.decryptArray(profile.dietaryPreferences),
      allergies: this.decryptArray(profile.allergies),
      restrictions: this.decryptArray(profile.restrictions),
      medicalConditions: this.decryptArray(profile.medicalConditions),
      medications: this.decryptArray(profile.medications),
    };
  }

  private async recalculateDerivedMetrics(userId: string) {
    const profile = await this.prisma.healthProfile.findUnique({ where: { userId } });
    if (!profile) throw new BadRequestException('Health profile missing');

    const latestWeight = profile.currentWeightKg;
    const height = profile.heightCm;
    const { bmi, bmiClass } = this.calculateBMI(height, latestWeight);

    const baselineWeight = await this.getBaselineWeight(userId, latestWeight);
    const progress = this.calculateProgressPercent(profile, baselineWeight, latestWeight);
    const nextMilestonePercent = this.calculateNextMilestone(progress);
    const activityStreakDays = await this.calculateActivityStreak(userId);
    const habitStreakDays = await this.calculateHabitStreak(userId);
    const wellnessScore = await this.computeWellnessScore(userId, {
      bmi,
      bmiClass,
      progressPercent: progress,
      activityStreakDays,
      habitStreakDays,
    });

    const updated = await this.prisma.healthProfile.update({
      where: { userId },
      data: {
        bmi,
        bmiClass,
        wellnessScore,
        progressPercent: progress,
        nextMilestonePercent,
        activityStreakDays,
        habitStreakDays,
      },
    });

    return updated;
  }

  private calculateBMI(heightCm?: number | null, weightKg?: number | null) {
    if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
      return { bmi: null, bmiClass: null };
    }
    const heightM = heightCm / 100;
    const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
    let bmiClass = 'unknown';
    if (bmi < 18.5) bmiClass = 'underweight';
    else if (bmi < 25) bmiClass = 'normal';
    else if (bmi < 30) bmiClass = 'overweight';
    else if (bmi < 35) bmiClass = 'obese';
    else bmiClass = 'severely_obese';
    return { bmi, bmiClass };
  }

  private async getBaselineWeight(userId: string, fallback?: number | null) {
    const firstEntry = await this.prisma.weightHistory.findFirst({
      where: { userId },
      orderBy: { recordedAt: 'asc' },
    });
    return firstEntry?.weightKg ?? fallback ?? null;
  }

  private calculateProgressPercent(profile: any, baselineWeight?: number | null, latestWeight?: number | null) {
    if (!profile.targetWeightKg || !baselineWeight || !latestWeight) return null;
    const target = profile.targetWeightKg;
    if (target === baselineWeight) return 0;

    // If aiming to lose weight
    if (target < baselineWeight) {
      const progress = ((baselineWeight - latestWeight) / (baselineWeight - target)) * 100;
      return Math.max(0, Math.min(100, Number(progress.toFixed(1))));
    }

    // If aiming to gain weight
    if (target > baselineWeight) {
      const progress = ((latestWeight - baselineWeight) / (target - baselineWeight)) * 100;
      return Math.max(0, Math.min(100, Number(progress.toFixed(1))));
    }

    return null;
  }

  private calculateNextMilestone(progressPercent: number | null) {
    if (progressPercent === null) return null;
    const step = 5;
    const completed = Math.floor(progressPercent / step) * step;
    const next = completed + step;
    return next > 100 ? null : next;
  }

  private async calculateActivityStreak(userId: string) {
    const entries = await this.prisma.activityEntry.findMany({
      where: { userId },
      orderBy: { loggedAt: 'desc' },
      select: { loggedAt: true },
      take: 30,
    });
    const dates = entries.map((e) => e.loggedAt);
    return this.computeConsecutiveDays(dates);
  }

  private async calculateHabitStreak(userId: string) {
    const logs = await this.prisma.habitLog.findMany({
      where: { userId },
      orderBy: { loggedDate: 'desc' },
      select: { loggedDate: true },
      take: 30,
    });
    const dates = logs.map((l) => l.loggedDate);
    return this.computeConsecutiveDays(dates);
  }

  private computeConsecutiveDays(dates: Date[], reference: Date = new Date()) {
    if (!dates.length) return 0;
    const set = new Set(dates.map((d) => d.toISOString().substring(0, 10)));
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const day = new Date(reference);
      day.setDate(reference.getDate() - i);
      const key = day.toISOString().substring(0, 10);
      if (set.has(key)) streak += 1;
      else break;
    }
    return streak;
  }

  private async computeWellnessScore(
    userId: string,
    preset?: {
      bmi: number | null;
      bmiClass: string | null;
      progressPercent: number | null;
      activityStreakDays: number;
      habitStreakDays: number;
    },
  ) {
    const profile = await this.prisma.healthProfile.findUnique({ where: { userId } });
    if (!profile) throw new BadRequestException('Health profile not found');

    const bmi = preset?.bmi ?? profile.bmi;
    const bmiClass = preset?.bmiClass ?? profile.bmiClass;
    const progressPercent = preset?.progressPercent ?? profile.progressPercent;

    const since = new Date();
    since.setDate(since.getDate() - 7);
    const recentActivity = await this.prisma.activityEntry.findMany({
      where: { userId, loggedAt: { gte: since } },
    });
    const activeDays = new Set(recentActivity.map((a) => a.loggedAt.toISOString().substring(0, 10))).size;
    const activityGoal = profile.weeklyActivityGoal || 3;
    const activityScoreRaw = activityGoal > 0 ? Math.min(100, (activeDays / activityGoal) * 100) : 50;

    const habitStreakDays = preset?.habitStreakDays ?? (profile.habitStreakDays || 0);
    const habitsScore = Math.min(100, (habitStreakDays / 7) * 100 || 50);

    let bmiScore = 50;
    switch (bmiClass) {
      case 'normal':
        bmiScore = 100;
        break;
      case 'underweight':
      case 'overweight':
        bmiScore = 70;
        break;
      case 'obese':
        bmiScore = 50;
        break;
      case 'severely_obese':
        bmiScore = 30;
        break;
      default:
        bmiScore = 50;
    }

    const progressScore = progressPercent !== null ? Math.min(100, Math.max(0, progressPercent)) : 50;
    const total =
      bmiScore * 0.3 +
      activityScoreRaw * 0.3 +
      progressScore * 0.2 +
      habitsScore * 0.2;

    return Math.round(total);
  }

  private async computeWellnessScoreAt(userId: string, referenceDate: Date) {
    const profile = await this.prisma.healthProfile.findUnique({ where: { userId } });
    if (!profile) throw new BadRequestException('Health profile not found');

    const weightAtDate = await this.getWeightAtDate(userId, referenceDate, profile.currentWeightKg);
    const { bmi, bmiClass } = this.calculateBMI(profile.heightCm, weightAtDate);

    const baselineWeight = await this.getBaselineWeight(userId, weightAtDate);
    const progressPercent = this.calculateProgressPercent(profile, baselineWeight, weightAtDate);

    const habitStreak = await this.calculateHabitStreakUntil(userId, referenceDate);
    const activityStreak = await this.calculateActivityStreakUntil(userId, referenceDate);

    const since = new Date(referenceDate);
    since.setDate(since.getDate() - 7);
    const recentActivity = await this.prisma.activityEntry.findMany({
      where: { userId, loggedAt: { gte: since, lte: referenceDate } },
    });
    const activeDays = new Set(recentActivity.map((a) => a.loggedAt.toISOString().substring(0, 10))).size;
    const activityGoal = profile.weeklyActivityGoal || 3;
    const activityScoreRaw = activityGoal > 0 ? Math.min(100, (activeDays / activityGoal) * 100) : 50;
    let bmiScore = 50;
    switch (bmiClass) {
      case 'normal':
        bmiScore = 100;
        break;
      case 'underweight':
      case 'overweight':
        bmiScore = 70;
        break;
      case 'obese':
        bmiScore = 50;
        break;
      case 'severely_obese':
        bmiScore = 30;
        break;
      default:
        bmiScore = 50;
    }
    const progressScore = progressPercent !== null ? Math.min(100, Math.max(0, progressPercent)) : 50;
    const habitsScore = Math.min(100, (habitStreak / 7) * 100 || 50);
    const total =
      bmiScore * 0.3 +
      activityScoreRaw * 0.3 +
      progressScore * 0.2 +
      habitsScore * 0.2;
    return {
      wellnessScore: Math.round(total),
      progressPercent,
    };
  }

  private async getWeightAtDate(userId: string, referenceDate: Date, fallback?: number | null) {
    const entry = await this.prisma.weightHistory.findFirst({
      where: { userId, recordedAt: { lte: referenceDate } },
      orderBy: { recordedAt: 'desc' },
    });
    return entry?.weightKg ?? fallback ?? null;
  }

  private async calculateHabitStreakUntil(userId: string, until: Date) {
    const logs = await this.prisma.habitLog.findMany({
      where: { userId, loggedDate: { lte: until } },
      orderBy: { loggedDate: 'desc' },
      select: { loggedDate: true },
      take: 30,
    });
    const dates = logs.map((l) => l.loggedDate);
    return this.computeConsecutiveDays(dates, until);
  }

  private async calculateActivityStreakUntil(userId: string, until: Date) {
    const entries = await this.prisma.activityEntry.findMany({
      where: { userId, loggedAt: { lte: until } },
      orderBy: { loggedAt: 'desc' },
      select: { loggedAt: true },
      take: 30,
    });
    const dates = entries.map((e) => e.loggedAt);
    return this.computeConsecutiveDays(dates, until);
  }

  private startOfWeek(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private startOfMonth(date: Date) {
    const d = new Date(date.getFullYear(), date.getMonth(), 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
}
