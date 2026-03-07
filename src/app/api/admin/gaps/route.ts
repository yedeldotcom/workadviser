import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/client';
import { GapTracker } from '@/core/knowledge/gap-tracker';

const gapTracker = new GapTracker(prisma);

const DEFAULT_BARRIERS = [
  'uncertainty', 'overload', 'communication', 'sensory_environment',
  'schedule', 'concentration', 'trust', 'autonomy', 'social', 'performance_pressure',
];

// GET /api/admin/gaps — analyze knowledge base coverage gaps
export async function GET(request: NextRequest) {
  try {
    const barriers = request.nextUrl.searchParams.get('barriers');
    const barrierList = barriers
      ? barriers.split(',').map((b) => b.trim())
      : DEFAULT_BARRIERS;

    const summary = await gapTracker.analyzeCoverage(barrierList);

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Failed to analyze gaps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
