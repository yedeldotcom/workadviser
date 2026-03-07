import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/client';
import { RecommendationService } from '@/services/recommendation.service';
import { CaseProfileInput } from '@/core/engine/case-profiler';
import { ConfidenceLevel } from '@/core/types/enums';

const recommendationService = new RecommendationService(prisma);

// POST /api/recommendations/[userId] — run recommendation pipeline
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();

    // Build case profile input from request body + database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        barriers: { orderBy: { createdAt: 'desc' } },
        triggers: { orderBy: { createdAt: 'desc' } },
        workplaceAmplifiers: { orderBy: { createdAt: 'desc' } },
        changeEvents: { orderBy: { detectedAt: 'desc' } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const input: CaseProfileInput = {
      userId,
      employmentStage: user.profile?.employmentStage as CaseProfileInput['employmentStage'],
      workplaceType: user.profile?.workplaceType as CaseProfileInput['workplaceType'],
      jobTitle: user.profile?.jobTitle ?? undefined,
      disclosureLevel: user.profile?.disclosureLevel as CaseProfileInput['disclosureLevel'],
      barriers: user.barriers.map((b) => ({
        category: b.category,
        severity: b.severity ?? undefined,
        confidence: b.confidence as ConfidenceLevel,
      })),
      triggers: user.triggers.map((t) => ({
        category: t.category,
        contextDescription: t.contextDescription ?? undefined,
        confidence: t.confidence as ConfidenceLevel,
      })),
      amplifiers: user.workplaceAmplifiers.map((a) => ({
        category: a.category,
        description: a.description ?? undefined,
        confidence: a.confidence as ConfidenceLevel,
      })),
      changeEvents: user.changeEvents.map((e) => ({
        eventType: e.eventType,
        description: e.description ?? undefined,
        revalidationLevel: e.revalidationLevel,
      })),
    };

    const result = await recommendationService.generateRecommendations(input);

    return NextResponse.json({
      candidateCount: result.candidateCount,
      eligibleCount: result.eligibleCount,
      confidence: result.confidence,
      userRecommendations: result.output.userRecommendations,
      employerRecommendations: result.output.employerRecommendations,
      orgRecommendations: result.output.orgRecommendations,
      traceLog: result.traceLog,
    });
  } catch (error) {
    console.error('Failed to run recommendation pipeline:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/recommendations/[userId] — list rendered recommendations
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const recs = await recommendationService.getRecommendationsForUser(userId);

    return NextResponse.json({ recommendations: recs });
  } catch (error) {
    console.error('Failed to get recommendations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
