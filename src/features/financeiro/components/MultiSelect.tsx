import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface MultiSelectProps {
    options: Option[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    label?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
    options,
    selected,
    onChange,
    placeholder = 'Selecionar...',
    label
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleOption = (value: string) => {
        const newSelected = selected.includes(value)
            ? selected.filter(item => item !== value)
            : [...selected, value];
        onChange(newSelected);
    };

    const handleSelectAll = () => {
        if (selected.length === options.length) {
            onChange([]);
        } else {
            onChange(options.map(opt => opt.value));
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="block text-xs font-bold text-gray-500 mb-1">{label}</label>}
            
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-brand-action focus:border-brand-action"
            >
                <div className="flex gap-1 flex-wrap">
                    {selected.length === 0 ? (
                        <span className="text-gray-400">{placeholder}</span>
                    ) : selected.length === options.length && options.length > 0 ? (
                        <span className="text-gray-900 font-medium">Todos Selecionados</span>
                    ) : (
                        <span className="text-gray-900 font-medium text-left truncate max-w-[150px]">
                            {selected.length} selecionado{selected.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
                        <button
                            onClick={handleSelectAll}
                            className="text-xs text-brand-action font-medium hover:underline w-full text-left px-2"
                        >
                            {selected.length === options.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                        </button>
                    </div>
                    
                    <div className="py-1">
                        {options.length === 0 ? (
                            <div className="px-4 py-2 text-sm text-gray-500">Nenhuma opção disponível</div>
                        ) : (
                            options.map((option) => (
                                <div
                                    key={option.value}
                                    onClick={() => toggleOption(option.value)}
                                    className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                >
                                    <div className={`
                                        w-4 h-4 mr-3 rounded border flex items-center justify-center transition-colors
                                        ${selected.includes(option.value) 
                                            ? 'bg-brand-action border-brand-action' 
                                            : 'border-gray-300 bg-white'}
                                    `}>
                                        {selected.includes(option.value) && <Check size={12} className="text-white" />}
                                    </div>
                                    <span className="text-sm text-gray-700">{option.label}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
