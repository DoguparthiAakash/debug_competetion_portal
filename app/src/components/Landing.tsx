import React from 'react';
import { ArrowRight, Terminal, Code2, Bug, AlertTriangle } from 'lucide-react';
import { AdminButton } from './AdminButton';

interface LandingProps {
    onEnter: () => void;
    onAdmin: () => void;
}

export const Landing: React.FC<LandingProps> = ({ onEnter, onAdmin }) => {
    return (
        <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden font-sans">
            <AdminButton onLogin={onAdmin} />
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[100px]" />
            </div>

            {/* Nav */}
            <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
                    <Bug className="text-blue-500" />
                    <span>Bug Hunters</span>
                </div>
            </nav>

            {/* Hero */}
            <main className="relative z-10 max-w-7xl mx-auto px-8 py-20 flex flex-col items-center text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-blue-400 text-xs font-bold uppercase tracking-wider mb-8">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    Kanal 2k26 Edition
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold mb-8 leading-tight tracking-tight">
                    Fix the Bug.<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                        Win the Glory.
                    </span>
                </h1>

                <p className="text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
                    Three rounds of intense debugging. Real code challenges. Zero hints.
                    Prove your engineering skills against the best in the college.
                </p>

                <button
                    onClick={onEnter}
                    className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-blue-600 rounded-full hover:bg-blue-500 hover:scale-105 shadow-xl shadow-blue-900/20"
                >
                    Enter Contest
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Grid Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full max-w-4xl">
                    <StatCard icon={<Code2 className="text-blue-400" />} label="Rounds" value="3" />
                    <StatCard icon={<AlertTriangle className="text-amber-400" />} label="Questions" value="9" />
                    <StatCard icon={<Terminal className="text-emerald-400" />} label="Languages" value="3" />
                </div>

                {/* Language Pills */}
                <div className="flex gap-4 mt-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                    <LangPill lang="C" color="blue" />
                    <LangPill lang="Java" color="red" />
                    <LangPill lang="Python" color="emerald" />
                </div>
            </main>

            <footer className="relative z-10 text-center text-slate-600 text-sm py-8">
                No account needed · Select your language once · Compete at your own pace
            </footer>
        </div>
    );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-800 p-6 rounded-2xl flex flex-col items-center">
        <div className="mb-4 p-3 bg-slate-800/50 rounded-xl">{icon}</div>
        <div className="text-3xl font-bold text-white mb-1">{value}</div>
        <div className="text-sm text-slate-500 font-medium uppercase tracking-wider">{label}</div>
    </div>
);

const LangPill = ({ lang, color }: { lang: string, color: string }) => (
    <div className={`px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-sm font-bold text-${color}-400`}>
        {lang}
    </div>
);
