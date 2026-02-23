'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format, getISOWeek, getYear, isValid } from 'date-fns';
import {
    PlusCircle, TrendingUp, TrendingDown, Activity, Trash2,
    BookOpen, X, ChevronDown, DollarSign, Target, BarChart2, Zap, Search,
    Calendar, ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────

type Direction = 'Long' | 'Short';
type Result = 'Pending' | 'Win' | 'Loss' | 'BreakEven';

const SETUP_TAGS = ['OB', 'FVG', 'CHoCH', 'BOS', 'Liquidity', 'MSS', 'EQH', 'EQL'];

const DEFAULT_PAIRS = [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
    'DOGE/USDT', 'ADA/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT',
    'MATIC/USDT', 'TON/USDT', 'NEAR/USDT', 'ARB/USDT', 'OP/USDT',
];

interface TradeEntry {
    id: string;
    datetime: string;
    pair: string;
    direction: Direction;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    sizeUSDT: number;
    rr: string;
    tags: string[];
    notes: string;
    result: Result;
    pnl: number | null;
}

type FilterType = 'All' | Result;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcRR(entry: number, sl: number, tp: number): string {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    if (risk === 0) return '—';
    const rr = reward / risk;
    return `1:${rr.toFixed(2)}`;
}

// ─── Stats Bar ───────────────────────────────────────────────────────────────

function StatsBar({ entries }: { entries: TradeEntry[] }) {
    const closed = entries.filter(e => e.result !== 'Pending');
    const wins = entries.filter(e => e.result === 'Win');
    const totalPnL = entries.reduce((s, e) => s + (e.pnl ?? 0), 0);
    const bestTrade = wins.length > 0 ? Math.max(...wins.map(e => e.pnl ?? 0)) : 0;
    const winRate = closed.length > 0 ? ((wins.length / closed.length) * 100).toFixed(0) : '0';

    // Streak
    let streak = 0;
    let streakType: 'W' | 'L' | null = null;
    for (const e of entries) {
        if (e.result === 'Pending') continue;
        const cur: 'W' | 'L' = e.result === 'Win' ? 'W' : 'L';
        if (streakType === null) { streakType = cur; streak = 1; }
        else if (cur === streakType) { streak++; }
        else break;
    }

    const stats = [
        {
            label: 'Total Trades',
            value: entries.length,
            icon: <BookOpen className="w-4 h-4" />,
            color: 'text-zinc-300',
        },
        {
            label: 'Win Rate',
            value: `${winRate}%`,
            icon: <Target className="w-4 h-4" />,
            color: Number(winRate) >= 50 ? 'text-success' : 'text-danger',
        },
        {
            label: 'Total P&L',
            value: `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}`,
            icon: <DollarSign className="w-4 h-4" />,
            color: totalPnL >= 0 ? 'text-success' : 'text-danger',
        },
        {
            label: 'Best Trade',
            value: `+$${bestTrade.toFixed(2)}`,
            icon: <TrendingUp className="w-4 h-4" />,
            color: 'text-blue-400',
        },
        {
            label: 'Streak',
            value: streakType ? `${streak}${streakType}` : '—',
            icon: <Zap className="w-4 h-4" />,
            color: streakType === 'W' ? 'text-success' : streakType === 'L' ? 'text-danger' : 'text-zinc-500',
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {stats.map(s => (
                <div key={s.label} className="glass-panel p-4 flex flex-col gap-1">
                    <div className={`flex items-center gap-1.5 text-xs text-zinc-500`}>
                        <span className={s.color}>{s.icon}</span>
                        {s.label}
                    </div>
                    <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Pair Combobox ────────────────────────────────────────────────────────────

function PairCombobox({
    value,
    onChange,
    knownPairs,
    onAddPair,
}: {
    value: string;
    onChange: (v: string) => void;
    knownPairs: string[];
    onAddPair: (pair: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = knownPairs.filter(p =>
        p.toLowerCase().includes(query.toLowerCase())
    );

    const queryIsNew = query.trim() !== '' &&
        !knownPairs.some(p => p.toLowerCase() === query.trim().toLowerCase());

    const select = (pair: string) => {
        onChange(pair);
        setQuery('');
        setOpen(false);
    };

    const addNew = () => {
        const newPair = query.trim().toUpperCase();
        if (!newPair) return;
        onAddPair(newPair);
        select(newPair);
    };

    return (
        <div ref={ref} className="relative">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between bg-black/50 border border-white/10 rounded-md py-2 px-3 text-sm text-zinc-200 focus:outline-none focus:border-primary transition-colors hover:border-white/20"
            >
                <span className={value ? 'text-zinc-200' : 'text-zinc-600'}>
                    {value || 'Select pair'}
                </span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden">
                    {/* Search */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                        <Search className="w-3.5 h-3.5 text-zinc-500 flex-none" />
                        <input
                            autoFocus
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && queryIsNew) addNew(); if (e.key === 'Enter' && filtered.length === 1) select(filtered[0]); }}
                            placeholder="Search or type new pair…"
                            className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
                        />
                        {query && <button onClick={() => setQuery('')}><X className="w-3 h-3 text-zinc-500 hover:text-zinc-300" /></button>}
                    </div>

                    {/* Options */}
                    <div className="max-h-48 overflow-y-auto custom-scrollbar py-1">
                        {filtered.map(pair => (
                            <button
                                key={pair}
                                onClick={() => select(pair)}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors ${pair === value
                                    ? 'bg-primary/15 text-primary'
                                    : 'text-zinc-300 hover:bg-white/5'
                                    }`}
                            >
                                {pair}
                            </button>
                        ))}

                        {/* Add new pair */}
                        {queryIsNew && (
                            <button
                                onClick={addNew}
                                className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 transition-colors flex items-center gap-2"
                            >
                                <PlusCircle className="w-3.5 h-3.5" />
                                Add &ldquo;{query.trim().toUpperCase()}&rdquo;
                            </button>
                        )}

                        {filtered.length === 0 && !queryIsNew && (
                            <p className="px-3 py-3 text-xs text-zinc-600 text-center">No pairs found</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Trade Form ───────────────────────────────────────────────────────────────

const defaultForm = {
    pair: 'BTC/USDT',
    direction: 'Long' as Direction,
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    sizeUSDT: '50',
    tags: [] as string[],
    notes: '',
    result: 'Pending' as Result,
    pnl: '',
};

function TradeForm({ onSave, knownPairs, onAddPair }: {
    onSave: (entry: TradeEntry) => void;
    knownPairs: string[];
    onAddPair: (pair: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(defaultForm);

    const set = (field: string, val: string | string[]) =>
        setForm(p => ({ ...p, [field]: val }));

    const toggleTag = (tag: string) => {
        set('tags', form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag]);
    };

    const rr = useMemo(() => {
        const e = parseFloat(form.entryPrice);
        const sl = parseFloat(form.stopLoss);
        const tp = parseFloat(form.takeProfit);
        if (isNaN(e) || isNaN(sl) || isNaN(tp)) return '—';
        return calcRR(e, sl, tp);
    }, [form.entryPrice, form.stopLoss, form.takeProfit]);

    const valid = form.pair && form.entryPrice && form.stopLoss && form.takeProfit && form.sizeUSDT;

    const handleSave = () => {
        if (!valid) return;
        const entry: TradeEntry = {
            id: Date.now().toString(),
            datetime: format(new Date(), "MMM dd, yyyy HH:mm"),
            pair: form.pair,
            direction: form.direction,
            entryPrice: parseFloat(form.entryPrice),
            stopLoss: parseFloat(form.stopLoss),
            takeProfit: parseFloat(form.takeProfit),
            sizeUSDT: parseFloat(form.sizeUSDT),
            rr,
            tags: form.tags,
            notes: form.notes,
            result: form.result,
            pnl: form.pnl !== '' ? parseFloat(form.pnl) : null,
        };
        onSave(entry);
        setForm(defaultForm);
        setOpen(false);
    };

    const inputCls = "w-full bg-black/50 border border-white/10 rounded-md py-2 px-3 text-sm text-zinc-200 focus:outline-none focus:border-primary placeholder-zinc-600 transition-colors";
    const labelCls = "text-xs text-zinc-500 mb-1 block";

    return (
        <div className="glass-panel overflow-hidden">
            {/* Header toggle */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-zinc-300 hover:bg-white/5 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-primary" />
                    Log New Trade
                </span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
                    {/* Row 1: Pair / Direction / Size */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className={labelCls}>Pair</label>
                            <PairCombobox
                                value={form.pair}
                                onChange={v => set('pair', v)}
                                knownPairs={knownPairs}
                                onAddPair={onAddPair}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Direction</label>
                            <div className="flex gap-2">
                                {(['Long', 'Short'] as Direction[]).map(d => (
                                    <button
                                        key={d}
                                        onClick={() => set('direction', d)}
                                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-all border ${form.direction === d
                                            ? d === 'Long' ? 'bg-success/20 border-success/50 text-success' : 'bg-danger/20 border-danger/50 text-danger'
                                            : 'bg-black/30 border-white/10 text-zinc-500 hover:border-white/20'
                                            }`}
                                    >
                                        {d === 'Long' ? '▲ Long' : '▼ Short'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Size (USDT)</label>
                            <input type="number" value={form.sizeUSDT} onChange={e => set('sizeUSDT', e.target.value)} placeholder="50" className={inputCls} />
                        </div>
                    </div>

                    {/* Row 2: Entry / SL / TP / R:R */}
                    <div className="grid grid-cols-4 gap-3">
                        <div>
                            <label className={labelCls}>Entry Price</label>
                            <input type="number" value={form.entryPrice} onChange={e => set('entryPrice', e.target.value)} placeholder="0.00" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Stop Loss</label>
                            <input type="number" value={form.stopLoss} onChange={e => set('stopLoss', e.target.value)} placeholder="0.00" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Take Profit</label>
                            <input type="number" value={form.takeProfit} onChange={e => set('takeProfit', e.target.value)} placeholder="0.00" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>R:R (auto)</label>
                            <div className={`w-full bg-black/30 border border-white/5 rounded-md py-2 px-3 text-sm font-mono ${rr === '—' ? 'text-zinc-600' : 'text-blue-400'}`}>
                                {rr}
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Result + P&L */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Result</label>
                            <div className="relative">
                                <select value={form.result} onChange={e => set('result', e.target.value)} className={`${inputCls} appearance-none`}>
                                    <option value="Pending">Pending</option>
                                    <option value="Win">Win</option>
                                    <option value="Loss">Loss</option>
                                    <option value="BreakEven">Break Even</option>
                                </select>
                                <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Realized P&L ($)</label>
                            <input type="number" value={form.pnl} onChange={e => set('pnl', e.target.value)} placeholder="e.g. 5.20 or -2.10" className={inputCls} />
                        </div>
                    </div>

                    {/* Setup Tags */}
                    <div>
                        <label className={labelCls}>Setup Tags</label>
                        <div className="flex flex-wrap gap-2">
                            {SETUP_TAGS.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${form.tags.includes(tag)
                                        ? 'bg-primary/20 border-primary/50 text-primary'
                                        : 'bg-black/30 border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-400'
                                        }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className={labelCls}>Notes & Reasoning</label>
                        <textarea
                            value={form.notes}
                            onChange={e => set('notes', e.target.value)}
                            placeholder="Describe setup reasoning, market context, mistakes..."
                            rows={3}
                            className={`${inputCls} resize-none`}
                        />
                    </div>

                    {/* Save */}
                    <button
                        onClick={handleSave}
                        disabled={!valid}
                        className={`w-full py-2.5 rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-all ${valid
                            ? 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20 cursor-pointer'
                            : 'bg-white/5 text-zinc-600 cursor-not-allowed'
                            }`}
                    >
                        <PlusCircle className="w-4 h-4" />
                        Add to Journal
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Result Badge ─────────────────────────────────────────────────────────────

function ResultBadge({ result }: { result: Result }) {
    const map: Record<Result, string> = {
        Win: 'bg-success/15 text-success border-success/30',
        Loss: 'bg-danger/15 text-danger border-danger/30',
        BreakEven: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/30',
        Pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    };
    const label: Record<Result, string> = {
        Win: 'WIN', Loss: 'LOSS', BreakEven: 'BE', Pending: 'PENDING',
    };
    return (
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${map[result]}`}>
            {label[result]}
        </span>
    );
}

// ─── Trade Row ─────────────────────────────────────────────────────────────────

function TradeRow({ entry, onDelete, onUpdate }: {
    entry: TradeEntry;
    onDelete: (id: string) => void;
    onUpdate: (id: string, result: Result, pnl: number | null) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [editResult, setEditResult] = useState<Result>(entry.result);
    const [editPnl, setEditPnl] = useState(entry.pnl !== null ? String(entry.pnl) : '');

    const rowColor: Record<Result, string> = {
        Win: 'border-l-success/50',
        Loss: 'border-l-danger/50',
        BreakEven: 'border-l-zinc-500/50',
        Pending: 'border-l-yellow-500/30',
    };

    return (
        <div className={`glass-panel px-4 py-3.5 flex flex-col gap-3 border-l-2 ${rowColor[entry.result]}`}>
            <div className="flex items-start justify-between gap-4">
                {/* Left info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`flex-none p-1.5 rounded-md ${entry.direction === 'Long' ? 'bg-success/15' : 'bg-danger/15'}`}>
                        {entry.direction === 'Long'
                            ? <TrendingUp className="w-4 h-4 text-success" />
                            : <TrendingDown className="w-4 h-4 text-danger" />
                        }
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-zinc-200">{entry.pair}</span>
                            <span className={`text-xs font-semibold ${entry.direction === 'Long' ? 'text-success' : 'text-danger'}`}>
                                {entry.direction.toUpperCase()}
                            </span>
                            <ResultBadge result={entry.result} />
                            {entry.tags.map(t => (
                                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{t}</span>
                            ))}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">{entry.datetime}</p>
                    </div>
                </div>

                {/* Right stats */}
                <div className="flex-none flex items-center gap-4 text-right">
                    <div className="hidden sm:flex flex-col text-xs">
                        <span className="text-zinc-500">R:R</span>
                        <span className="text-blue-400 font-mono font-bold">{entry.rr}</span>
                    </div>
                    <div className="flex flex-col text-xs">
                        <span className="text-zinc-500">Size</span>
                        <span className="text-zinc-300 font-mono">${entry.sizeUSDT}</span>
                    </div>
                    <div className="flex flex-col text-xs">
                        <span className="text-zinc-500">P&L</span>
                        <span className={`font-mono font-bold ${entry.pnl !== null ? (entry.pnl >= 0 ? 'text-success' : 'text-danger') : 'text-zinc-500'}`}>
                            {entry.pnl !== null ? `${entry.pnl >= 0 ? '+' : ''}$${entry.pnl.toFixed(2)}` : '—'}
                        </span>
                    </div>
                    <div className="flex gap-1.5">
                        <button
                            onClick={() => setEditing(e => !e)}
                            className="p-1.5 rounded-md text-zinc-500 hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Edit result"
                        >
                            <Activity className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => onDelete(entry.id)}
                            className="p-1.5 rounded-md text-zinc-500 hover:text-danger hover:bg-danger/10 transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Price levels */}
            <div className="flex gap-4 text-xs text-zinc-600">
                <span>Entry: <span className="text-zinc-400 font-mono">{entry.entryPrice}</span></span>
                <span>SL: <span className="text-danger/80 font-mono">{entry.stopLoss}</span></span>
                <span>TP: <span className="text-success/80 font-mono">{entry.takeProfit}</span></span>
            </div>

            {/* Notes */}
            {entry.notes && (
                <p className="text-xs text-zinc-500 bg-black/20 rounded-md px-3 py-2 border border-white/5 italic">
                    {entry.notes}
                </p>
            )}

            {/* Inline edit panel */}
            {editing && (
                <div className="bg-black/40 border border-white/10 rounded-lg px-3 py-3 flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1 min-w-[120px]">
                        <label className="text-xs text-zinc-500">Update Result</label>
                        <div className="relative">
                            <select
                                value={editResult}
                                onChange={e => setEditResult(e.target.value as Result)}
                                className="w-full bg-black/60 border border-white/10 rounded-md py-1.5 px-2 text-xs text-zinc-200 appearance-none focus:outline-none focus:border-primary"
                            >
                                <option value="Pending">Pending</option>
                                <option value="Win">Win</option>
                                <option value="Loss">Loss</option>
                                <option value="BreakEven">Break Even</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-2 w-3 h-3 text-zinc-500 pointer-events-none" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 min-w-[120px]">
                        <label className="text-xs text-zinc-500">Realized P&L ($)</label>
                        <input
                            type="number"
                            value={editPnl}
                            onChange={e => setEditPnl(e.target.value)}
                            placeholder="e.g. 5.00"
                            className="w-full bg-black/60 border border-white/10 rounded-md py-1.5 px-2 text-xs text-zinc-200 focus:outline-none focus:border-primary"
                        />
                    </div>
                    <button
                        onClick={() => {
                            onUpdate(entry.id, editResult, editPnl !== '' ? parseFloat(editPnl) : null);
                            setEditing(false);
                        }}
                        className="py-1.5 px-4 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-md transition-colors"
                    >
                        Save
                    </button>
                    <button
                        onClick={() => setEditing(false)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Grouping Helpers ────────────────────────────────────────────────────────────

type TimePeriod = 'all' | 'daily' | 'weekly' | 'monthly';

// Parse the stored datetime string (e.g. "Feb 22, 2026 15:50") to a Date
function parseEntryDate(datetime: string): Date {
    // Try native parse first
    const d = new Date(datetime);
    if (isValid(d)) return d;
    // Fallback: return now so it still groups somewhere
    return new Date();
}

function getGroupKey(datetime: string, period: TimePeriod): string {
    if (period === 'all') return 'all';
    const d = parseEntryDate(datetime);
    if (period === 'daily') return format(d, 'yyyy-MM-dd');
    if (period === 'weekly') return `${getYear(d)}-W${String(getISOWeek(d)).padStart(2, '0')}`;
    return format(d, 'yyyy-MM'); // monthly
}

function formatGroupLabel(key: string, period: TimePeriod): string {
    if (period === 'all') return 'All Time';
    if (period === 'daily') {
        const d = new Date(key + 'T00:00:00');
        const today = new Date();
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        if (format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) return 'Today';
        if (format(d, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) return 'Yesterday';
        return format(d, 'EEEE, MMM d yyyy');
    }
    if (period === 'weekly') {
        const [year, week] = key.split('-W');
        return `Week ${week}, ${year}`;
    }
    // monthly
    const d = new Date(key + '-01T00:00:00');
    return format(d, 'MMMM yyyy');
}

interface TradeGroup {
    key: string;
    label: string;
    entries: TradeEntry[];
}

function buildGroups(entries: TradeEntry[], period: TimePeriod): TradeGroup[] {
    const map = new Map<string, TradeEntry[]>();
    for (const e of entries) {
        const key = getGroupKey(e.datetime, period);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(e);
    }
    return Array.from(map.entries()).map(([key, es]) => ({
        key,
        label: formatGroupLabel(key, period),
        entries: es,
    }));
}

// ─── Group Header ─────────────────────────────────────────────────────────────

function GroupHeader({
    label,
    entries,
    collapsed,
    onToggle,
}: {
    label: string;
    entries: TradeEntry[];
    collapsed: boolean;
    onToggle: () => void;
}) {
    const closed = entries.filter(e => e.result !== 'Pending');
    const wins = entries.filter(e => e.result === 'Win');
    const pnl = entries.reduce((s, e) => s + (e.pnl ?? 0), 0);
    const winRate = closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : null;

    return (
        <button
            onClick={onToggle}
            className="w-full flex items-center gap-3 px-1 py-2 group"
        >
            <ChevronRight
                className={`w-3.5 h-3.5 text-zinc-500 flex-none transition-transform duration-150 ${collapsed ? '' : 'rotate-90'
                    }`}
            />
            <Calendar className="w-3.5 h-3.5 text-zinc-500 flex-none" />
            <span className="text-sm font-semibold text-zinc-300 group-hover:text-zinc-200 transition-colors">
                {label}
            </span>
            <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-zinc-600">{entries.length} trade{entries.length !== 1 ? 's' : ''}</span>
                {winRate !== null && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${winRate >= 50
                        ? 'bg-success/10 text-success border-success/20'
                        : 'bg-danger/10 text-danger border-danger/20'
                        }`}>
                        {winRate}% WR
                    </span>
                )}
                <span className={`text-xs font-mono font-bold ${pnl > 0 ? 'text-success' : pnl < 0 ? 'text-danger' : 'text-zinc-500'
                    }`}>
                    {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                </span>
            </div>
        </button>
    );
}

// ─── Main Journal ─────────────────────────────────────────────────────────────

const RESULT_FILTERS: FilterType[] = ['All', 'Pending', 'Win', 'Loss', 'BreakEven'];
const FILTER_LABELS: Record<FilterType, string> = {
    All: 'All', Pending: 'Pending', Win: 'Win', Loss: 'Loss', BreakEven: 'Break Even',
};
const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
    { value: 'all', label: 'All Time' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
];

const PAIRS_KEY = 'smc_pairs_v1';

export default function TradingJournal() {
    const [entries, setEntries] = useState<TradeEntry[]>([]);
    const [resultFilter, setResultFilter] = useState<FilterType>('All');
    const [timePeriod, setTimePeriod] = useState<TimePeriod>('daily');
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [customPairs, setCustomPairs] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('journal')
                .select('*')
                .eq('user_id', user.id)
                .order('datetime', { ascending: false });

            if (data && !error) {
                const mapped: TradeEntry[] = data.map(item => ({
                    id: item.id,
                    datetime: item.datetime,
                    pair: item.pair,
                    direction: item.direction as Direction,
                    entryPrice: Number(item.entry_price),
                    stopLoss: Number(item.stop_loss),
                    takeProfit: Number(item.take_profit),
                    sizeUSDT: Number(item.size_usdt),
                    rr: item.rr,
                    tags: item.tags || [],
                    notes: item.notes || '',
                    result: item.result as Result,
                    pnl: item.pnl !== null ? Number(item.pnl) : null,
                }));
                setEntries(mapped);
            }

            const savedPairs = localStorage.getItem(PAIRS_KEY);
            if (savedPairs) setCustomPairs(JSON.parse(savedPairs));
        };

        fetchData();
    }, []);

    const addEntry = async (entry: TradeEntry) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('journal').insert({
            user_id: user.id,
            pair: entry.pair,
            direction: entry.direction,
            entry_price: entry.entryPrice,
            stop_loss: entry.stopLoss,
            take_profit: entry.takeProfit,
            size_usdt: entry.sizeUSDT,
            rr: entry.rr,
            tags: entry.tags,
            notes: entry.notes,
            result: entry.result,
            pnl: entry.pnl,
            datetime: entry.datetime,
        });

        if (!error) {
            // Re-fetch to get the assigned UUID
            const { data } = await supabase
                .from('journal')
                .select('*')
                .eq('user_id', user.id)
                .order('datetime', { ascending: false });

            if (data) {
                const mapped: TradeEntry[] = data.map(item => ({
                    id: item.id,
                    datetime: item.datetime,
                    pair: item.pair,
                    direction: item.direction as Direction,
                    entryPrice: Number(item.entry_price),
                    stopLoss: Number(item.stop_loss),
                    takeProfit: Number(item.take_profit),
                    sizeUSDT: Number(item.size_usdt),
                    rr: item.rr,
                    tags: item.tags || [],
                    notes: item.notes || '',
                    result: item.result as Result,
                    pnl: item.pnl !== null ? Number(item.pnl) : null,
                }));
                setEntries(mapped);
            }
        }
    };

    const deleteEntry = async (id: string) => {
        const { error } = await supabase.from('journal').delete().eq('id', id);
        if (!error) {
            setEntries(entries.filter(e => e.id !== id));
        }
    };

    const updateEntry = async (id: string, result: Result, pnl: number | null) => {
        const { error } = await supabase
            .from('journal')
            .update({ result, pnl })
            .eq('id', id);

        if (!error) {
            setEntries(entries.map(e => e.id === id ? { ...e, result, pnl } : e));
        }
    };

    const handleAddPair = (pair: string) => {
        if (customPairs.includes(pair) || DEFAULT_PAIRS.includes(pair)) return;
        const updated = [...customPairs, pair];
        setCustomPairs(updated);
        localStorage.setItem(PAIRS_KEY, JSON.stringify(updated));
    };

    const knownPairs = useMemo(() => {
        const fromEntries = entries.map(e => e.pair);
        const all = [...DEFAULT_PAIRS, ...customPairs, ...fromEntries];
        return Array.from(new Set(all));
    }, [entries, customPairs]);

    // 1. Apply result filter
    const resultFiltered = resultFilter === 'All'
        ? entries
        : entries.filter(e => e.result === resultFilter);

    // 2. Build groups from filtered entries
    const groups = useMemo(
        () => buildGroups(resultFiltered, timePeriod),
        [resultFiltered, timePeriod]
    );

    const countFor = (f: FilterType) =>
        f === 'All' ? entries.length : entries.filter(e => e.result === f).length;

    const toggleCollapse = (key: string) =>
        setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Stats */}
            <StatsBar entries={entries} />

            {/* Form */}
            <TradeForm onSave={addEntry} knownPairs={knownPairs} onAddPair={handleAddPair} />

            {/* Filter + List */}
            <div className="glass-panel flex flex-col flex-1 overflow-hidden">

                {/* ── Time Period Filter row ── */}
                <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b border-white/5 flex-wrap">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500 mr-1" />
                    {TIME_PERIODS.map(tp => (
                        <button
                            key={tp.value}
                            onClick={() => setTimePeriod(tp.value)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${timePeriod === tp.value
                                ? 'bg-primary text-white shadow shadow-primary/20'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                }`}
                        >
                            {tp.label}
                        </button>
                    ))}
                </div>

                {/* ── Result Filter row ── */}
                <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5 flex-wrap">
                    <BarChart2 className="w-3.5 h-3.5 text-zinc-500 mr-1" />
                    {RESULT_FILTERS.map(f => (
                        <button
                            key={f}
                            onClick={() => setResultFilter(f)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${resultFilter === f
                                ? 'bg-primary/15 border-primary/50 text-primary'
                                : 'bg-transparent border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/20'
                                }`}
                        >
                            {FILTER_LABELS[f]}
                            <span className="ml-1.5 opacity-60">({countFor(f)})</span>
                        </button>
                    ))}
                </div>

                {/* ── Grouped Entries ── */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                    {resultFiltered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-600 py-16">
                            <BookOpen className="w-10 h-10 opacity-30" />
                            <p className="text-sm">No trades logged yet.</p>
                            <p className="text-xs">Click <span className="text-primary">&ldquo;Log New Trade&rdquo;</span> above to add your first entry.</p>
                        </div>
                    ) : (
                        groups.map(group => (
                            <div key={group.key}>
                                {/* Group header (hidden when "all time" + only 1 group) */}
                                {timePeriod !== 'all' && (
                                    <div className="mb-2 px-1 border-b border-white/5 pb-1">
                                        <GroupHeader
                                            label={group.label}
                                            entries={group.entries}
                                            collapsed={!!collapsed[group.key]}
                                            onToggle={() => toggleCollapse(group.key)}
                                        />
                                    </div>
                                )}

                                {/* Trade rows */}
                                {!collapsed[group.key] && (
                                    <div className="space-y-2">
                                        {group.entries.map(entry => (
                                            <TradeRow
                                                key={entry.id}
                                                entry={entry}
                                                onDelete={deleteEntry}
                                                onUpdate={updateEntry}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
