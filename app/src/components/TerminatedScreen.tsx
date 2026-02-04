import React from 'react';
import { XCircle } from 'lucide-react';
import { Student } from '../utils/types';

interface TerminatedScreenProps {
    student: Student;
    onReturnHome: () => void;
}

export const TerminatedScreen: React.FC<TerminatedScreenProps> = ({ student, onReturnHome }) => {
    return (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl max-w-md w-full p-8 text-center border-2 border-red-500/50 shadow-2xl shadow-red-900/20">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle size={32} className="text-red-500" />
                </div>

                <h1 className="text-2xl font-bold text-white mb-2">Disqualified</h1>
                <p className="text-slate-300 mb-6">
                    You have been disqualified from the contest due to multiple violations of the exam environment rules.
                </p>

                <div className="bg-red-900/20 border border-red-900/50 rounded p-4 mb-6">
                    <div className="text-red-200 text-sm font-bold uppercase tracking-wider">Total Violations</div>
                    <div className="text-3xl font-mono font-bold text-red-500 mt-1">{student.violationAttempts}</div>
                </div>

                <button
                    onClick={onReturnHome}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition-colors"
                >
                    Return to Home
                </button>
            </div>
        </div>
    );
};
