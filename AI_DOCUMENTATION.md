# AI Integration Documentation

## Overview

The AI layer provides personalized health and wellness insights using OpenAI's GPT-3.5-turbo model. It includes:

1. **Context building** from normalized health data
2. **PII removal** (anonymization of sensitive information)
3. **Response validation** against dietary restrictions and health constraints
4. **Caching** with fallback mechanism
5. **Hallucination detection** and safety checks

## Architecture

### Components

- **AIService** (`ai.service.ts`): Core AI logic
- **AIController** (`ai.controller.ts`): API endpoints
- **AIModule** (`ai.module.ts`): NestJS module
- **AIInsight** model (Prisma schema): Database storage

### Flow

```
User Request → AIController → AIService
                                  ↓
                          Check Cache (contextHash)
                                  ↓
                    Cache Hit? → Return cached insight
                                  ↓
                            Cache Miss
                                  ↓
                    Build Context (with PII removal)
                                  ↓
                    Generate Prompt
                                  ↓
                    Call OpenAI API
                                  ↓
                    Validate Response
                                  ↓
                    Calculate Priority
                                  ↓
                    Store in Database
                                  ↓
                    Return to User
```

## Features

### 1. Context Building & PII Removal

The system builds a comprehensive health context from:
- Demographics (age, gender)
- Physical metrics (height, weight, BMI)
- Lifestyle (activity level, sleep, stress)
- Dietary preferences, allergies, restrictions
- Goals and fitness assessment
- Progress metrics
- Recent activity (last 7 days)
- Weight trend (last 30 days)

**PII Removal:**
- User ID is hashed (anonymized)
- Email, name, and other identifiable information are never sent to AI
- Medical conditions only included if explicitly allowed by privacy settings

**Privacy Settings Respected:**
- `includeWeight`: Include weight data
- `includeActivity`: Include activity logs
- `includeDietary`: Include dietary information
- `includeMedical`: Include medical conditions (default: false)

### 2. Prompt Construction

The prompt is built in a structured format:
```
Demographics:
- Age: XX
- Gender: XXX

Physical Metrics:
- Height: XXX cm
- Current Weight: XX kg
- Target Weight: XX kg
- BMI: XX (class)

Lifestyle:
- Activity Level: XXX
- Sleep: X hours/day
- Stress Level: XXX

... (and so on)
```

Maximum context length: **3000 characters** (truncated if longer)

### 3. System Prompt (Safety Rules)

The AI is instructed with critical safety rules:
- **NEVER** recommend anything contradicting allergies or restrictions
- **NEVER** suggest unsafe weight loss (>1 kg/week without supervision)
- **NEVER** provide medical diagnosis or treatment
- **ALWAYS** emphasize consulting healthcare providers
- **ALWAYS** respect stated goals and preferences

Response length: **200-300 words**, concise and actionable

### 4. Response Validation

Each AI response is validated against:

#### Dietary Restrictions Check
- Scans response for any restricted items
- Flags if restricted food is mentioned
- Sets `violatesRestrictions = true`

#### Allergy Check
- Scans response for allergens
- Flags if allergen is mentioned
- Sets `violatesRestrictions = true`

#### Goal Alignment
- Checks if response addresses user's primary goal
- Uses goal-specific keywords for validation

#### Unsafe Recommendations
- Detects unsafe weight loss rates (>1 kg/week)
- Flags as restriction violation

#### Hallucination Detection
- Patterns checked:
  - "lose weight overnight"
  - "miracle" solutions
  - "instant results"
  - "100% guaranteed"
- Flags response as potentially invalid

**Validation Result:**
```typescript
{
  isValid: boolean,
  violatesRestrictions: boolean,
  notes?: string // Details of validation issues
}
```

### 5. Priority Calculation

Priority is calculated based on:

| Factor | Score | Priority Level |
|--------|-------|----------------|
| BMI in unhealthy range (underweight, obese) | +3 | High (≥4) |
| Medical conditions present | +2 | Medium (2-3) |
| Target date < 30 days | +2 | Low (<2) |
| Wellness score < 50 | +2 | |
| Progress > 80% | -1 | |

### 6. Caching & Fallback

**Cache Strategy:**
- **Context Hash**: SHA-256 hash of normalized context
- **Cache Duration**: 24 hours
- **Lookup**: By userId + contextHash
- **Invalidation**: Manual or automatic on expiry

**Fallback Mechanism:**
If AI API fails:
1. Log error
2. Return last valid insight (most recent)
3. Mark as `fromCache: true`

This ensures users always get recommendations even when OpenAI is unavailable.

### 7. API Endpoints

#### GET `/ai/insight`
Get AI insight for current user.

**Response:**
```json
{
  "success": true,
  "insight": {
    "id": "uuid",
    "response": "Your personalized recommendations...",
    "priority": "high|medium|low",
    "fromCache": true|false,
    "createdAt": "2026-02-05T...",
    "validation": {
      "isValid": true,
      "violatesRestrictions": false,
      "notes": null
    }
  }
}
```

#### GET `/ai/insights?limit=10`
Get insight history for current user.

**Response:**
```json
{
  "success": true,
  "insights": [
    {
      "id": "uuid",
      "response": "...",
      "priority": "high",
      "isValid": true,
      "violatesRestrictions": false,
      "validationNotes": null,
      "model": "gpt-3.5-turbo",
      "createdAt": "2026-02-05T..."
    }
  ]
}
```

#### POST `/ai/invalidate-cache`
Force cache invalidation and regeneration.

**Response:**
```json
{
  "success": true,
  "message": "Cache invalidated. Next insight request will generate a fresh recommendation."
}
```

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional (defaults provided)
AI_MODEL=gpt-3.5-turbo
AI_CACHE_HOURS=24
AI_MAX_CONTEXT_LENGTH=3000
```

### Model Choice: GPT-3.5-turbo

**Rationale:**
- **Latency**: <2s response time (vs GPT-4: 5-10s)
- **Cost**: ~10x cheaper than GPT-4
- **Quality**: Sufficient for structured health recommendations
- **Context**: 4096 tokens (adequate for our use case)

For this use case, the tradeoff favors GPT-3.5-turbo because:
1. Health recommendations don't require cutting-edge reasoning
2. Low latency is critical for user experience
3. Cost efficiency enables scaling
4. Safety is enforced through validation, not just model capability

## Database Schema

```prisma
model AIInsight {
  id                    String   @id @default(uuid())
  userId                String
  prompt                String   @db.Text
  response              String   @db.Text
  contextHash           String
  priority              String
  isValid               Boolean  @default(true)
  violatesRestrictions  Boolean  @default(false)
  validationNotes       String?  @db.Text
  model                 String
  tokensUsed            Int?
  responseTimeMs        Int?
  createdAt             DateTime @default(now())
  expiresAt             DateTime?
  
  @@index([userId, contextHash])
  @@index([userId, createdAt])
  @@map("ai_insights")
}
```

## Security & Privacy

### PII Removal
- User ID → SHA-256 hash (first 16 chars)
- No email, name, or direct identifiers
- Medical data only with explicit consent

### Validation Layers
1. **Pre-validation**: Privacy settings check
2. **Post-validation**: Response scanning
3. **Storage**: All insights logged with validation status

### Data Retention
- Insights expire after 24 hours (configurable)
- Old insights kept for history but not used for cache
- User can export all insights (GDPR compliance)

## Error Handling

### AI API Failures
- Fallback to last valid insight
- Log error details
- Return graceful error message

### Validation Failures
- Store insight with `isValid: false`
- Include validation notes
- Don't show to user (or show with warning)

### Missing Profile Data
- Return error: "Please complete your health profile"
- Don't attempt API call

## Testing

### Test Scenarios

1. **Context Building**
   - Test with complete profile
   - Test with minimal profile
   - Test with privacy restrictions

2. **Validation**
   - Response mentions allergy → violation
   - Response mentions restriction → violation
   - Response recommends unsafe weight loss → violation
   - Response doesn't address goal → invalid

3. **Caching**
   - Same context → cache hit
   - Changed profile → cache miss
   - Expired cache → regenerate

4. **Fallback**
   - Simulate API failure → return last insight
   - No previous insight → return null

5. **Priority**
   - Unhealthy BMI → high priority
   - Medical conditions → high priority
   - On track progress → low priority

## Future Enhancements

1. **Few-shot Learning**: Include example responses for better consistency
2. **User Feedback**: Allow rating insights to improve prompts
3. **Goal-specific Prompts**: Customize prompt based on goal type
4. **Multi-language Support**: Detect user language preference
5. **Streaming Responses**: Use OpenAI streaming for faster perceived response time
6. **A/B Testing**: Test different prompt structures and models

## Troubleshooting

### "OPENAI_API_KEY not configured"
- Add `OPENAI_API_KEY=sk-...` to `.env` file

### "Health profile not found"
- User must complete health profile first

### "No response generated"
- Check OpenAI API status
- Verify API key is valid
- Check quota limits

### Slow Response Times
- Consider upgrading to GPT-4-turbo (faster variant)
- Reduce context length
- Implement request queuing
