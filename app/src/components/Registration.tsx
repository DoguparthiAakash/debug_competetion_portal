import React, { useState } from 'react';
import { Terminal, Play } from 'lucide-react';
import { AdminButton } from './AdminButton';
import { Student, Language } from '../utils/types';
import { saveState } from '../utils/helpers'; // We need to move utils to a helper file or component

// Note: saveState is currently defined in index.tsx, but should be moved to a helper. 
// For now, I will pass the onRegister function which does the saving in index.tsx, 
// OR I should move the saveState logic to a shared helper. 
// Let's create a helpers.ts file first? Or just duplicate/move it. 
// Moving it to helpers.ts is better. I will assume helpers.ts exists for a moment, or better yet, define it here for now if simple.

// Helper for component



interface RegistrationProps {
    onRegister: (s: Student) => void;
    onAdminLogin: () => void;
}

export const Registration: React.FC<RegistrationProps> = ({ onRegister, onAdminLogin }) => {
    const [form, setForm] = useState({
        fullName: '', rollNumber: '', college: '', department: '', year: '', email: '', language: 'c' as Language
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const student: Student = {
            ...form,
            currentRound: 1,
            contestStatus: 'INSTRUCTIONS',
            violationAttempts: 0, // renamed from violationCount
            isDisqualified: false,
            roundsCompleted: [],
            scores: { round1: null, round2: null, round3: null },
            roundStartedAt: {},
            codeCache: {},
            socketId: undefined
        };
        saveState(student);
        onRegister(student);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative bg-black font-sans text-slate-200">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[30%] h-[30%] rounded-full bg-blue-600/10 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-emerald-600/10 blur-[100px]" />
            </div>

            <div className="absolute top-4 right-4 z-10">
                <AdminButton onLogin={onAdminLogin} />
            </div>

            <div className="bg-zinc-900/50 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-zinc-800 relative z-10">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white border-b border-zinc-800 pb-4">
                    <Terminal className="text-blue-500" />
                    <span>Candidate Registration</span>
                </h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                        <input required className="w-full bg-black border border-zinc-700 p-3 rounded-lg focus:ring-2 ring-blue-500 outline-none text-white transition-all"
                            value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Enter your full name" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Roll Number</label>
                        <input required className="w-full bg-black border border-zinc-700 p-3 rounded-lg focus:ring-2 ring-blue-500 outline-none text-white font-mono uppercase transition-all"
                            value={form.rollNumber} onChange={e => setForm({ ...form, rollNumber: e.target.value })} placeholder="XX000" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Year of Study</label>
                        <select required className="w-full bg-black border border-zinc-700 p-3 rounded-lg focus:ring-2 ring-blue-500 outline-none text-white transition-all appearance-none"
                            value={form.year} onChange={e => setForm({ ...form, year: e.target.value })}>
                            <option value="">Select Year</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">College</label>
                        <input required className="w-full bg-black border border-zinc-700 p-3 rounded-lg focus:ring-2 ring-blue-500 outline-none text-white transition-all"
                            value={form.college} onChange={e => setForm({ ...form, college: e.target.value })} placeholder="College Name" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                        <input required className="w-full bg-black border border-zinc-700 p-3 rounded-lg focus:ring-2 ring-blue-500 outline-none text-white transition-all"
                            value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="Dept (e.g. CSE)" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email</label>
                        <input required type="email" className="w-full bg-black border border-zinc-700 p-3 rounded-lg focus:ring-2 ring-blue-500 outline-none text-white transition-all"
                            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="student@example.com" />
                    </div>
                    <div className="col-span-2 bg-blue-900/10 p-4 rounded-xl border border-blue-500/20 mt-2">
                        <label className="block text-xs font-bold text-blue-400 mb-3 uppercase tracking-wider">Preferred Language (Permanent)</label>
                        <div className="flex gap-6">
                            {['c', 'java', 'python'].map(l => (
                                <label key={l} className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${form.language === l ? 'border-blue-500 bg-blue-500' : 'border-slate-600 bg-zinc-800'}`}>
                                        {form.language === l && <div className="w-2 h-2 bg-white rounded-full" />}
                                    </div>
                                    <input type="radio" name="lang" value={l} checked={form.language === l}
                                        onChange={() => setForm({ ...form, language: l as Language })} className="hidden" />
                                    <span className={`uppercase font-bold text-sm transition-colors ${form.language === l ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{l}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="col-span-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 transform hover:scale-[1.02] shadow-lg shadow-blue-900/20 mt-4">
                        Initialize Candidate Profile <Play size={18} fill="currentColor" />
                    </button>
                </form>
            </div>
        </div>
    );
};
