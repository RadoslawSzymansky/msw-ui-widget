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
        const width = Math.max(minWidth, parsed.width || defaultWidth);
        const height = Math.max(minHeight, parsed.height || defaultHeight);

        // Only restore position if it's within viewport
        if (parsed.left !== undefined && parsed.top !== undefined) {
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const isInViewport =
            parsed.left >= 0 &&
            parsed.top >= 0 &&
            parsed.left + width <= viewportWidth &&
            parsed.top + height <= viewportHeight;

          if (isInViewport) {
            return { width, height, left: parsed.left, top: parsed.top };
          }
        }

        // Position is outside viewport or not set - use default (bottom/right)
        return { width, height };
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

  // Constrain position to viewport
  const constrainToViewport = useCallback(
    (left: number, top: number, width: number, height: number) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Ensure widget stays within viewport bounds
      let constrainedLeft = left;
      let constrainedTop = top;

      // Check right edge
      if (constrainedLeft + width > viewportWidth) {
        constrainedLeft = Math.max(0, viewportWidth - width);
      }

      // Check left edge
      if (constrainedLeft < 0) {
        constrainedLeft = 0;
      }

      // Check bottom edge
      if (constrainedTop + height > viewportHeight) {
        constrainedTop = Math.max(0, viewportHeight - height);
      }

      // Check top edge
      if (constrainedTop < 0) {
        constrainedTop = 0;
      }

      return { left: constrainedLeft, top: constrainedTop };
    },
    []
  );

  // Watch for window resize and adjust position if needed
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      setDimensions((current) => {
        // Only adjust if we have explicit left/top positioning
        if (
          current.left !== undefined &&
          current.top !== undefined &&
          containerRef.current
        ) {
          const constrained = constrainToViewport(
            current.left,
            current.top,
            current.width,
            current.height
          );

          // Only update if position changed
          if (
            constrained.left !== current.left ||
            constrained.top !== current.top
          ) {
            const updated = {
              ...current,
              left: constrained.left,
              top: constrained.top,
            };
            saveDimensions(
              updated.width,
              updated.height,
              updated.left,
              updated.top
            );
            return updated;
          }
        }
        return current;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [constrainToViewport, saveDimensions]);

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
      let finalLeft = startLeft - actualDeltaX;
      let finalTop = startTop - actualDeltaY;

      // Constrain position to viewport
      const constrained = constrainToViewport(
        finalLeft,
        finalTop,
        constrainedWidth,
        constrainedHeight
      );
      finalLeft = constrained.left;
      finalTop = constrained.top;

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
    constrainToViewport,
  ]);

  return {
    dimensions,
    isResizing,
    containerRef,
    handleMouseDown,
  };
}
