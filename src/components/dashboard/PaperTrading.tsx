'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import {
    FlaskConical, TrendingUp, TrendingDown, DollarSign, Activity,
    X, ChevronDown, PlusCircle, Search, RotateCcw, Wallet, BarChart2,
    Target, AlertCircle, ChevronUp
} from 'lucide-react';
import {
    getPortfolio, savePortfolio, resetPortfolio, openPosition, closePosition,
    calcRR, calcUnrealizedPnL,
    type PaperPortfolio, type PaperPosition, type PaperTrade, type Direction,
    DEFAULT_BALANCE,
} from '@/lib/paperTrading';
import TradingChart from '@/components/dashboard/TradingChart';

const SETUP_TAGS = ['OB', 'FVG', 'CHoCH', 'BOS', 'Liquidity', 'MSS', 'EQH', 'EQL'];
const LEVERAGE_OPTIONS = [1, 2, 3, 5, 10, 20];
const DEFAULT_PAIRS = [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
    'DOGE/USDT', 'ADA/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT',
    'MATIC/USDT', 'TON/USDT', 'NEAR/USDT', 'ARB/USDT', 'OP/USDT',
];
const PAIRS_KEY = 'smc_pairs_v1';

const inputCls = 'w-full bg-black/50 border border-white/10 rounded-md py-2 px-3 text-sm text-zinc-200 focus:outline-none focus:border-primary placeholder-zinc-600 transition-colors';
const labelCls = 'text-xs text-zinc-500 mb-1 block';

// ─── Pair Combobox ─────────────────────────────────────────────────────────────

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
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden">
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
                            placeholder="Search or type new…"
                            className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
                        />
                        {query && <button onClick={() => setQuery('')}><X className="w-3 h-3 text-zinc-500 hover:text-zinc-300" /></button>}
                    </div>
                    <div className="max-h-40 overflow-y-auto py-1 custom-scrollbar">
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
                            <button onClick={addNew} className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 transition-colors flex items-center gap-2">
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

// ─── Portfolio Bar ─────────────────────────────────────────────────────────────

function PortfolioBar({
    portfolio,
}: {
    portfolio: PaperPortfolio;
}) {
    const lockedMargin = portfolio.openPositions.reduce((s, p) => s + p.margin, 0);
    const equity = portfolio.balance + lockedMargin;
    const totalUPnL = portfolio.openPositions.reduce((s, p) => s + calcUnrealizedPnL(p, p.entryPrice), 0);
    const totalRealizedPnL = portfolio.history.reduce((s, t) => s + t.realizedPnL, 0);
    const wins = portfolio.history.filter(t => t.result === 'Win').length;
    const closed = portfolio.history.length;
    const winRate = closed > 0 ? ((wins / closed) * 100).toFixed(0) : '—';

    const stats = [
        {
            label: 'Free Balance',
            value: `$${portfolio.balance.toFixed(2)}`,
            icon: <Wallet className="w-4 h-4" />,
            color: 'text-zinc-200',
        },
        {
            label: 'Equity',
            value: `$${equity.toFixed(2)}`,
            icon: <BarChart2 className="w-4 h-4" />,
            color: equity >= DEFAULT_BALANCE ? 'text-success' : 'text-danger',
        },
        {
            label: 'Unrealized P&L',
            value: `${totalUPnL >= 0 ? '+' : ''}$${totalUPnL.toFixed(2)}`,
            icon: <Activity className="w-4 h-4" />,
            color: totalUPnL >= 0 ? 'text-blue-400' : 'text-danger',
        },
        {
            label: 'Realized P&L',
            value: `${totalRealizedPnL >= 0 ? '+' : ''}$${totalRealizedPnL.toFixed(2)}`,
            icon: <DollarSign className="w-4 h-4" />,
            color: totalRealizedPnL >= 0 ? 'text-success' : 'text-danger',
        },
        {
            label: 'Win Rate',
            value: winRate === '—' ? '—' : `${winRate}%`,
            icon: <Target className="w-4 h-4" />,
            color: winRate !== '—' && Number(winRate) >= 50 ? 'text-success' : 'text-zinc-400',
        },
    ];

    return (
        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {stats.map(s => (
                    <div key={s.label} className="glass-panel p-4 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                            <span className={s.color}>{s.icon}</span>
                            {s.label}
                        </div>
                        <span className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Result Badge ──────────────────────────────────────────────────────────────

function ResultBadge({ result }: { result: PaperTrade['result'] }) {
    const map: Record<string, string> = {
        Win: 'bg-success/15 text-success border-success/30',
        Loss: 'bg-danger/15 text-danger border-danger/30',
        BreakEven: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/30',
    };
    const label: Record<string, string> = { Win: 'WIN', Loss: 'LOSS', BreakEven: 'BE' };
    return (
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${map[result]}`}>
            {label[result]}
        </span>
    );
}

// ─── Open Position Card ────────────────────────────────────────────────────────

function PositionCard({
    position,
    onClose,
}: {
    position: PaperPosition;
    onClose: (id: string, closePrice: number) => void;
}) {
    const [closePrice, setClosePrice] = useState('');
    const [showClose, setShowClose] = useState(false);

    const cp = parseFloat(closePrice);
    const upnl = !isNaN(cp) && cp > 0 ? calcUnrealizedPnL(position, cp) : null;

    return (
        <div className={`glass-panel p-4 flex flex-col gap-3 border-l-2 ${position.direction === 'Long' ? 'border-l-success/50' : 'border-l-danger/50'}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${position.direction === 'Long' ? 'bg-success/15' : 'bg-danger/15'}`}>
                        {position.direction === 'Long'
                            ? <TrendingUp className="w-4 h-4 text-success" />
                            : <TrendingDown className="w-4 h-4 text-danger" />
                        }
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-zinc-200">{position.pair}</span>
                            <span className={`text-xs font-semibold ${position.direction === 'Long' ? 'text-success' : 'text-danger'}`}>
                                {position.direction.toUpperCase()}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 font-mono font-semibold">
                                {position.leverage}×
                            </span>
                            {position.tags.map(t => (
                                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{t}</span>
                            ))}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">{position.openedAt}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-right flex-none">
                    <div className="hidden sm:flex flex-col text-xs gap-0.5">
                        <span className="text-zinc-500">R:R</span>
                        <span className="text-blue-400 font-mono font-bold">{position.rr}</span>
                    </div>
                    <div className="flex flex-col text-xs gap-0.5">
                        <span className="text-zinc-500">Size</span>
                        <span className="text-zinc-300 font-mono">${position.sizeUSDT}</span>
                    </div>
                    <div className="flex flex-col text-xs gap-0.5">
                        <span className="text-zinc-500">Margin</span>
                        <span className="text-zinc-300 font-mono">${position.margin.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={() => setShowClose(v => !v)}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 transition-all"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Price levels */}
            <div className="flex gap-4 text-xs text-zinc-600">
                <span>Entry: <span className="text-zinc-400 font-mono">{position.entryPrice}</span></span>
                <span>SL: <span className="text-danger/80 font-mono">{position.stopLoss}</span></span>
                <span>TP: <span className="text-success/80 font-mono">{position.takeProfit}</span></span>
            </div>

            {/* Notes */}
            {position.notes && (
                <p className="text-xs text-zinc-500 bg-black/20 rounded-md px-3 py-2 border border-white/5 italic">{position.notes}</p>
            )}

            {/* Close panel */}
            {showClose && (
                <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-3 flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                        <label className="text-xs text-zinc-500">Close Price</label>
                        <input
                            type="number"
                            value={closePrice}
                            onChange={e => setClosePrice(e.target.value)}
                            placeholder="Enter exit price"
                            className={inputCls}
                            autoFocus
                        />
                    </div>
                    {upnl !== null && (
                        <div className="flex flex-col gap-0.5 text-xs">
                            <span className="text-zinc-500">Est. P&L</span>
                            <span className={`font-mono font-bold text-sm ${upnl >= 0 ? 'text-success' : 'text-danger'}`}>
                                {upnl >= 0 ? '+' : ''}${upnl.toFixed(2)}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={() => {
                            if (!isNaN(cp) && cp > 0) {
                                onClose(position.id, cp);
                                setShowClose(false);
                            }
                        }}
                        disabled={isNaN(cp) || cp <= 0}
                        className="px-4 py-2 rounded-md text-sm font-semibold bg-danger hover:bg-danger/80 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Confirm Close
                    </button>
                    <button onClick={() => setShowClose(false)} className="p-2 text-zinc-500 hover:text-zinc-300 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Open Trade Form ───────────────────────────────────────────────────────────

const defaultForm = {
    pair: 'BTC/USDT',
    direction: 'Long' as Direction,
    leverage: 5,
    sizeUSDT: '100',
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    tags: [] as string[],
    notes: '',
};

function OpenTradeForm({
    knownPairs,
    onAddPair,
    onOpen,
    availableBalance,
    onPairChange,
}: {
    knownPairs: string[];
    onAddPair: (pair: string) => void;
    onOpen: (params: typeof defaultForm) => void;
    availableBalance: number;
    onPairChange: (pair: string) => void;
}) {
    const [form, setForm] = useState(defaultForm);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const set = (field: string, val: string | string[] | number) => {
        setForm(p => ({ ...p, [field]: val }));
        if (field === 'pair' && typeof val === 'string') onPairChange(val);
    };

    const toggleTag = (tag: string) =>
        set('tags', form.tags.includes(tag) ? form.tags.filter(t => t !== tag) : [...form.tags, tag]);

    const rr = useMemo(() => {
        const e = parseFloat(form.entryPrice);
        const sl = parseFloat(form.stopLoss);
        const tp = parseFloat(form.takeProfit);
        if (isNaN(e) || isNaN(sl) || isNaN(tp)) return '—';
        return calcRR(e, sl, tp);
    }, [form.entryPrice, form.stopLoss, form.takeProfit]);

    const margin = parseFloat(form.sizeUSDT) / form.leverage;
    const valid = form.pair && form.entryPrice && form.stopLoss && form.takeProfit && form.sizeUSDT && !isNaN(margin) && margin > 0;

    const handleOpen = () => {
        if (!valid) return;
        if (margin > availableBalance) {
            setError(`Insufficient balance. Need $${margin.toFixed(2)}, available $${availableBalance.toFixed(2)}.`);
            return;
        }
        setError('');
        onOpen(form);
        setForm(defaultForm);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 1500);
    };

    return (
        <div className="glass-panel overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-zinc-300">Open Paper Trade</span>
                <span className="ml-auto text-xs text-zinc-500">
                    Available: <span className="text-zinc-300 font-mono">${availableBalance.toFixed(2)}</span>
                </span>
            </div>

            <div className="px-5 py-4 space-y-3">
                {/* Row 1: Pair / Direction */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Pair</label>
                        <PairCombobox value={form.pair} onChange={v => set('pair', v)} knownPairs={knownPairs} onAddPair={onAddPair} />
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
                </div>

                {/* Row 2: Leverage / Size / Margin preview */}
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className={labelCls}>Leverage</label>
                        <div className="flex gap-1.5 flex-wrap">
                            {LEVERAGE_OPTIONS.map(lev => (
                                <button
                                    key={lev}
                                    onClick={() => set('leverage', lev)}
                                    className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all border ${form.leverage === lev
                                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                        : 'bg-black/30 border-white/10 text-zinc-500 hover:border-white/20'
                                        }`}
                                >
                                    {lev}×
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Size / Notional (USDT)</label>
                        <input type="number" value={form.sizeUSDT} onChange={e => set('sizeUSDT', e.target.value)} placeholder="100" className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Required Margin</label>
                        <div className={`w-full bg-black/30 border border-white/5 rounded-md py-2 px-3 text-sm font-mono ${!isNaN(margin) && margin > availableBalance ? 'text-danger' : 'text-zinc-300'}`}>
                            {!isNaN(margin) && margin > 0 ? `$${margin.toFixed(2)}` : '—'}
                        </div>
                    </div>
                </div>

                {/* Row 3: Entry / SL / TP / R:R */}
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
                        <div className={`w-full bg-black/30 border border-white/5 rounded-md py-2 px-3 text-sm font-mono ${rr === '—' ? 'text-zinc-600' : 'text-blue-400'}`}>{rr}</div>
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
                    <label className={labelCls}>Notes</label>
                    <textarea
                        value={form.notes}
                        onChange={e => set('notes', e.target.value)}
                        placeholder="Trade rationale, market context..."
                        rows={2}
                        className={`${inputCls} resize-none`}
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-md px-3 py-2">
                        <AlertCircle className="w-3.5 h-3.5 flex-none" />
                        {error}
                    </div>
                )}

                {/* Open Button */}
                <button
                    onClick={handleOpen}
                    disabled={!valid}
                    className={`w-full py-2.5 rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-all ${success
                        ? 'bg-success/20 text-success border border-success/30'
                        : valid
                            ? 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20 cursor-pointer'
                            : 'bg-white/5 text-zinc-600 cursor-not-allowed'
                        }`}
                >
                    <FlaskConical className="w-4 h-4" />
                    {success ? 'Position Opened ✓' : 'Open Paper Trade'}
                </button>
            </div>
        </div>
    );
}

// ─── Trade History Row ─────────────────────────────────────────────────────────

function HistoryRow({ trade }: { trade: PaperTrade }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className={`glass-panel px-4 py-3 flex flex-col gap-2 border-l-2 ${trade.result === 'Win' ? 'border-l-success/50' : trade.result === 'Loss' ? 'border-l-danger/50' : 'border-l-zinc-500/40'}`}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex-none p-1.5 rounded-md ${trade.direction === 'Long' ? 'bg-success/15' : 'bg-danger/15'}`}>
                        {trade.direction === 'Long'
                            ? <TrendingUp className="w-4 h-4 text-success" />
                            : <TrendingDown className="w-4 h-4 text-danger" />
                        }
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-zinc-200">{trade.pair}</span>
                            <span className={`text-xs font-semibold ${trade.direction === 'Long' ? 'text-success' : 'text-danger'}`}>
                                {trade.direction.toUpperCase()}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 font-mono font-semibold">
                                {trade.leverage}×
                            </span>
                            <ResultBadge result={trade.result} />
                            {trade.tags.map(t => (
                                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{t}</span>
                            ))}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">{trade.closedAt}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-none text-right">
                    <div className="hidden sm:flex flex-col text-xs gap-0.5">
                        <span className="text-zinc-500">R:R</span>
                        <span className="text-blue-400 font-mono font-bold">{trade.rr}</span>
                    </div>
                    <div className="flex flex-col text-xs gap-0.5">
                        <span className="text-zinc-500">P&L</span>
                        <span className={`font-mono font-bold ${trade.realizedPnL >= 0 ? 'text-success' : 'text-danger'}`}>
                            {trade.realizedPnL >= 0 ? '+' : ''}${trade.realizedPnL.toFixed(2)}
                        </span>
                    </div>
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="pt-2 border-t border-white/5 flex flex-wrap gap-4 text-xs text-zinc-600">
                    <span>Entry: <span className="text-zinc-400 font-mono">{trade.entryPrice}</span></span>
                    <span>Close: <span className="text-zinc-400 font-mono">{trade.closePrice}</span></span>
                    <span>SL: <span className="text-danger/80 font-mono">{trade.stopLoss}</span></span>
                    <span>TP: <span className="text-success/80 font-mono">{trade.takeProfit}</span></span>
                    <span>Size: <span className="text-zinc-400 font-mono">${trade.sizeUSDT}</span></span>
                    <span>Margin: <span className="text-zinc-400 font-mono">${trade.margin.toFixed(2)}</span></span>
                    {trade.notes && <p className="w-full text-zinc-500 italic mt-1">{trade.notes}</p>}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PaperTrading() {
    const [portfolio, setPortfolio] = useState<PaperPortfolio>(() => getPortfolio());
    const [customPairs, setCustomPairs] = useState<string[]>(() => {
        if (typeof window === 'undefined') return [];
        const savedPairs = localStorage.getItem(PAIRS_KEY);
        return savedPairs ? JSON.parse(savedPairs) : [];
    });
    const [confirmReset, setConfirmReset] = useState(false);
    const [chartPair, setChartPair] = useState('BTC/USDT');
    const [chartInterval] = useState('15');

    useEffect(() => {
        // State is now initialized via state initializer function
    }, []);

    const persist = (p: PaperPortfolio) => {
        setPortfolio(p);
        savePortfolio(p);
    };

    const handleOpenTrade = (form: typeof defaultForm) => {
        const result = openPosition(portfolio, {
            pair: form.pair,
            direction: form.direction,
            leverage: form.leverage,
            sizeUSDT: parseFloat(form.sizeUSDT),
            entryPrice: parseFloat(form.entryPrice),
            stopLoss: parseFloat(form.stopLoss),
            takeProfit: parseFloat(form.takeProfit),
            tags: form.tags,
            notes: form.notes,
            openedAt: format(new Date(), 'MMM dd, yyyy HH:mm'),
        });
        if (!result.error) persist(result.portfolio);
    };

    const handleClosePosition = (id: string, closePrice: number) => {
        const updated = closePosition(portfolio, id, closePrice, format(new Date(), 'MMM dd, yyyy HH:mm'));
        persist(updated);
    };

    const handleAddPair = (pair: string) => {
        if (customPairs.includes(pair) || DEFAULT_PAIRS.includes(pair)) return;
        const updated = [...customPairs, pair];
        setCustomPairs(updated);
        localStorage.setItem(PAIRS_KEY, JSON.stringify(updated));
    };

    const knownPairs = useMemo(() => {
        const fromEntries = portfolio.openPositions.map(p => p.pair);
        const fromHistory = portfolio.history.map(t => t.pair);
        return Array.from(new Set([...DEFAULT_PAIRS, ...customPairs, ...fromEntries, ...fromHistory]));
    }, [portfolio, customPairs]);

    return (
        <div className="flex flex-col gap-4 p-4 max-w-[1920px] mx-auto">

            {/* Section Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <FlaskConical className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-zinc-200">Paper Trading Simulator</h2>
                        <p className="text-xs text-zinc-500">Risk-free virtual trading — no real money involved</p>
                    </div>
                </div>

                {/* Reset */}
                {!confirmReset ? (
                    <button
                        onClick={() => setConfirmReset(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-500 border border-white/10 hover:border-white/20 hover:text-zinc-300 transition-all"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset Portfolio
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-danger">Reset to $1,000?</span>
                        <button
                            onClick={() => { persist(resetPortfolio()); setConfirmReset(false); }}
                            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-danger/20 text-danger border border-danger/30 hover:bg-danger/30 transition-all"
                        >
                            Yes, Reset
                        </button>
                        <button
                            onClick={() => setConfirmReset(false)}
                            className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-500 border border-white/10 hover:text-zinc-300 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {/* Portfolio Stats Bar */}
            <PortfolioBar portfolio={portfolio} />

            {/* ── Live Chart ─────────────────────────────────────── */}
            <div className="glass-panel overflow-hidden flex flex-col" style={{ height: '500px' }}>
                <div className="p-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                        Advanced Chart
                    </h2>
                </div>
                <div className="flex-1 w-full bg-board min-h-0">
                    <TradingChart pair={chartPair} interval={chartInterval} />
                </div>
            </div>

            {/* Main Grid: Form + Positions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                {/* Open Trade Form */}
                <OpenTradeForm
                    knownPairs={knownPairs}
                    onAddPair={handleAddPair}
                    onOpen={handleOpenTrade}
                    availableBalance={portfolio.balance}
                    onPairChange={setChartPair}
                />

                {/* Open Positions */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 px-1">
                        <Activity className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-zinc-300">Open Positions</span>
                        {portfolio.openPositions.length > 0 && (
                            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                                {portfolio.openPositions.length}
                            </span>
                        )}
                    </div>
                    {portfolio.openPositions.length === 0 ? (
                        <div className="glass-panel flex flex-col items-center justify-center gap-3 py-12 text-center">
                            <div className="p-3 rounded-full bg-white/5">
                                <Activity className="w-6 h-6 text-zinc-600" />
                            </div>
                            <div>
                                <p className="text-sm text-zinc-500">No open positions</p>
                                <p className="text-xs text-zinc-600 mt-0.5">Open a paper trade to get started</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {portfolio.openPositions.map(pos => (
                                <PositionCard key={pos.id} position={pos} onClose={handleClosePosition} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Trade History */}
            {portfolio.history.length > 0 && (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 px-1">
                        <BarChart2 className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm font-semibold text-zinc-300">Trade History</span>
                        <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/5 text-zinc-500 border border-white/10">
                            {portfolio.history.length}
                        </span>
                    </div>
                    <div className="flex flex-col gap-2">
                        {portfolio.history.map(trade => (
                            <HistoryRow key={trade.id} trade={trade} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
