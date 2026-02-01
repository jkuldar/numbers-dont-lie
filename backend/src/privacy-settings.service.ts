import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrivacySettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get privacy settings for a user
   */
  async getSettings(userId: string) {
    let settings = await this.prisma.privacySettings.findUnique({
      where: { userId },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await this.prisma.privacySettings.create({
        data: {
          userId,
          shareWithAI: true,
          shareAnonymousData: false,
          allowDataExport: true,
          includeWeight: true,
          includeActivity: true,
          includeDietary: true,
          includeMedical: false,
        },
      });
    }

    return settings;
  }

  /**
   * Create or update privacy settings
   */
  async createOrUpdateSettings(userId: string, data: any) {
    const settingsData = {
      shareWithAI: data.shareWithAI ?? true,
      shareAnonymousData: data.shareAnonymousData ?? false,
      allowDataExport: data.allowDataExport ?? true,
      includeWeight: data.includeWeight ?? true,
      includeActivity: data.includeActivity ?? true,
      includeDietary: data.includeDietary ?? true,
      includeMedical: data.includeMedical ?? false,
    };

    const settings = await this.prisma.privacySettings.upsert({
      where: { userId },
      update: settingsData,
      create: {
        userId,
        ...settingsData,
      },
    });

    return {
      message: 'Privacy settings updated successfully',
      settings,
    };
  }

  /**
   * Update specific privacy settings
   */
  async updateSettings(userId: string, data: any) {
    const settings = await this.prisma.privacySettings.update({
      where: { userId },
      data,
    });

    return {
      message: 'Privacy settings updated successfully',
      settings,
    };
  }

  /**
   * Get filtered data for AI based on privacy settings
   */
  async getAIReadyData(userId: string) {
    const settings = await this.getSettings(userId);
    
    if (!settings.shareWithAI) {
      return null;
    }

    const healthProfile = await this.prisma.healthProfile.findUnique({
      where: { userId },
    });

    if (!healthProfile) {
      return null;
    }

    // Build filtered data based on privacy preferences
    const aiData: any = {
      // Always include basic demographics for AI context
      age: healthProfile.age,
      gender: healthProfile.gender,
      activityLevel: healthProfile.activityLevel,
      primaryGoal: healthProfile.primaryGoal,
    };

    if (settings.includeWeight) {
      aiData.currentWeightKg = healthProfile.currentWeightKg;
      aiData.targetWeightKg = healthProfile.targetWeightKg;
      aiData.heightCm = healthProfile.heightCm;
    }

    if (settings.includeActivity) {
      aiData.sleepHoursPerDay = healthProfile.sleepHoursPerDay;
      aiData.stressLevel = healthProfile.stressLevel;
      aiData.weeklyActivityGoal = healthProfile.weeklyActivityGoal;
      aiData.fitnessLevel = healthProfile.fitnessLevel;
    }

    if (settings.includeDietary) {
      aiData.dietaryPreferences = healthProfile.dietaryPreferences;
      aiData.allergies = healthProfile.allergies;
      aiData.restrictions = healthProfile.restrictions;
    }

    if (settings.includeMedical) {
      aiData.medicalConditions = healthProfile.medicalConditions;
      aiData.medications = healthProfile.medications;
    }

    return aiData;
  }
}
