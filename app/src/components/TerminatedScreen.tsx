import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { AdminButton } from './AdminButton';

interface TerminatedScreenProps {
    reason: string;
    onAdminLogin: () => void;
}

export const TerminatedScreen: React.FC<TerminatedScreenProps> = ({ reason, onAdminLogin }) => (
    <div className="min-h-screen bg-red-950 flex flex-col items-center justify-center text-red-100 p-8 text-center relative">
        <AdminButton onLogin={onAdminLogin} />
        <AlertTriangle size={80} className="mb-6 text-red-500" />
        <h1 className="text-5xl font-bold mb-4">CONTEST TERMINATED</h1>
        <p className="text-2xl max-w-2xl">{reason}</p>
        <div className="mt-8 p-6 bg-red-900/50 rounded-lg border border-red-800">
            <p className="font-mono text-sm">Session ID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
            <p className="font-mono text-sm mt-2">Please contact the invigilator immediately.</p>
        </div>
    </div>
);
