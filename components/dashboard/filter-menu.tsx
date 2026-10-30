"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

type FilterMenuProps = {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  align?: "start" | "end";
  className?: string;
};

/**
 * Compact "Label | value ⌄" control, ported from the CRM toolbar. The label
 * acts as a prefix so the current state is readable without opening the menu.
 */
export function FilterMenu({
  label,
  value,
  options,
  onChange,
  align = "start",
  className,
}: FilterMenuProps) {
  const current = options.find((option) => option.value === value);
  const isDefault = value === options[0]?.value;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-0 overflow-hidden px-0 text-xs font-normal",
            !isDefault && "border-rose-200 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/10",
            className,
          )}
        >
          <span className="px-2 text-muted-foreground">{label}</span>
          <span aria-hidden className="h-full w-px bg-border" />
          <span className="flex items-center gap-1 px-2 font-medium">
            {current?.label ?? value}
            <ChevronDown className="size-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]/button:rotate-180" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-40">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
