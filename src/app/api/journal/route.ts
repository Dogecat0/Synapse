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

    // First, collect all unique tag names from all activities
    const allTagNames = new Set<string>();
    activities.forEach(activity => {
      const { tags } = activity;
      if (tags) {
        tags.split(',').map(t => t.trim()).filter(Boolean).forEach(tag => allTagNames.add(tag));
      }
    });

    // Pre-create or fetch all tags to avoid parallel creation conflicts
    const tagMap = new Map();
    await Promise.all(
      Array.from(allTagNames).map(async (name) => {
        try {
          const tag = await prisma.tag.upsert({
            where: { name },
            update: {}, // No update needed
            create: { name },
          });
          tagMap.set(name, tag);
        } catch (error) {
          // If tag already exists, try to fetch it
          try {
            const existingTag = await prisma.tag.findUnique({ where: { name } });
            if (existingTag) tagMap.set(name, existingTag);
          } catch (fetchError) {
            console.error(`Failed to handle tag "${name}":`, fetchError);
          }
        }
      })
    );

    // Create activities and connect them to the journal entry
    const createdActivities = await Promise.all(
      activities.map(async (activity) => {
        const { tags, ...activityData } = activity;
        const tagNames = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        
        // Get tag IDs that we've already created/fetched
        const tagIds = tagNames
          .filter(name => tagMap.has(name))
          .map(name => ({ id: tagMap.get(name).id }));

        return prisma.activity.create({
          data: {
            description: activity.description,
            category: activity.category as ActivityCategory,
            duration: activity.duration ? parseInt(activity.duration, 10) : null,
            notes: activityData.notes || null,
            journalEntry: {
              connect: { id: journalEntry.id },
            },
            tags: {
              // Just connect to existing tags instead of trying to create them again
              connect: tagIds,
            },
          },
          include: {
            tags: true,
          },
        });
      })
    );

    return NextResponse.json({ ...journalEntry, activities: createdActivities }, { status: 201 });
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