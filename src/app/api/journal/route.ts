import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { date, workActivities, lifeActivities, force } = await request.json();

    // Basic validation
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // Check if entry exists and force flag is not set
    if (!force) {
      const existingEntry = await prisma.journalEntry.findUnique({
        where: { date: new Date(date) }
      });

      if (existingEntry) {
        return NextResponse.json({ exists: true, error: 'Entry already exists for this date' }, { status: 409 });
      }
    }

    const activitiesData = [
      ...workActivities.map((activity: any) => ({
        description: activity.description.trim(),
        duration: parseInt(activity.duration, 10) || null,
        notes: activity.notes || '',
        category: 'WORK',
        tags: activity.tags ? {
          connectOrCreate: activity.tags.split(',')
            .filter((tag: string) => tag.trim())
            .map((tag: string) => ({
              where: { name: tag.trim() },
              create: { name: tag.trim() },
            })),
        } : undefined,
      })),
      ...lifeActivities.map((activity: any) => ({
        description: activity.description.trim(),
        duration: parseInt(activity.duration, 10) || null,
        notes: activity.notes || '',
        category: 'LIFE',
        tags: activity.tags ? {
          connectOrCreate: activity.tags.split(',')
            .filter((tag: string) => tag.trim())
            .map((tag: string) => ({
              where: { name: tag.trim() },
              create: { name: tag.trim() },
            })),
        } : undefined,
      })),
    ];

    const journalEntry = await prisma.journalEntry.upsert({
      where: { date: new Date(date) },
      update: {
        activities: {
          deleteMany: {},
          create: activitiesData,
        },
      },
      create: {
        date: new Date(date),
        activities: {
          create: activitiesData,
        },
      },
    });
    return NextResponse.json(journalEntry, { status: 201 });
  } catch (error) {
    console.error('Error creating journal entry:', error);
    return NextResponse.json({ error: 'Error creating journal entry' }, { status: 500 });
  }
}

// Add a GET endpoint to retrieve journal entries
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (date) {
      const entry = await prisma.journalEntry.findUnique({
        where: { date: new Date(date) },
        include: {
          activities: {
            include: {
              tags: true
            }
          }
        },
      });

      if (!entry) {
        return NextResponse.json(null);
      }

      return NextResponse.json(entry);
    }

    // Get all entries if no date specified
    const entries = await prisma.journalEntry.findMany({
      orderBy: { date: 'desc' },
      include: {
        activities: {
          include: {
            tags: true
          }
        }
      },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    return NextResponse.json({ error: 'Error fetching journal entries' }, { status: 500 });
  }
}
