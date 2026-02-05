import { Controller, Get, Post, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AIService } from './ai.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(private readonly aiService: AIService) {}

  /**
   * Get AI insight for the current user
   * Returns cached insight if available, otherwise generates new one
   */
  @Get('insight')
  async getInsight(@Req() req: any) {
    const userId = req.user.userId;
    const insight = await this.aiService.getInsight(userId);

    if (!insight) {
      return {
        success: false,
        message: 'Unable to generate insight. Please ensure your health profile is complete.',
      };
    }

    return {
      success: true,
      insight: {
        id: insight.id,
        response: insight.response,
        priority: insight.priority,
        fromCache: insight.fromCache,
        createdAt: insight.createdAt,
        validation: {
          isValid: insight.isValid,
          violatesRestrictions: insight.violatesRestrictions,
          notes: insight.validationNotes,
        },
      },
    };
  }

  /**
   * Get insight history for the current user
   */
  @Get('insights')
  async getInsights(
    @Req() req: any,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.userId;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    
    const insights = await this.aiService.getUserInsights(userId, limitNum);

    return {
      success: true,
      insights,
    };
  }

  /**
   * Invalidate cache and force regeneration
   */
  @Post('invalidate-cache')
  async invalidateCache(@Req() req: any) {
    const userId = req.user.userId;
    await this.aiService.invalidateCache(userId);

    return {
      success: true,
      message: 'Cache invalidated. Next insight request will generate a fresh recommendation.',
    };
  }
}
