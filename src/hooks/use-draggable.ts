import { useRef, useCallback, useEffect } from "react";

interface UseDraggableOptions {
  position: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
  panelSize: { width: number; height: number };
}

export function useDraggable({ position, onPositionChange, panelSize }: UseDraggableOptions) {
  const elementRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionRef = useRef(position);
  const rafId = useRef<number>(0);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const clamp = useCallback(
    (x: number, y: number) => ({
      x: Math.max(0, Math.min(window.innerWidth - panelSize.width, x)),
      y: Math.max(0, Math.min(window.innerHeight - panelSize.height, y)),
    }),
    [panelSize]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y,
    };

    const el = elementRef.current;
    if (el) el.style.willChange = "transform";

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();

      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const raw = {
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y,
        };
        const clamped = clamp(raw.x, raw.y);
        positionRef.current = clamped;

        const el = elementRef.current;
        if (el) {
          el.style.transform = `translate3d(${clamped.x}px, ${clamped.y}px, 0)`;
        }
      });
    },
    [clamp]
  );

  const onPointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    cancelAnimationFrame(rafId.current);

    const el = elementRef.current;
    if (el) el.style.willChange = "auto";

    onPositionChange(positionRef.current);
  }, [onPositionChange]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  return {
    elementRef,
    dragHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
