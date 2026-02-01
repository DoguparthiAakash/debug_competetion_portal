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
const saveStateFn = (student: Student) => {
    localStorage.setItem('contest_state', JSON.stringify(student));
};


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
            violationCount: 0,
            scores: {},
            codeCache: {},
            roundStartTime: null
        };
        saveStateFn(student);
        onRegister(student);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative">
            <AdminButton onLogin={onAdminLogin} />
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl border border-gray-200">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-800">
                    <Terminal className="text-blue-600" /> Candidate Registration
                </h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                        <input required className="w-full border p-2 rounded focus:ring-2 ring-blue-500 outline-none"
                            value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Roll Number</label>
                        <input required className="w-full border p-2 rounded focus:ring-2 ring-blue-500 outline-none uppercase font-mono"
                            value={form.rollNumber} onChange={e => setForm({ ...form, rollNumber: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Year of Study</label>
                        <select required className="w-full border p-2 rounded bg-white"
                            value={form.year} onChange={e => setForm({ ...form, year: e.target.value })}>
                            <option value="">Select Year</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">College</label>
                        <input required className="w-full border p-2 rounded focus:ring-2 ring-blue-500 outline-none"
                            value={form.college} onChange={e => setForm({ ...form, college: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                        <input required className="w-full border p-2 rounded focus:ring-2 ring-blue-500 outline-none"
                            value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                        <input required type="email" className="w-full border p-2 rounded focus:ring-2 ring-blue-500 outline-none"
                            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    </div>
                    <div className="col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <label className="block text-sm font-bold text-blue-900 mb-2">Preferred Language (Permanent)</label>
                        <div className="flex gap-4">
                            {['c', 'java', 'python'].map(l => (
                                <label key={l} className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="lang" value={l} checked={form.language === l}
                                        onChange={() => setForm({ ...form, language: l as Language })} />
                                    <span className="uppercase font-bold text-sm">{l}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2">
                        Initialize Candidate Profile <Play size={16} />
                    </button>
                </form>
            </div>
        </div>
    );
};
