import * as React from "react"
import { X, ChevronsUpDown, Check } from "lucide-react"

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
import { Badge } from "@/components/ui/badge"

export interface MultiSelectProps {
    options: { value: string; label: string }[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    emptyText?: string;
    className?: string;
}

export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = "Select options...",
    emptyText = "No results found.",
    className
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)

    const handleUnselect = (item: string) => {
        onChange(selected.filter((i) => i !== item))
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between h-9 min-h-[36px] px-3 py-1 font-normal", className)}
                >
                    <div className="flex items-center overflow-hidden">
                        {selected.length === 0 && <span className="text-muted-foreground line-clamp-1 truncate">{placeholder}</span>}
                        {selected.map((item) => {
                            const label = options.find((o) => o.value === item)?.label
                            return (
                                <Badge
                                    key={item}
                                    variant="secondary"
                                    className="mr-1 mb-1"
                                >
                                    {label}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-muted"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                handleUnselect(item)
                                            }
                                        }}
                                        onMouseDown={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                        }}
                                        onClick={() => handleUnselect(item)}
                                    >
                                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                    </div>
                                </Badge>
                            )
                        })}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
                <Command>
                    <CommandInput placeholder={`Search...`} />
                    <CommandEmpty>{emptyText}</CommandEmpty>
                    <CommandList>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = selected.includes(option.value)
                                return (
                                    <CommandItem
                                        key={option.value}
                                        value={option.value}
                                        onSelect={() => {
                                            if (isSelected) {
                                                onChange(selected.filter((item) => item !== option.value))
                                            } else {
                                                onChange([...selected, option.value])
                                            }
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                isSelected ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {option.label}
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
