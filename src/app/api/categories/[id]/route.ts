import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import * as z from 'zod';

const prisma = new PrismaClient();

const CategoryUpdateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().optional(),
});

// GET single category
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { activities: true }
        }
      }
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 });
  }
}

// PUT update category
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validation = CategoryUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const updateData = validation.data;

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id: params.id }
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if name is being changed and if it conflicts
    if (updateData.name && updateData.name !== existingCategory.name) {
      const conflictingCategory = await prisma.category.findUnique({
        where: { name: updateData.name }
      });

      if (conflictingCategory) {
        return NextResponse.json({ 
          error: 'Category with this name already exists' 
        }, { status: 409 });
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id: params.id },
      data: updateData,
      include: {
        _count: {
          select: { activities: true }
        }
      }
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

// DELETE category
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if category exists and if it has activities
    const category = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { activities: true }
        }
      }
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Prevent deletion of default categories
    if (category.isDefault) {
      return NextResponse.json({ 
        error: 'Cannot delete default categories' 
      }, { status: 400 });
    }

    // Prevent deletion if category has activities
    if (category._count.activities > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete category with existing activities. Please reassign or delete activities first.' 
      }, { status: 400 });
    }

    await prisma.category.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}