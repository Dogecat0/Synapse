// src/app/api/reports/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateWeeklyReport } from '../../../lib/reportAgent';

const prisma = new PrismaClient();

// Helper to get week boundaries (Monday to Sunday)
function getWeekBoundaries(date: Date): { startDate: Date; endDate: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  
  const startDate = new Date(d.setDate(diffToMonday));
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  
  return { startDate, endDate };
}


/**
 * GET /api/reports - List all completed reports
 */
export async function GET() {
  try {
    const reports = await prisma.report.findMany({
      where: { status: 'COMPLETED' },
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
      orderBy: { startDate: 'desc' },
    });
    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

/**
 * POST /api/reports - Trigger a new report generation
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, date: dateString } = body;

    if (type !== 'WEEKLY') {
        return NextResponse.json({ error: "Only 'WEEKLY' report type is supported for now." }, { status: 400 });
    }
    if (!dateString) {
        return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const { startDate, endDate } = getWeekBoundaries(new Date(dateString));
    
    // 1. Check if a completed report already exists
    const existingReport = await prisma.report.findFirst({
        where: { type: 'WEEKLY', startDate, status: 'COMPLETED' }
    });
    if (existingReport) {
        console.log(`[API] Found existing completed report for ${startDate.toISOString()}`);
        return NextResponse.json(existingReport);
    }
    
    // 2. Fetch activities for the week
    const activities = await prisma.activity.findMany({
        where: {
            journalEntry: {
                date: { gte: startDate, lte: endDate }
            }
        },
        include: {
            journalEntry: { select: { date: true } },
            tags: { select: { name: true } }
        }
    });

    if (activities.length === 0) {
        return NextResponse.json({ error: 'No activities found for this period to generate a report.' }, { status: 404 });
    }

    // 3. Create a pending report record or find an existing failed/pending one to retry
    let report = await prisma.report.upsert({
      where: { type_startDate: { type: 'WEEKLY', startDate } },
      update: { status: 'PENDING' },
      create: { type: 'WEEKLY', startDate, endDate, status: 'PENDING' }
    });
    
    // 4. Generate the report content using the agent
    const reportContent = await generateWeeklyReport(activities as any);
    
    // 5. Update the report with the result
    if (reportContent) {
        // Quick fix for category names if LLM uses 'WORK' instead of 'PROFESSIONAL'
        reportContent.keyActivities = reportContent.keyActivities.map(act => ({
            ...act,
            category: act.category === ('WORK' as any) ? 'PROFESSIONAL' : act.category,
        }));

        const updatedReport = await prisma.report.update({
            where: { id: report.id },
            data: {
                status: 'COMPLETED',
                content: reportContent as any, // Cast to 'any' for Prisma Json type
            },
        });
        return NextResponse.json(updatedReport, { status: 201 });
    } else {
        await prisma.report.update({
            where: { id: report.id },
            data: { status: 'FAILED' },
        });
        return NextResponse.json({ error: 'Failed to generate report content.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'An internal error occurred while generating the report' }, { status: 500 });
  }
};