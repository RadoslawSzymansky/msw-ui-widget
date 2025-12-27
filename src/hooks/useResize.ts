import { useState, useEffect, useCallback, useRef } from 'react';

interface UseResizeOptions {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  storageKey?: string;
  defaultWidth?: number;
  defaultHeight?: number;
}

type ResizeDirection = 'both' | 'width' | 'height';

export function useResize({
  minWidth = 400,
  maxWidth = 90,
  minHeight = 300,
  maxHeight = 90,
  storageKey = 'msw-widget-size',
  defaultWidth = 800,
  defaultHeight = 600,
}: UseResizeOptions = {}) {
  const [dimensions, setDimensions] = useState(() => {
    if (typeof window === 'undefined') {
      return { width: defaultWidth, height: defaultHeight };
    }
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Validate dimensions - ensure they meet minimum requirements
        const width = parsed.width || defaultWidth;
        const height = parsed.height || defaultHeight;
        return {
          width: Math.max(minWidth, width),
          height: Math.max(minHeight, height),
          ...(parsed.left !== undefined && parsed.top !== undefined
            ? { left: parsed.left, top: parsed.top }
            : {}),
        };
      } catch {
        return { width: defaultWidth, height: defaultHeight };
      }
    }
    return { width: defaultWidth, height: defaultHeight };
  });

  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] =
    useState<ResizeDirection>('both');
  const containerRef = useRef<HTMLDivElement>(null);
  const startMousePosRef = useRef<{ x: number; y: number } | null>(null);

  const saveDimensions = useCallback(
    (width: number, height: number, left?: number, top?: number) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ width, height, left, top })
      );
    },
    [storageKey]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, direction: ResizeDirection = 'both') => {
      e.preventDefault();
      e.stopPropagation();
      setResizeDirection(direction);
      // Store initial mouse position
      startMousePosRef.current = { x: e.clientX, y: e.clientY };
      setIsResizing(true);
    },
    []
  );

  useEffect(() => {
    if (!isResizing) return;

    if (!containerRef.current || !startMousePosRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const startWidth = containerRect.width;
    const startHeight = containerRect.height;
    const startLeft = containerRect.left;
    const startTop = containerRect.top;
    const startMouseX = startMousePosRef.current.x;
    const startMouseY = startMousePosRef.current.y;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      // Calculate delta from start position (negative because we're resizing from top-left)
      const deltaX = startMouseX - e.clientX;
      const deltaY = startMouseY - e.clientY;

      const newWidth = startWidth + deltaX;
      const newHeight = startHeight + deltaY;

      // Calculate max width/height as viewport percentage
      const maxWidthPx =
        typeof maxWidth === 'number' && maxWidth <= 100
          ? (window.innerWidth * maxWidth) / 100
          : maxWidth;
      const maxHeightPx =
        typeof maxHeight === 'number' && maxHeight <= 100
          ? (window.innerHeight * maxHeight) / 100
          : maxHeight;

      const constrainedWidth = Math.max(
        minWidth,
        Math.min(maxWidthPx, newWidth)
      );
      const constrainedHeight = Math.max(
        minHeight,
        Math.min(maxHeightPx, newHeight)
      );

      // Calculate actual delta after constraints
      const actualDeltaX = constrainedWidth - startWidth;
      const actualDeltaY = constrainedHeight - startHeight;

      // Calculate new position based on constrained dimensions
      const finalLeft = startLeft - actualDeltaX;
      const finalTop = startTop - actualDeltaY;

      setDimensions({
        width: constrainedWidth,
        height: constrainedHeight,
        left: finalLeft,
        top: finalTop,
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      startMousePosRef.current = null;
      // Save current dimensions
      setDimensions((current) => {
        saveDimensions(
          current.width,
          current.height,
          current.left,
          current.top
        );
        return current;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isResizing,
    resizeDirection,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    saveDimensions,
  ]);

  return {
    dimensions,
    isResizing,
    containerRef,
    handleMouseDown,
  };
}
