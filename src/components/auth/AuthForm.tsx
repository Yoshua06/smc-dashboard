'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LogIn, UserPlus, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AuthForm() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const router = useRouter();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.refresh();
                router.push('/');
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                });
                if (error) throw error;
                setSuccess('Check your email for the confirmation link!');
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred during authentication');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md space-y-8 glass-panel p-8 relative overflow-hidden">
            {/* Decorative Gradient blur */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="text-center relative">
                <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                    {isLogin ? 'Welcome Back' : 'Join the Terminal'}
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                    {isLogin
                        ? 'Sign in to access your trading journal'
                        : 'Register to start tracking your SMC setups'}
                </p>
            </div>

            <form className="mt-8 space-y-6 relative" onSubmit={handleAuth}>
                <div className="space-y-4">
                    <div className="relative">
                        <label htmlFor="email-address" className="sr-only">Email address</label>
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-4 w-4 text-zinc-500" />
                        </div>
                        <input
                            id="email-address"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="appearance-none relative block w-full px-10 py-3 bg-black/50 border border-white/10 placeholder-zinc-500 text-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all sm:text-sm"
                            placeholder="Email address"
                        />
                    </div>
                    <div className="relative">
                        <label htmlFor="password" className="sr-only">Password</label>
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-4 w-4 text-zinc-500" />
                        </div>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="appearance-none relative block w-full px-10 py-3 bg-black/50 border border-white/10 placeholder-zinc-500 text-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all sm:text-sm"
                            placeholder="Password"
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 text-xs font-medium text-danger bg-danger/10 border border-danger/20 rounded-md animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="h-4 w-4 flex-none" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="flex items-center gap-2 p-3 text-xs font-medium text-success bg-success/10 border border-success/20 rounded-md animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="h-4 w-4 flex-none" />
                        {success}
                    </div>
                )}

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                                    {isLogin ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                                </span>
                                {isLogin ? 'Sign In' : 'Sign Up'}
                            </>
                        )}
                    </button>
                </div>
            </form>

            <div className="text-center">
                <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                >
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
            </div>
        </div>
    );
}
