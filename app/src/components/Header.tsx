import React from 'react';
import { Terminal, Lock, User } from 'lucide-react';
import { handleAdminAuth } from './AdminButton';

interface HeaderProps {
    onAdminLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onAdminLogin }) => (
    <header className="bg-slate-900 text-white p-4 shadow-md border-b border-slate-700 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
            <Terminal className="text-emerald-400" />
            <div>
                <h1 className="font-bold text-xl tracking-tight">DEBUG_ARENA_2025</h1>
                <p className="text-xs text-slate-400">National Debugging Championship</p>
            </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-800 px-3 py-1 rounded border border-slate-700 mr-10">
            <Lock size={12} className="text-red-400" />
            <span>SECURE ENVIRONMENT ACTIVE</span>
        </div>
        <button
            onClick={() => handleAdminAuth(onAdminLogin)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors"
        >
            <User size={16} />
        </button>
    </header>
);
