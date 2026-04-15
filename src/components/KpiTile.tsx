import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "positive" | "negative";
};

export function KpiTile({ label, value, sub, tone = "default" }: Props) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums",
            tone === "positive" && "text-success",
            tone === "negative" && "text-destructive",
          )}
        >
          {value}
        </div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
