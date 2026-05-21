import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/app/providers';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="relative group">
            <button className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                {theme === 'light' && <Sun size={20} />}
                {theme === 'dark' && <Moon size={20} />}
                {theme === 'system' && <Monitor size={20} />}
            </button>

            {/* Dropdown Menu with Bridge */}
            <div className="absolute right-0 top-full pt-2 hidden group-hover:block z-50 w-36">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1">
                    <button
                        onClick={() => setTheme('light')}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 ${theme === 'light' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                        <Sun size={16} /> Light
                    </button>
                    <button
                        onClick={() => setTheme('dark')}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 ${theme === 'dark' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                        <Moon size={16} /> Dark
                    </button>
                    <button
                        onClick={() => setTheme('system')}
                        className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 ${theme === 'system' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                        <Monitor size={16} /> System
                    </button>
                </div>
            </div>
        </div>
    );
}
