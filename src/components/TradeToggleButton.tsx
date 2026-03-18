import { memo } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTradePanelStore } from "@/stores/use-trade-panel-store";

export const TradeToggleButton = memo(function TradeToggleButton() {
  const toggle = useTradePanelStore((s) => s.toggle);
  const isOpen = useTradePanelStore((s) => s.isOpen);

  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded transition-all",
        isOpen
          ? "bg-green-500/10 text-green-400 border-green-500/50"
          : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <Zap className={cn("w-4 h-4", isOpen && "text-green-400")} />
      Instant Trade
    </button>
  );
});
