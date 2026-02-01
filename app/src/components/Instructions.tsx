import React from 'react';
import { Maximize, ShieldAlert, Clock, Code } from 'lucide-react';
import { AdminButton } from './AdminButton';

interface InstructionsProps {
    onStart: () => void;
    onAdminLogin: () => void;
}

export const Instructions: React.FC<InstructionsProps> = ({ onStart, onAdminLogin }) => (
    <div className="min-h-screen flex items-center justify-center p-4">
        <AdminButton onLogin={onAdminLogin} />
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-3xl border-t-4 border-yellow-500">
            <h2 className="text-3xl font-bold mb-6 text-slate-800">Contest Rules & Environment</h2>
            <div className="space-y-4 text-gray-700 mb-8">
                <div className="flex items-start gap-3">
                    <Maximize className="text-blue-600 mt-1 shrink-0" />
                    <p><strong>Strict Full-Screen:</strong> The contest forces full-screen mode. Exiting full-screen, switching tabs, or minimizing the browser will be recorded as a violation.</p>
                </div>
                <div className="flex items-start gap-3">
                    <ShieldAlert className="text-red-600 mt-1 shrink-0" />
                    <p><strong>3 Strike Rule:</strong> If you trigger more than 3 violations, your contest will be <strong>IMMEDIATELY TERMINATED</strong>.</p>
                </div>
                <div className="flex items-start gap-3">
                    <Clock className="text-green-600 mt-1 shrink-0" />
                    <p><strong>Round Timers:</strong> Rounds are sequential. R1 (20m) &rarr; R2 (30m) &rarr; R3 (40m). The timer never stops.</p>
                </div>
                <div className="flex items-start gap-3">
                    <Code className="text-purple-600 mt-1 shrink-0" />
                    <p><strong>Docker Sandbox:</strong> Your code runs in an isolated container. No internet access allowed.</p>
                </div>
            </div>
            <button onClick={onStart} className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xl font-bold py-4 rounded-lg shadow-lg flex justify-center items-center gap-3">
                Enter Safe Mode & Start Round 1
            </button>
        </div>
    </div>
);
