import { PrismaClient, ActivityCategory } from '@prisma/client';
import { NextResponse } from 'next/server';
import * as z from 'zod';

const prisma = new PrismaClient();

// Zod schema for validating a single activity in the request
const ActivitySchema = z.object({
  description: z.string().min(1),
  duration: z.string().optional(),
  notes: z.string().nullable().optional(),
  tags: z.string().optional(),
  category: z.nativeEnum(ActivityCategory),
});

// Zod schema for the entire request body
const JournalEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activities: z.array(ActivitySchema),
  force: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = JournalEntrySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input', details: validation.error.flatten() }, { status: 400 });
    }

    const { date, activities, force = false } = validation.data;
    const entryDate = new Date(date);

    let journalEntry = await prisma.journalEntry.findUnique({
      where: { date: entryDate },
      include: { activities: true },
    });

    if (journalEntry && force) {
      // Delete existing activities for this entry before creating new ones
      await prisma.activity.deleteMany({
        where: { journalEntryId: journalEntry.id },
      });
      // Update the entry itself (e.g., updatedAt)
      journalEntry = await prisma.journalEntry.update({
        where: { id: journalEntry.id },
        data: { updatedAt: new Date() },
        include: { activities: true },
      });
    } else if (journalEntry) {
      return NextResponse.json({ error: 'An entry for this date already exists. Use "force=true" to overwrite.' }, { status: 409 });
    } else {
      // Create a new journal entry if it doesn't exist
      journalEntry = await prisma.journalEntry.create({
        data: { date: entryDate },
        include: { activities: true },
      });
    }

  } catch (error) {
    console.error('Error creating journal entry:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to create journal entry', details: errorMessage }, { status: 500 });
  }
}

// GET endpoint to retrieve journal entries
export async function GET(request: Request) {
  try {
    const entries = await prisma.journalEntry.findMany({
      include: {
        activities: {
          include: {
            tags: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });
    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching journal entries:', error);
    return NextResponse.json({ error: 'Failed to fetch journal entries' }, { status: 500 });
  }
}