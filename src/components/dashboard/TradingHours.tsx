'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface Session {
    name: string;
    start: number; // UTC hour
    end: number;   // UTC hour
}

// Only London and New York
const sessions: Session[] = [
    { name: 'London', start: 8, end: 17 },
    { name: 'New York', start: 13, end: 22 },
];

export default function TradingHours() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const isSessionOpen = (session: Session) => {
        const utcHour = time.getUTCHours();
        if (session.start < session.end) {
            return utcHour >= session.start && utcHour < session.end;
        } else {
            return utcHour >= session.start || utcHour < session.end;
        }
    };

    const formatLocalTime = (date: Date) => {
        const utc7 = new Date(date.getTime() + (7 * 60 * 60 * 1000));
        return utc7.toISOString().slice(11, 16) + ' UTC+7';
    };

    return (
        <div className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-zinc-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-mono font-medium tracking-tight">
                        {formatLocalTime(time)}
                    </span>
                </div>
            </div>

            <div className="space-y-3">
                {sessions.map((session) => {
                    const isOpen = isSessionOpen(session);
                    return (
                        <div key={session.name} className="flex flex-col gap-1.5 p-3 rounded-lg bg-black/20 border border-white/5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-widest">
                                    {session.name}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOpen
                                    ? 'bg-success/20 text-success border border-success/30 animate-pulse'
                                    : 'bg-zinc-800 text-zinc-500 border border-white/5'
                                    }`}>
                                    {isOpen ? 'OPEN' : 'CLOSED'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
                                <span>{session.start.toString().padStart(2, '0')}:00 - {session.end.toString().padStart(2, '0')}:00 UTC</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
