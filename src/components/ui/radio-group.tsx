import * as React from "react";
import { cn } from "@/lib/utils";

interface RadioGroupContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({});

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, disabled, children, ...props }, ref) => {
    return (
      <RadioGroupContext.Provider value={{ value, onValueChange, disabled }}>
        <div ref={ref} className={cn("grid gap-2", className)} role="radiogroup" {...props}>
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, value, disabled: itemDisabled, ...props }, ref) => {
    const context = React.useContext(RadioGroupContext);
    const isChecked = context.value === value;
    const isDisabled = itemDisabled || context.disabled;

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isChecked}
        disabled={isDisabled}
        onClick={() => {
          if (!isDisabled && context.onValueChange) {
            context.onValueChange(value);
          }
        }}
        className={cn(
          "aspect-square h-4 w-4 rounded-full border border-slate-300 dark:border-slate-700 text-indigo-600 ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center transition-colors",
          isChecked && "border-indigo-600 bg-white text-indigo-600 dark:border-indigo-500",
          className
        )}
        {...props}
      >
        {isChecked && <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
      </button>
    );
  }
);
RadioGroupItem.displayName = "RadioGroupItem";
