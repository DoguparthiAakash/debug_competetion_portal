import React from 'react';
import { Play } from 'lucide-react';
import { Student } from '../utils/types';

interface InstructionsProps {
    round: number;
    onStart: () => void;
}

export const Instructions: React.FC<InstructionsProps> = ({ round, onStart }) => {
    const questionCount = round === 1 ? 4 : round === 2 ? 3 : 2;

    return (
        <div className="absolute inset-0 z-40 bg-slate-900/80 backdrop-blur-md flex items-center justify-center">
            <div className="bg-slate-800 rounded-2xl p-8 max-w-lg w-full text-center border border-slate-700 shadow-2xl">
                <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 font-bold text-sm uppercase tracking-wider mb-6 border border-blue-500/20">
                    Round {round}
                </div>

                <h1 className="text-3xl font-bold text-white mb-4">Ready to Start?</h1>
                <p className="text-slate-400 text-lg mb-8">
                    You have <span className="text-white font-bold">{questionCount} questions</span> in this round.
                    The timer will begin as soon as you proceed.
                </p>

                <div className="space-y-3 mb-8 text-sm text-slate-500">
                    <div className="flex items-center gap-2 justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Full-screen mode enforced
                    </div>
                    <div className="flex items-center gap-2 justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        No tab switching allowed
                    </div>
                </div>

                <button
                    onClick={onStart}
                    className="group relative inline-flex items-center justify-center px-8 py-3 text-lg font-bold text-white transition-all duration-200 bg-blue-600 rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                >
                    <span>Start Round {round}</span>
                    <Play size={18} className="ml-2 group-hover:translate-x-1 transition-transform" fill="currentColor" />
                </button>
            </div>
        </div>
    );
};
