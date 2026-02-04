import React from 'react';
import { Trophy, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Student } from '../utils/types';

interface ResultScreenProps {
    student: Student;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ student }) => {
    const r1 = student.scores?.round1 ?? 0;
    const r2 = student.scores?.round2 ?? 0;
    const r3 = student.scores?.round3 ?? 0;
    // Calculate average or total based on preference. Original was average.
    const avg = ((r1 + r2 + r3) / 3).toFixed(2);
    const total = r1 + r2 + r3;

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl p-8 max-w-lg w-full text-center border border-slate-700 shadow-2xl animate-fade-in-up">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy size={40} className="text-emerald-400" />
                </div>

                <h1 className="text-3xl font-bold text-white mb-2">Contest Complete!</h1>
                <p className="text-slate-400 mb-8">Great job, {student.fullName}</p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                    <ScoreBox label="Round 1" value={r1} />
                    <ScoreBox label="Round 2" value={r2} />
                    <ScoreBox label="Round 3" value={r3} />
                </div>

                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                    <span className="block text-slate-500 text-sm uppercase tracking-wider font-bold mb-1">Final Total Score</span>
                    <span className="text-4xl font-mono font-bold text-emerald-400">{total}</span>
                    <span className="block text-slate-600 text-xs mt-1">Average: {avg}</span>
                </div>
            </div>
        </div>
    );
};

const ScoreBox = ({ label, value }: { label: string, value: number }) => (
    <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
        <div className="text-slate-500 text-xs uppercase mb-1">{label}</div>
        <div className="text-xl font-mono font-bold text-white">{value}</div>
    </div>
);
