'use client';

import { useState } from 'react';
import TradingChart from '@/components/dashboard/TradingChart';
import SMCChecklist from '@/components/dashboard/SMCChecklist';
import MarketWidgets from '@/components/dashboard/MarketWidgets';
import TradingJournal from '@/components/dashboard/TradingJournal';
import QuickTradeForm from '@/components/dashboard/QuickTradeForm';
import { LayoutDashboard, BookOpen } from 'lucide-react';

type Tab = 'dashboard' | 'journal';

export default function Home() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="flex flex-col min-h-screen p-4 gap-4 max-w-[1920px] mx-auto">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 glass-panel">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
            SMC Trading Terminal
          </h1>
          <p className="text-sm text-zinc-400">Daily Target: $5 | BTC/USDT Focus</p>
        </div>

        {/* Tab Nav */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 bg-black/40 border border-white/5 rounded-lg p-1">
            <button
              onClick={() => setTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === 'dashboard'
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setTab('journal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === 'journal'
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              <BookOpen className="w-4 h-4" />
              Journal
            </button>
          </nav>

          <div className="flex items-center gap-2 text-sm font-medium pl-2">
            <span className="w-2 h-2 rounded-full bg-success opacity-80 animate-pulse"></span>
            <span className="text-zinc-300">Live</span>
          </div>
        </div>
      </header>

      {/* ── Dashboard Tab ── (always mounted, hidden via CSS to preserve TradingView chart state) */}
      <main className={`flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-100px)] ${tab !== 'dashboard' ? 'hidden' : ''}`}>

        {/* Left Zone: TradingView Chart */}
        <section className="lg:col-span-8 glass-panel overflow-hidden flex flex-col">
          <div className="p-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
              Advanced Chart
            </h2>
          </div>
          <div className="flex-1 w-full bg-board min-h-0">
            <TradingChart />
          </div>
          <QuickTradeForm />
        </section>

        {/* Right Zone: SOP + Market Widgets */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex-none h-[50%] glass-panel flex flex-col overflow-hidden">
            <div className="p-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                Execution SOP & Journal
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <SMCChecklist />
            </div>
          </div>

          <div className="flex-none h-[calc(50%-16px)] glass-panel flex flex-col overflow-hidden">
            <div className="p-3 border-b border-white/5 bg-white/5">
              <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                Market Drivers
              </h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <MarketWidgets />
            </div>
          </div>
        </section>
      </main>

      {/* ── Journal Tab ── (always mounted, hidden via CSS) */}
      <main className={`flex-1 overflow-y-auto custom-scrollbar ${tab !== 'journal' ? 'hidden' : ''}`}>
        <TradingJournal />
      </main>
    </div>
  );
}
