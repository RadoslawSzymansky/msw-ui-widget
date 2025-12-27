import React, { useState, useEffect } from 'react';
import { useWidgetStore } from '../store/widgetStore';

interface FloatingButtonProps {
  onClick: () => void;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({ onClick }) => {
  const { activeMocks, isPanelOpen, globalCallOrder, setPanelOpen } =
    useWidgetStore();
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevCount, setPrevCount] = useState(0);
  const activeMocksCount = Array.from(activeMocks.values()).filter(
    (m) => m.enabled
  ).length;

  // Animate button when any endpoint is called
  useEffect(() => {
    if (globalCallOrder > 0) {
      // Use requestAnimationFrame to defer setState outside of effect
      const rafId = requestAnimationFrame(() => {
        setIsAnimating(true);
        const timer = setTimeout(() => setIsAnimating(false), 600);
        return () => clearTimeout(timer);
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [globalCallOrder]);

  // Track count changes for badge animation
  useEffect(() => {
    if (activeMocksCount !== prevCount && activeMocksCount > 0) {
      // Use requestAnimationFrame to defer setState outside of effect
      const rafId = requestAnimationFrame(() => {
        setPrevCount(activeMocksCount);
      });
      return () => cancelAnimationFrame(rafId);
    }
  }, [activeMocksCount, prevCount]);

  const handleClick = () => {
    if (isPanelOpen) {
      setPanelOpen(false);
    } else {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`msw-floating-button bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg relative ${
        isPanelOpen ? 'bg-blue-700' : ''
      } ${isAnimating ? 'msw-floating-button-calling' : ''}`}
      aria-label="Toggle MSW Widget"
      title="MSW Widget - Manage API Mocks"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      {activeMocksCount > 0 && (
        <span
          className={`absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold ${
            isAnimating ? 'msw-badge-pulse' : ''
          }`}
        >
          {activeMocksCount}
        </span>
      )}
    </button>
  );
};
