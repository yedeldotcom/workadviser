import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/client';
import { ConsentManager } from '@/core/consent/manager';

const consentManager = new ConsentManager(prisma);

// GET /api/consent/[userId] — get current consent state
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, consentState: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ userId: user.id, consentState: user.consentState });
  } catch (error) {
    console.error('Failed to get consent state:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/consent/[userId] — grant consent
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const user = await consentManager.grantConsent(userId);

    return NextResponse.json({ userId: user.id, consentState: user.consentState });
  } catch (error) {
    console.error('Failed to grant consent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/consent/[userId] — withdraw consent
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const user = await consentManager.withdrawConsent(userId);

    return NextResponse.json({ userId: user.id, consentState: user.consentState });
  } catch (error) {
    console.error('Failed to withdraw consent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
