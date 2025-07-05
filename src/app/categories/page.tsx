'use client';

import Link from 'next/link';
import CategoryManager from '../../components/CategoryManager';

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="nav-link">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Home</span>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Categories</h1>
              <p className="text-slate-600">Manage your activity categories</p>
            </div>
          </div>
        </div>

        <div className="tech-card p-6">
          <CategoryManager showManagement={true} />
        </div>
      </div>
    </div>
  );
}