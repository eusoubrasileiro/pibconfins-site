import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Mes } from "@/types";
import { MonthCard } from "./MonthCard";
import { cn } from "@/lib/utils";

export function YearAccordion({ year, meses, defaultOpen }: { year: number; meses: Mes[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (meses.length === 0) return null;
  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-3 flex w-full items-center justify-between rounded border bg-card px-4 py-2 text-left text-sm font-semibold hover:bg-accent/20"
      >
        <span>{year} · {meses.length} {meses.length === 1 ? "mês" : "meses"}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {meses.map((m) => <MonthCard key={m.ref} mes={m} />)}
        </div>
      )}
    </div>
  );
}
