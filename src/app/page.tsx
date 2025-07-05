// src/app/page.tsx
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="mb-6">
            <h1 className="text-5xl font-bold text-slate-900 mb-4">
              Synapse
            </h1>
            <div className="w-24 h-1 bg-blue-600 mx-auto rounded-full"></div>
          </div>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Track, analyze, and synthesize your daily activities with precision.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* New Entry Card */}
          <Link href="/journal/new" className="group">
            <div className="tech-card p-8 h-full hover:border-blue-300 group-hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">New Entry</h3>
                    <p className="text-slate-600">Log your daily work and life activities.</p>
                  </div>
              </div>
            </div>
          </Link>

          {/* View Entries Card */}
          <Link href="/journal/view" className="group">
            <div className="tech-card p-8 h-full hover:border-emerald-300 group-hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">View Entries</h3>
                  <p className="text-slate-600">Browse your activity history timeline.</p>
                </div>
              </div>
            </div>
          </Link>

          {/* Manage Categories Card */}
          <Link href="/categories" className="group">
            <div className="tech-card p-8 h-full hover:border-indigo-300 group-hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Categories</h3>
                  <p className="text-slate-600">Manage your activity categories.</p>
                </div>
              </div>
            </div>
          </Link>

          {/* AI Search Card */}
          <Link href="/search" className="group">
            <div className="tech-card p-8 h-full hover:border-amber-300 group-hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                     <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                   </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">AI Search</h3>
                  <p className="text-slate-600">Ask questions and get summaries.</p>
                </div>
              </div>
            </div>
          </Link>

           {/* AI Reports Card */}
          <Link href="/reports" className="group">
            <div className="tech-card p-8 h-full hover:border-purple-300 group-hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">AI Reports</h3>
                  <p className="text-slate-600">Get weekly summaries and trend analysis.</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Feature Highlights remain the same */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <div className="status-work"></div>
              <div className="status-life ml-1"></div>
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">Categorized Tracking</h4>
            <p className="text-sm text-slate-600">Separate work and life activities for better organization</p>
          </div>
          <div className="text-center p-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">Smart Tagging</h4>
            <p className="text-sm text-slate-600">Tag activities for easy filtering and analysis</p>
          </div>
          <div className="text-center p-6">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-semibold text-slate-900 mb-2">Time Tracking</h4>
            <p className="text-sm text-slate-600">Record duration to understand time allocation</p>
          </div>
        </div>
      </div>
    </main>
  );
}