import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxProps {
    options: { value: string; label: string }[];
    value: string | null;
    onChange: (value: string | null) => void;
    placeholder?: string;
    emptyText?: string;
    className?: string;
    popoverClassName?: string;
}

const normalizeSearchText = (text: string): string =>
    (text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

export function Combobox({
    options,
    value,
    onChange,
    placeholder = "Select an option...",
    emptyText = "No results found.",
    className,
    popoverClassName
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    React.useEffect(() => {
        if (!open) {
            setSearch("");
        }
    }, [open]);

    const uniqueOptions = React.useMemo(() => {
        const seenValues = new Set<string>();
        const seenLabels = new Set<string>();
        const result: { value: string; label: string }[] = [];
        for (const opt of options) {
            if (!opt.value || seenValues.has(opt.value)) continue;
            const normLabel = normalizeSearchText(opt.label);
            if (seenLabels.has(normLabel)) continue;
            seenValues.add(opt.value);
            seenLabels.add(normLabel);
            result.push(opt);
        }
        return result;
    }, [options]);

    const filteredOptions = React.useMemo(() => {
        const normSearch = normalizeSearchText(search);
        if (!normSearch) return uniqueOptions;
        const tokens = normSearch.split(/\s+/).filter(Boolean);
        return uniqueOptions.filter(option => {
            const normLabel = normalizeSearchText(option.label);
            return tokens.every(token => normLabel.includes(token));
        });
    }, [uniqueOptions, search]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full min-w-0 max-w-full overflow-hidden justify-between font-normal text-left text-foreground bg-background", className)}
                >
                    <span className="truncate mr-2 text-left flex-1 text-foreground">
                        {value
                            ? uniqueOptions.find((option) => option.value === value)?.label || options.find((option) => option.value === value)?.label
                            : placeholder}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 text-muted-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className={cn("w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0 shadow-lg border-slate-200 dark:border-slate-800", popoverClassName)} align="start">
                <Command shouldFilter={false}>
                    <CommandInput 
                        placeholder="Buscar por nome, código ou empresa..." 
                        value={search}
                        onValueChange={setSearch}
                    />
                    {filteredOptions.length === 0 && (
                        <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
                    )}
                    <CommandList>
                        <CommandGroup>
                            {filteredOptions.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() => {
                                        onChange(option.value === value ? null : option.value)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
