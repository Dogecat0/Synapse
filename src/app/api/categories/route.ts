import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import * as z from 'zod';

const prisma = new PrismaClient();

// Validation schema for creating/updating categories
const CategorySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().optional(),
});

// GET all categories
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { activities: true }
        }
      },
      orderBy: [
        { isDefault: 'desc' }, // Default categories first
        { name: 'asc' }
      ]
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

// POST create new category
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = CategorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const { name, description, color, icon } = validation.data;

    // Check if category with this name already exists
    const existingCategory = await prisma.category.findUnique({
      where: { name }
    });

    if (existingCategory) {
      return NextResponse.json({ 
        error: 'Category with this name already exists' 
      }, { status: 409 });
    }

    const category = await prisma.category.create({
      data: {
        name,
        description,
        color: color || '#6B7280',
        icon,
        isDefault: false,
      },
      include: {
        _count: {
          select: { activities: true }
        }
      }
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}