export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    activities: number;
  };
}

export interface Tag {
  id: string;
  name: string;
}

export interface Activity {
  id: string;
  description: string;
  duration: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  category: Category;
  categoryId: string;
  tags: Tag[];
}

export interface JournalEntry {
  id: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  activities: Activity[];
}