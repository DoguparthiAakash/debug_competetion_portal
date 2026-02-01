import React from 'react';
import { CheckCircle } from 'lucide-react';
import { AdminButton } from './AdminButton';
import { Student } from '../utils/types';
import { ROUND_CONFIG } from '../utils/data';

interface ResultScreenProps {
    student: Student;
    onAdminLogin: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ student, onAdminLogin }) => {
    const totalScore = Object.values(student.scores).reduce((a: number, b: number) => a + b, 0);
    const maxScore = 30 * ROUND_CONFIG[1].count;



    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white relative">
            <AdminButton onLogin={onAdminLogin} />
            <div className="bg-slate-800 p-10 rounded-2xl shadow-2xl max-w-2xl w-full text-center border border-slate-700">
                <CheckCircle size={64} className="text-emerald-500 mx-auto mb-6" />
                <h1 className="text-4xl font-bold mb-2">Competition Ended</h1>
                <p className="text-slate-400 mb-8">You did your best.</p>

                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-700 p-4 rounded-lg">
                        <div className="text-sm text-slate-400 uppercase tracking-wider">Total Score</div>
                        <div className="text-3xl font-bold text-white mt-1">{totalScore} <span className="text-sm text-slate-500">/ {maxScore}</span></div>
                    </div>
                    <div className="bg-slate-700 p-4 rounded-lg">
                        <div className="text-sm text-slate-400 uppercase tracking-wider">Violations</div>
                        <div className={`text-3xl font-bold mt-1 ${student.violationCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {student.violationCount}
                        </div>
                    </div>
                    <div className="bg-slate-700 p-4 rounded-lg">
                        <div className="text-sm text-slate-400 uppercase tracking-wider">Status</div>
                        <div className="text-3xl font-bold text-blue-400 mt-1">LOCKED</div>
                    </div>
                </div>


                <button
                    onClick={() => {
                        localStorage.removeItem('contest_state');
                        window.location.reload();
                    }}
                    className="mt-4 bg-slate-700 hover:bg-slate-600 text-slate-300 px-6 py-2 rounded-full text-sm font-bold transition-colors border border-slate-600 hover:border-slate-500"
                >
                    Exit to Login
                </button>
            </div>
        </div>
    );
};
