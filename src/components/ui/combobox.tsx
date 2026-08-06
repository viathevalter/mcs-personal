import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
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
}

export function Combobox({
    options,
    value,
    onChange,
    placeholder = "Select an option...",
    emptyText = "No results found.",
    className
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    React.useEffect(() => {
        if (!open) {
            setSearch("");
        }
    }, [open]);

    const filteredOptions = React.useMemo(() => {
        if (!search) return options;
        const searchLower = search.toLowerCase();
        return options.filter(option => 
            option.label.toLowerCase().includes(searchLower)
        );
    }, [options, search]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between font-normal text-left", className)}
                >
                    <span className="truncate mr-2 text-left flex-1">
                        {value
                            ? options.find((option) => option.value === value)?.label
                            : placeholder}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command filter={() => 1}>
                    <CommandInput 
                        placeholder="Buscar..." 
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
                                    value={option.label.toLowerCase()}
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
