import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

// DELETE endpoint to delete a journal entry by ID
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Journal entry ID is required' }, { status: 400 });
    }

    // Check if the journal entry exists
    const existingEntry = await prisma.journalEntry.findUnique({
      where: { id },
      include: { activities: true }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    // Delete all associated activities first (due to foreign key constraints)
    await prisma.activity.deleteMany({
      where: { journalEntryId: id }
    });

    // Delete the journal entry
    await prisma.journalEntry.delete({
      where: { id }
    });

    return NextResponse.json({ 
      message: 'Journal entry deleted successfully',
      deletedEntry: {
        id: existingEntry.id,
        date: existingEntry.date,
        activitiesCount: existingEntry.activities.length
      }
    });

  } catch (error) {
    console.error('Error deleting journal entry:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// GET endpoint to retrieve a single journal entry by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Journal entry ID is required' }, { status: 400 });
    }

    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        activities: {
          include: {
            tags: true,
            category: true,
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error('Error fetching journal entry:', error);
    return NextResponse.json({ error: 'Failed to fetch journal entry' }, { status: 500 });
  }
}