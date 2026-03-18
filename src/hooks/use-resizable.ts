import { useRef, useCallback, useEffect } from "react";

interface UseResizableOptions {
  size: { width: number; height: number };
  onSizeChange: (size: { width: number; height: number }) => void;
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
}

export function useResizable({
  size,
  onSizeChange,
  minSize = { width: 300, height: 300 },
  maxSize = { width: 520, height: 640 },
}: UseResizableOptions) {
  const isResizing = useRef(false);
  const startSize = useRef(size);
  const startPos = useRef({ x: 0, y: 0 });
  const currentSize = useRef(size);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number>(0);

  useEffect(() => {
    currentSize.current = size;
  }, [size]);

  const clampSize = useCallback(
    (w: number, h: number) => ({
      width: Math.max(minSize.width, Math.min(maxSize.width, w)),
      height: Math.max(minSize.height, Math.min(maxSize.height, h)),
    }),
    [minSize, maxSize]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = currentSize.current;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isResizing.current) return;
      e.preventDefault();

      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;
        const newSize = clampSize(
          startSize.current.width + dx,
          startSize.current.height + dy
        );
        currentSize.current = newSize;

        const el = containerRef.current;
        if (el) {
          el.style.width = `${newSize.width}px`;
          el.style.height = `${newSize.height}px`;
        }
      });
    },
    [clampSize]
  );

  const onPointerUp = useCallback(() => {
    if (!isResizing.current) return;
    isResizing.current = false;
    cancelAnimationFrame(rafId.current);
    onSizeChange(currentSize.current);
  }, [onSizeChange]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  return {
    containerRef,
    resizeHandleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
  };
}
