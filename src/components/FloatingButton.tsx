import React, { useState, useEffect } from 'react';
import { useWidgetStore } from '../store/widgetStore';

interface FloatingButtonProps {
  onClick: () => void;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({ onClick }) => {
  const { activeMocks, isPanelOpen, globalCallOrder, setPanelOpen, theme } =
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
      className={`msw-floating-button rounded-lg p-4 shadow-lg relative transition-all duration-200 ${
        theme === 'dark'
          ? isPanelOpen
            ? 'bg-indigo-600 hover:bg-indigo-500'
            : 'bg-indigo-500 hover:bg-indigo-400'
          : isPanelOpen
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-blue-600 hover:bg-blue-700'
      } text-white ${isAnimating ? 'msw-floating-button-calling' : ''}`}
      aria-label="Toggle MSW Widget"
      title="MSW Widget - Manage API Mocks"
      style={{
        boxShadow:
          theme === 'dark'
            ? '0 4px 14px 0 rgba(99, 102, 241, 0.4)'
            : '0 4px 14px 0 rgba(37, 99, 235, 0.4)',
        opacity: theme === 'light' && !isPanelOpen ? 0.9 : 1,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      {activeMocksCount > 0 && (
        <span
          className={`absolute -top-1 -right-1 ${
            theme === 'dark' ? 'bg-red-400 text-white' : 'bg-red-500 text-white'
          } text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold shadow-md ${
            isAnimating ? 'msw-badge-pulse' : ''
          }`}
        >
          {activeMocksCount}
        </span>
      )}
    </button>
  );
};
