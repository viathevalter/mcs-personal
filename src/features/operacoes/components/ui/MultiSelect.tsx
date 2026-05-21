import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

interface Option {
    label: string;
    value: string;
}

interface MultiSelectProps {
    options: Option[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    className?: string; // Additional classes for styling the trigger
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
    options,
    selectedValues,
    onChange,
    placeholder = 'Selecionar...',
    searchPlaceholder = 'Buscar...',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const toggleOption = (value: string) => {
        if (selectedValues.includes(value)) {
            onChange(selectedValues.filter(v => v !== value));
        } else {
            onChange([...selectedValues, value]);
        }
    };

    const clearSelections = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative w-full" ref={wrapperRef}>
            {/* Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between min-h-[38px] cursor-pointer bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm rounded-lg outline-none ${className}`}
            >
                <div className="flex-1 overflow-hidden">
                    {selectedValues.length === 0 ? (
                        <span className="text-slate-400">{placeholder}</span>
                    ) : (
                        <div className="flex flex-wrap gap-1">
                            <span className="text-slate-700 dark:text-slate-300 truncate">
                                {selectedValues.length} selecionado(s)
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                    {selectedValues.length > 0 && (
                        <X
                            size={14}
                            className="cursor-pointer hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            onClick={clearSelections}
                        />
                    )}
                    <ChevronDown size={16} />
                </div>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 flex flex-col">
                    {/* Search Box */}
                    <div className="p-2 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-lg">
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border-none outline-none rounded-md dark:text-white"
                                onClick={(e) => e.stopPropagation()} // Prevent toggling dropdown when clicking search
                            />
                        </div>
                    </div>

                    {/* Options */}
                    <div className="overflow-y-auto flex-1 p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-center text-sm text-slate-400">Nenhum resultado</div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = selectedValues.includes(option.value);
                                return (
                                    <div
                                        key={option.value}
                                        onClick={() => toggleOption(option.value)}
                                        className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                                    >
                                        <span className="truncate pr-2">{option.label}</span>
                                        {isSelected && <Check size={16} className="text-blue-500 flex-shrink-0" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
