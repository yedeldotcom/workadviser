import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/db/client';
import { LeadService } from '@/services/lead.service';

const leadService = new LeadService(prisma);

// GET /api/admin/leads — list exportable leads
export async function GET() {
  try {
    const leads = await leadService.getExportableLeads();

    return NextResponse.json({
      count: leads.length,
      leads,
    });
  } catch (error) {
    console.error('Failed to get leads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/leads — export a lead
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { leadId?: string };
    const { leadId } = body;

    if (!leadId || typeof leadId !== 'string') {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const result = await leadService.exportLead(leadId);

    return NextResponse.json({
      id: result.id,
      handoffState: result.handoffState,
      exportedAt: result.exportedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
