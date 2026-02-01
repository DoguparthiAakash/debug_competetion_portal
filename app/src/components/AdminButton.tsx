import React from 'react';
import { User } from 'lucide-react';

interface AdminButtonProps {
    onLogin: () => void;
}

const handleAdminAuth = (onSuccess: () => void) => {
    const user = prompt("Enter Admin Username:");
    if (!user) return;
    const pwd = prompt("Enter Admin Password:");
    if (user === "admin@vsbclub" && pwd === "debugdash@vsb") {
        onSuccess();
    } else {
        alert("Invalid Credentials");
    }
};

export const AdminButton: React.FC<AdminButtonProps> = ({ onLogin }) => {
    return (
        <button
            onClick={() => handleAdminAuth(onLogin)}
            className="fixed top-4 right-4 z-50 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg border border-slate-600 transition-all"
            title="Admin Login"
        >
            <User size={20} />
        </button>
    );
};

export { handleAdminAuth };
