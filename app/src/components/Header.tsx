import React from 'react';

interface HeaderProps {
    student: {
        fullName: string;
        rollNumber: string;
    } | null;
    onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ student, onLogout }) => {
    return (
        <header className="bg-slate-800 border-b border-slate-700 h-16 flex items-center justify-between px-6 shadow-md z-10">
            <div className="flex items-center gap-4">
                <div className="bg-blue-600 text-white px-3 py-1 rounded font-bold text-sm shadow-sm tracking-wide">
                    VSB DEBUGGING CONTEST
                </div>
                {student && (
                    <div className="text-slate-400 text-sm hidden sm:block border-l border-slate-600 pl-4">
                        <span className="text-slate-500 mr-2">Participant:</span>
                        <span className="font-mono text-slate-200">{student.fullName} ({student.rollNumber})</span>
                    </div>
                )}
            </div>
            {student && onLogout && (
                <button onClick={onLogout} className="text-sm text-red-400 hover:text-red-300 transition-colors">
                    Logout
                </button>
            )}
        </header>
    );
};
