import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/client';
import { ReportService } from '@/services/report.service';
import { RecommendationService } from '@/services/recommendation.service';
import { CaseProfileInput, buildCaseProfile } from '@/core/engine/case-profiler';
import { ConfidenceLevel } from '@/core/types/enums';

const reportService = new ReportService(prisma);
const recommendationService = new RecommendationService(prisma);

// POST /api/reports/user/[userId] — generate reports from latest recommendations
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

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

    // Run pipeline first
    const pipelineResult = await recommendationService.generateRecommendations(input);
    const profile = buildCaseProfile(input);

    // Generate reports
    const reports = await reportService.generateReports(profile, pipelineResult.output);

    return NextResponse.json({
      reportIds: reports.reportIds,
      userReport: reports.userReport,
      employerReport: reports.employerReport,
      orgSignal: reports.orgSignal,
    });
  } catch (error) {
    console.error('Failed to generate reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/reports/user/[userId] — list reports for a user
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const reports = await reportService.getUserReports(userId);

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Failed to get reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
