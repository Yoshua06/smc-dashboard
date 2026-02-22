'use client';

import AuthForm from '@/components/auth/AuthForm';

export default function AuthPage() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-board p-4">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden -z-10">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] pointer-events-none"></div>
            </div>

            <div className="w-full flex flex-col items-center">
                <div className="mb-8 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-2xl shadow-primary/40 mb-4 transform hover:scale-110 transition-transform cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                    </div>
                    <h1 className="text-2xl font-bold text-zinc-200 tracking-tight">Joshua Trading Terminal</h1>
                </div>

                <AuthForm />

                <footer className="mt-12 text-zinc-600 text-xs">
                    Built for $5/day compound goals & BTC/USDT Focus
                </footer>
            </div>
        </div>
    );
}
