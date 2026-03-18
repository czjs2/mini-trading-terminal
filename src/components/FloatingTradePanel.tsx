import { createPortal } from "react-dom";
import { memo, type ReactNode } from "react";
import { X, GripHorizontal } from "lucide-react";
import { useTradePanelStore } from "@/stores/use-trade-panel-store";
import { useDraggable } from "@/hooks/use-draggable";
import { useResizable } from "@/hooks/use-resizable";

interface FloatingTradePanelProps {
  children: ReactNode;
  title: string;
}

export const FloatingTradePanel = memo(function FloatingTradePanel({
  children,
  title,
}: FloatingTradePanelProps) {
  const isOpen = useTradePanelStore((s) => s.isOpen);
  const position = useTradePanelStore((s) => s.position);
  const size = useTradePanelStore((s) => s.size);
  const close = useTradePanelStore((s) => s.close);
  const setPosition = useTradePanelStore((s) => s.setPosition);
  const setSize = useTradePanelStore((s) => s.setSize);

  const { elementRef, dragHandleProps } = useDraggable({
    position,
    onPositionChange: setPosition,
    panelSize: size,
  });

  const { containerRef, resizeHandleProps } = useResizable({
    size,
    onSizeChange: setSize,
  });

  if (!isOpen) return null;

  const panel = (
    <div
      ref={(node) => {
        (elementRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        width: size.width,
        height: size.height,
        zIndex: 9999,
      }}
      className="bg-card border border-border shadow-2xl shadow-black/50 flex flex-col overflow-hidden rounded-lg"
    >
      {/* Drag handle dots */}
      <div className="flex justify-center py-1">
        <div className="flex gap-0.5">
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
        </div>
      </div>

      {/* Title bar — draggable area */}
      <div
        {...dragHandleProps}
        className="flex items-center justify-between px-4 pb-2 select-none cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-muted-foreground/60" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1 hover:bg-muted/50 rounded transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-border" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {children}
      </div>

      {/* Resize handle — bottom right */}
      <div
        {...resizeHandleProps}
        className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize flex items-end justify-end p-0.5"
        onPointerDown={(e) => {
          e.stopPropagation();
          resizeHandleProps.onPointerDown(e);
        }}
      >
        <svg viewBox="0 0 10 10" className="w-3 h-3 text-muted-foreground/30">
          <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
});
