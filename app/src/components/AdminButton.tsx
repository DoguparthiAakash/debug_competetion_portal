import React from 'react';
import { User } from 'lucide-react';

interface AdminButtonProps {
    onLogin: () => void;
}

import api from '../utils/api';

const handleAdminAuth = async (onSuccess: () => void) => {
    const username = prompt("Enter Admin Username:");
    if (!username) return;
    const password = prompt("Enter Admin Password:");
    if (!password) return;

    try {
        const res = await api.post('/admin/login', { username, password });
        if (res.data.success) {
            sessionStorage.setItem('adminToken', res.data.token);
            onSuccess();
        } else {
            alert("Invalid Credentials");
        }
    } catch (err) {
        alert("Login failed. Check console.");
        console.error(err);
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
