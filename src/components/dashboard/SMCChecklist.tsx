'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, ChevronDown, Save, FileText, Activity } from 'lucide-react';

interface JournalEntry {
    id: string;
    date: string;
    bias: 'Long' | 'Short' | 'Neutral';
    riskRatio: string;
    profitTarget: number;
    result: 'Pending' | 'Win ($5)' | 'Loss';
}

export default function SMCChecklist() {
    const [checklist, setChecklist] = useState({
        trend: false,
        ob: false,
        fvg: false,
        liquidity: false,
        choch: false,
    });

    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [bias, setBias] = useState<'Long' | 'Short' | 'Neutral'>('Neutral');

    useEffect(() => {
        const saved = localStorage.getItem('smc_journal');
        if (saved) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setEntries(JSON.parse(saved));
        }
    }, []);

    const handleCheck = (key: keyof typeof checklist) => {
        setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const isReady = Object.values(checklist).every(Boolean);

    const saveEntry = () => {
        if (!isReady) return;
        const newEntry: JournalEntry = {
            id: Date.now().toString(),
            date: format(new Date(), 'MMM dd, HH:mm'),
            bias,
            riskRatio: '1:2',
            profitTarget: 5,
            result: 'Pending'
        };

        const updated = [newEntry, ...entries].slice(0, 10); // Keep last 10
        setEntries(updated);
        localStorage.setItem('smc_journal', JSON.stringify(updated));

        // Reset form
        setChecklist({ trend: false, ob: false, fvg: false, liquidity: false, choch: false });
        setBias('Neutral');
    };

    return (
        <div className="flex flex-col gap-6 w-full h-full pb-4">

            {/* SOP Checklist section */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Pre-Entry Checklist</h3>

                <div className="space-y-2">
                    <label className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${checklist.trend ? 'bg-success/10 border-success/30' : 'bg-black/20 border-white/5 hover:bg-black/40'}`}>
                        <input type="checkbox" checked={checklist.trend} onChange={() => handleCheck('trend')} className="hidden" />
                        <CheckCircle2 className={`w-5 h-5 ${checklist.trend ? 'text-success' : 'text-zinc-600'}`} />
                        <span className={`text-sm ${checklist.trend ? 'text-zinc-200' : 'text-zinc-400'}`}>HTF Trend Identified (1H Bias)</span>
                    </label>

                    <label className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${checklist.ob ? 'bg-success/10 border-success/30' : 'bg-black/20 border-white/5 hover:bg-black/40'}`}>
                        <input type="checkbox" checked={checklist.ob} onChange={() => handleCheck('ob')} className="hidden" />
                        <CheckCircle2 className={`w-5 h-5 ${checklist.ob ? 'text-success' : 'text-zinc-600'}`} />
                        <span className={`text-sm ${checklist.ob ? 'text-zinc-200' : 'text-zinc-400'}`}>Order Block (OB) Marked</span>
                    </label>

                    <label className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${checklist.fvg ? 'bg-success/10 border-success/30' : 'bg-black/20 border-white/5 hover:bg-black/40'}`}>
                        <input type="checkbox" checked={checklist.fvg} onChange={() => handleCheck('fvg')} className="hidden" />
                        <CheckCircle2 className={`w-5 h-5 ${checklist.fvg ? 'text-success' : 'text-zinc-600'}`} />
                        <span className={`text-sm ${checklist.fvg ? 'text-zinc-200' : 'text-zinc-400'}`}>FVG (Imbalance) Confirmed</span>
                    </label>

                    <label className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${checklist.liquidity ? 'bg-success/10 border-success/30' : 'bg-black/20 border-white/5 hover:bg-black/40'}`}>
                        <input type="checkbox" checked={checklist.liquidity} onChange={() => handleCheck('liquidity')} className="hidden" />
                        <CheckCircle2 className={`w-5 h-5 ${checklist.liquidity ? 'text-success' : 'text-zinc-600'}`} />
                        <span className={`text-sm ${checklist.liquidity ? 'text-zinc-200' : 'text-zinc-400'}`}>Retail Liquidity Swept</span>
                    </label>

                    <label className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${checklist.choch ? 'bg-success/10 border-success/30' : 'bg-black/20 border-white/5 hover:bg-black/40'}`}>
                        <input type="checkbox" checked={checklist.choch} onChange={() => handleCheck('choch')} className="hidden" />
                        <CheckCircle2 className={`w-5 h-5 ${checklist.choch ? 'text-success' : 'text-zinc-600'}`} />
                        <span className={`text-sm ${checklist.choch ? 'text-zinc-200' : 'text-zinc-400'}`}>LTF Confirmed (5m CHoCH)</span>
                    </label>
                </div>
            </div>

            {/* Trade Entry form */}
            <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Execute & Log</h3>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-zinc-500">Direction</label>
                        <div className="relative">
                            <select
                                value={bias}
                                onChange={(e) => setBias(e.target.value as 'Long' | 'Short' | 'Neutral')}
                                className="w-full bg-black/50 border border-white/10 rounded-md py-2 px-3 text-sm text-zinc-200 appearance-none focus:outline-none focus:border-primary"
                            >
                                <option value="Neutral">Select Bias</option>
                                <option value="Long">LONG / BUY</option>
                                <option value="Short">SHORT / SELL</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-zinc-500">Capital Plan</label>
                        <div className="w-full bg-black/50 border border-white/10 rounded-md py-2 px-3 text-sm text-zinc-200">
                            $50 @ 10x Lev
                        </div>
                    </div>
                </div>

                <button
                    onClick={saveEntry}
                    disabled={!isReady || bias === 'Neutral'}
                    className={`w-full py-2.5 rounded-md flex items-center justify-center gap-2 font-medium transition-all
            ${isReady && bias !== 'Neutral'
                            ? 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20 cursor-pointer'
                            : 'bg-white/5 text-zinc-500 cursor-not-allowed'}`}
                >
                    <Save className="w-4 h-4" />
                    {isReady ? 'Log Trade Execution' : 'Complete Checklist First'}
                </button>
            </div>

            {/* Mini Journal */}
            <div className="flex-1 min-h-[150px]">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                    Recent Logs
                    <span className="text-xs font-normal text-zinc-500">{entries.length} recorded</span>
                </h3>

                <div className="space-y-2">
                    {entries.length === 0 ? (
                        <div className="text-center py-6 text-zinc-600 text-sm flex flex-col items-center gap-2 border border-dashed border-white/10 rounded-lg">
                            <FileText className="w-6 h-6" />
                            <p>No trades logged today.</p>
                        </div>
                    ) : (
                        entries.map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5 text-sm">
                                <div className="flex flex-col">
                                    <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                                        <Activity className={`w-3 h-3 ${entry.bias === 'Long' ? 'text-success' : 'text-danger'}`} />
                                        {entry.bias} Setup
                                    </span>
                                    <span className="text-xs text-zinc-500">{entry.date}</span>
                                </div>
                                <div className="text-right flex flex-col">
                                    <span className="text-zinc-300 font-medium">Target: $5</span>
                                    <span className="text-xs text-yellow-500">{entry.result}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
}
