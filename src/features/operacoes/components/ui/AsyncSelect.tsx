import React, { useState, useEffect, useRef } from 'react';
import { Loader2, X } from 'lucide-react';

export interface AsyncSelectProps {
    label: string;
    placeholder: string;
    onSearch: (query: string) => Promise<any[]>;
    onSelect: (item: any) => void;
    renderItem: (item: any) => React.ReactNode;
    displayValue?: string;
    disabled?: boolean;
}

export const AsyncSelect: React.FC<AsyncSelectProps> = ({
    label,
    placeholder,
    onSearch,
    onSelect,
    renderItem,
    displayValue,
    disabled
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (isOpen && query.length >= 2) {
                setLoading(true);
                try {
                    const data = await onSearch(query);
                    setResults(data);
                } finally {
                    setLoading(false);
                }
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query, isOpen, onSearch]);

    const handleSelect = (item: any) => {
        onSelect(item);
        setIsOpen(false);
        setResults([]);
        setQuery('');
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">{label}</label>
            {displayValue ? (
                <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 text-sm text-blue-800 dark:text-blue-200">
                    <span className="truncate">{displayValue}</span>
                    <button onClick={() => !disabled && onSelect(null)} disabled={disabled} className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors">
                        <X size={16} />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <input
                        type="text"
                        disabled={disabled}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-500 dark:focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
                        placeholder={placeholder}
                        value={query}
                        onFocus={() => setIsOpen(true)}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {loading && <Loader2 className="absolute right-3 top-2.5 animate-spin text-slate-400" size={16} />}
                </div>
            )}

            {isOpen && results.length > 0 && !displayValue && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto">
                    {results.map((item, idx) => (
                        <div
                            key={item.id || idx}
                            onClick={() => handleSelect(item)}
                            className="px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-none text-slate-700 dark:text-slate-200 transition-colors"
                        >
                            {renderItem(item)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
