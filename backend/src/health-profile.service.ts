import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EncryptionService } from './encryption.service';

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
    // Ensure consent is given
    if (!data.consentGiven) {
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
}
