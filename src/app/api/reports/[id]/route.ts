// src/app/api/reports/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }
    
    // Do not return report if it's still pending
    if (report.status === 'PENDING') {
      return NextResponse.json({ error: 'Report generation is still in progress.' }, { status: 202 }); // 202 Accepted
    }

    return NextResponse.json(report);

  } catch (error) {
    console.error('Error fetching report by ID:', error);
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
  }
}