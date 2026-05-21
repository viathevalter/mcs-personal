import React from 'react';
import { NotificationBell } from './NotificationBell';
import { LanguageSelector } from './LanguageSelector';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';

import { EmpresaSelector } from './EmpresaSelector';

export const Header: React.FC = () => {
    const { user } = useAuth();

    // Helper to get initials
    const getInitials = (name?: string, email?: string) => {
        if (name) {
            return name.substring(0, 2).toUpperCase();
        }
        if (email) {
            return email.substring(0, 2).toUpperCase();
        }
        return 'U';
    };

    return (
        <header className="flex justify-end items-center px-8 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 transition-colors">
            <div className="flex items-center gap-6">
                <EmpresaSelector />
                <ThemeToggle />
                <LanguageSelector />

                <div className="h-5 w-px bg-slate-200"></div>

                <NotificationBell />

                <div className="h-5 w-px bg-slate-200"></div>

                <div className="flex items-center gap-3 pl-2">
                    <div className="text-right hidden md:block">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {user?.profile?.full_name || user?.email}
                        </div>
                        <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                            {user?.profile?.role || 'User'}
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20 ring-2 ring-white">
                        {getInitials(user?.profile?.full_name, user?.email)}
                    </div>
                </div>
            </div>
        </header>
    );
};
