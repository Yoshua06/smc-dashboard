'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { PlusCircle, ChevronDown, Search, X, ChevronUp, Clipboard } from 'lucide-react';
// ─── Shared storage keys (must match TradingJournal) ─────────────────────────
const STORAGE_KEY = 'smc_journal_v2';
const PAIRS_KEY = 'smc_pairs_v1';

type Direction = 'Long' | 'Short';
type Result = 'Pending' | 'Win' | 'Loss' | 'BreakEven';

const SETUP_TAGS = ['OB', 'FVG', 'CHoCH', 'BOS', 'Liquidity', 'MSS', 'EQH', 'EQL'];

const DEFAULT_PAIRS = [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
    'DOGE/USDT', 'ADA/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT',
    'MATIC/USDT', 'TON/USDT', 'NEAR/USDT', 'ARB/USDT', 'OP/USDT',
];

function calcRR(entry: number, sl: number, tp: number): string {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    if (risk === 0) return '—';
    return `1:${(reward / risk).toFixed(2)}`;
}

// ─── Clipboard Paste Button ───────────────────────────────────────────────────
function PastePriceButton({ onPaste }: { onPaste: (val: string) => void }) {
    const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle');

    const handleClick = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const num = parseFloat(text.replace(/,/g, ''));
            if (!isNaN(num) && num > 0) {
                onPaste(String(num));
                setStatus('ok');
            } else {
                setStatus('err');
            }
        } catch {
            setStatus('err');
        }
        setTimeout(() => setStatus('idle'), 1200);
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            title="Paste price from clipboard (copy from TradingView chart)"
            className={`flex-none flex items-center justify-center w-7 h-7 rounded-md border transition-all
                ${status === 'ok'
                    ? 'bg-success/20 border-success/50 text-success'
                    : status === 'err'
                        ? 'bg-danger/20 border-danger/50 text-danger'
                        : 'bg-black/40 border-white/10 text-zinc-500 hover:text-zinc-300 hover:border-white/25'
                }`}
        >
            <Clipboard className="w-3.5 h-3.5" />
        </button>
    );
}

// ─── Pair Combobox ────────────────────────────────────────────────────────────
function PairCombobox({ value, onChange, knownPairs, onAddPair }: {
    value: string;
    onChange: (v: string) => void;
    knownPairs: string[];
    onAddPair: (pair: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = knownPairs.filter(p => p.toLowerCase().includes(query.toLowerCase()));
    const queryIsNew = query.trim() !== '' && !knownPairs.some(p => p.toLowerCase() === query.trim().toLowerCase());

    const select = (pair: string) => { onChange(pair); setQuery(''); setOpen(false); };
    const addNew = () => {
        const newPair = query.trim().toUpperCase();
        if (!newPair) return;
        onAddPair(newPair);
        select(newPair);
    };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between bg-black/50 border border-white/10 rounded-md py-2 px-3 text-sm text-zinc-200 focus:outline-none focus:border-primary transition-colors hover:border-white/20"
            >
                <span className={value ? 'text-zinc-200' : 'text-zinc-600'}>{value || 'Select pair'}</span>
                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-50 bottom-full mb-1 left-0 right-0 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                        <Search className="w-3.5 h-3.5 text-zinc-500 flex-none" />
                        <input
                            autoFocus
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && queryIsNew) addNew();
                                if (e.key === 'Enter' && filtered.length === 1) select(filtered[0]);
                            }}
                            placeholder="Search or type new pair…"
                            className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
                        />
                        {query && <button onClick={() => setQuery('')}><X className="w-3 h-3 text-zinc-500 hover:text-zinc-300" /></button>}
                    </div>
                    <div className="max-h-40 overflow-y-auto py-1">
                        {filtered.map(pair => (
                            <button
                                key={pair}
                                onClick={() => select(pair)}
                                className={`w-full text-left px-3 py-2 text-sm transition-colors ${pair === value ? 'bg-primary/15 text-primary' : 'text-zinc-300 hover:bg-white/5'}`}
                            >
                                {pair}
                            </button>
                        ))}
                        {queryIsNew && (
                            <button
                                onClick={addNew}
                                className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 transition-colors flex items-center gap-2"
                            >
                                <PlusCircle className="w-3.5 h-3.5" /> Add &ldquo;{query.trim().toUpperCase()}&rdquo;
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

// ─── Open Position Mini Card ──────────────────────────────────────────────────
// ─── Default form state ───────────────────────────────────────────────────────
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function QuickTradeForm() {
    const [form, setForm] = useState(defaultForm);
    const [logExpanded, setLogExpanded] = useState(true);
    const [customPairs, setCustomPairs] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        const savedPairs = localStorage.getItem(PAIRS_KEY);
        return savedPairs ? JSON.parse(savedPairs) : [];
    });
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // State initialized via initializer
    }, []);

    const knownPairs = useMemo(() => {
        return Array.from(new Set([...DEFAULT_PAIRS, ...customPairs]));
    }, [customPairs]);

    const handleAddPair = (pair: string) => {
        if (customPairs.includes(pair) || DEFAULT_PAIRS.includes(pair)) return;
        const updated = [...customPairs, pair];
        setCustomPairs(updated);
        localStorage.setItem(PAIRS_KEY, JSON.stringify(updated));
    };

    const set = (field: string, val: string | string[]) =>
        setForm(p => ({ ...p, [field]: val }));

    const toggleTag = (tag: string) =>
        set('tags', form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag]);

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
        const entry = {
            id: Date.now().toString(),
            datetime: format(new Date(), 'MMM dd, yyyy HH:mm'),
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
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...existing]));
        setForm(defaultForm);
        setSaved(true);
        setTimeout(() => { setSaved(false); }, 1200);
    };

    const inputCls = 'w-full bg-black/50 border border-white/10 rounded-md py-2 px-3 text-sm text-zinc-200 focus:outline-none focus:border-primary placeholder-zinc-600 transition-colors';
    const labelCls = 'text-xs text-zinc-500 mb-1 block';

    return (
        <div className="border-t border-white/5 bg-black/20 flex flex-col">

            {/* ── Paper Trade Section (collapsible, sits above Log New Trade) ── */}
            {/* <PaperTradeSection knownPairs={knownPairs} onAddPair={handleAddPair} /> */}

            {/* ── Log New Trade Header ── */}
            <button
                onClick={() => setLogExpanded(o => !o)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-zinc-300 border-t border-white/5 hover:bg-white/5 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-primary" />
                    Log New Trade
                </span>
                {logExpanded
                    ? <ChevronUp className="w-4 h-4 text-zinc-500" />
                    : <ChevronDown className="w-4 h-4 text-zinc-500" />
                }
            </button>

            {logExpanded && <div className="px-4 pb-4 pt-2 space-y-3 border-t border-white/5">
                {/* Row 1: Pair / Direction / Size */}
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className={labelCls}>Pair</label>
                        <PairCombobox value={form.pair} onChange={v => set('pair', v)} knownPairs={knownPairs} onAddPair={handleAddPair} />
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
                        <div className="flex items-center gap-1">
                            <input type="number" value={form.entryPrice} onChange={e => set('entryPrice', e.target.value)} placeholder="0.00" className={inputCls} />
                            <PastePriceButton onPaste={v => set('entryPrice', v)} />
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Stop Loss</label>
                        <div className="flex items-center gap-1">
                            <input type="number" value={form.stopLoss} onChange={e => set('stopLoss', e.target.value)} placeholder="0.00" className={inputCls} />
                            <PastePriceButton onPaste={v => set('stopLoss', v)} />
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Take Profit</label>
                        <div className="flex items-center gap-1">
                            <input type="number" value={form.takeProfit} onChange={e => set('takeProfit', e.target.value)} placeholder="0.00" className={inputCls} />
                            <PastePriceButton onPaste={v => set('takeProfit', v)} />
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>R:R (auto)</label>
                        <div className={`w-full bg-black/30 border border-white/5 rounded-md py-2 px-3 text-sm font-mono ${rr === '—' ? 'text-zinc-600' : 'text-blue-400'}`}>{rr}</div>
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
                        rows={2}
                        className={`${inputCls} resize-none`}
                    />
                </div>

                {/* Save */}
                <button
                    onClick={handleSave}
                    disabled={!valid}
                    className={`w-full py-2.5 rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-all ${saved
                        ? 'bg-success/20 text-success border border-success/30'
                        : valid
                            ? 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20 cursor-pointer'
                            : 'bg-white/5 text-zinc-600 cursor-not-allowed'
                        }`}
                >
                    <PlusCircle className="w-4 h-4" />
                    {saved ? 'Saved to Journal ✓' : 'Add to Journal'}
                </button>
            </div>}
        </div>
    );
}
