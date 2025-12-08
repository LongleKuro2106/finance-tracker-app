'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from '@/components/auth/signout';
import { useLocalStorage } from '@/hooks/use-local-storage';

interface DashboardSidebarProps {
  username?: string; // Optional, not displayed anymore
  onTransactionAdded?: () => void;
} 

const DEFAULT_SIDEBAR_WIDTH_PERCENT = 9; // Default 9% of viewport
const MIN_SIDEBAR_WIDTH_PERCENT = 5;
const MAX_SIDEBAR_WIDTH_PERCENT = 15;
const ICON_ONLY_THRESHOLD_PERCENT = 9; // Show icons only below this threshold

const DashboardSidebar = ({}: DashboardSidebarProps) => {
  const pathname = usePathname();
  const [sidebarWidthPercent, setSidebarWidthPercent] = useLocalStorage<number>(
    'sidebar-width-percent',
    DEFAULT_SIDEBAR_WIDTH_PERCENT,
  );
  const [isResizing, setIsResizing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const resizeButtonRef = useRef<HTMLButtonElement>(null);

  // Prevent hydration mismatch by only calculating width after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isActive = (path: string) => {
    return pathname === path;
  };

  const getSidebarWidth = useCallback(() => {
    if (typeof window === 'undefined' || !isMounted) return 0;
    return (window.innerWidth * sidebarWidthPercent) / 100;
  }, [sidebarWidthPercent, isMounted]);

  const isIconOnly = useMemo(() => {
    if (!isMounted) return false; // Default to false during SSR
    return sidebarWidthPercent < ICON_ONLY_THRESHOLD_PERCENT;
  }, [sidebarWidthPercent, isMounted]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const viewportWidth = window.innerWidth;
      const newWidthPercent = (e.clientX / viewportWidth) * 100;

      const clampedPercent = Math.max(
        MIN_SIDEBAR_WIDTH_PERCENT,
        Math.min(newWidthPercent, MAX_SIDEBAR_WIDTH_PERCENT),
      );

      setSidebarWidthPercent(clampedPercent);
    },
    [isResizing, setSidebarWidthPercent],
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Ensure sidebar width stays within bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      if (sidebarWidthPercent > MAX_SIDEBAR_WIDTH_PERCENT) {
        setSidebarWidthPercent(MAX_SIDEBAR_WIDTH_PERCENT);
      } else if (sidebarWidthPercent < MIN_SIDEBAR_WIDTH_PERCENT) {
        setSidebarWidthPercent(MIN_SIDEBAR_WIDTH_PERCENT);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarWidthPercent, setSidebarWidthPercent]);

  // Clamp initial width on mount
  useEffect(() => {
    if (sidebarWidthPercent > MAX_SIDEBAR_WIDTH_PERCENT) {
      setSidebarWidthPercent(MAX_SIDEBAR_WIDTH_PERCENT);
    } else if (sidebarWidthPercent < MIN_SIDEBAR_WIDTH_PERCENT) {
      setSidebarWidthPercent(MIN_SIDEBAR_WIDTH_PERCENT);
    }
  }, [sidebarWidthPercent, setSidebarWidthPercent]);

  const sidebarWidth = getSidebarWidth();

  // Use default width during SSR to prevent hydration mismatch
  // Default to 256px (w-64) during SSR, then use calculated width after mount
  const displayWidth = isMounted ? sidebarWidth : 256;

  return (
    <aside
      ref={sidebarRef}
      className="bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-screen sticky top-0"
      style={{ width: `${displayWidth}px` }}
    >
      {/* Resize Button - Centered on right edge */}
      <button
        ref={resizeButtonRef}
        onMouseDown={handleMouseDown}
        className={`absolute right-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-700 cursor-col-resize transition-colors flex items-center justify-center ${
          isResizing ? 'bg-blue-500 border-blue-600' : ''
        }`}
        aria-label="Resize sidebar"
        type="button"
      >
        <div className="flex flex-col gap-1">
          <div className="w-1 h-1 rounded-full bg-neutral-500 dark:bg-neutral-400" />
          <div className="w-1 h-1 rounded-full bg-neutral-500 dark:bg-neutral-400" />
          <div className="w-1 h-1 rounded-full bg-neutral-500 dark:bg-neutral-400" />
        </div>
      </button>

      {/* Logo/Header */}
      <div
        className={`border-b border-neutral-200 dark:border-neutral-800 ${
          isIconOnly ? 'p-4' : 'p-6'
        }`}
      >
        {isIconOnly ? (
          <div className="flex items-center justify-center">
            <span className="text-xl font-bold">F</span>
          </div>
        ) : (
          <h1 className="text-xl font-bold truncate">Finance Tracker</h1>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          <Link
            href="/dashboard"
            className={`flex items-center rounded-md text-sm font-medium transition-colors ${
              isIconOnly ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'
            } ${
              isActive('/dashboard')
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
            aria-current={isActive('/dashboard') ? 'page' : undefined}
            title={isIconOnly ? 'Dashboard' : undefined}
          >
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {!isIconOnly && <span className="truncate">Dashboard</span>}
          </Link>

          {/* Add Transaction - Moved here */}
          <Link
            href="/transactions/new"
            className={`flex items-center rounded-md text-sm font-medium transition-colors ${
              isIconOnly ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'
            } ${
              isActive('/transactions/new')
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
            aria-current={isActive('/transactions/new') ? 'page' : undefined}
            title={isIconOnly ? 'Add Transaction' : undefined}
          >
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            {!isIconOnly && <span className="truncate">Add Transaction</span>}
          </Link>

          <Link
            href="/budgets"
            className={`flex items-center rounded-md text-sm font-medium transition-colors ${
              isIconOnly ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'
            } ${
              isActive('/budgets')
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
            aria-current={isActive('/budgets') ? 'page' : undefined}
            title={isIconOnly ? 'Budgets' : undefined}
          >
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            {!isIconOnly && <span className="truncate">Budgets</span>}
          </Link>
          <Link
            href="/profile"
            className={`flex items-center rounded-md text-sm font-medium transition-colors ${
              isIconOnly ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'
            } ${
              isActive('/profile')
                ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
            aria-current={isActive('/profile') ? 'page' : undefined}
            title={isIconOnly ? 'Profile' : undefined}
          >
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            {!isIconOnly && <span className="truncate">Profile</span>}
          </Link>
        </div>
      </nav>

      {/* Sign Out */}
      <div
        className={`border-t border-neutral-200 dark:border-neutral-800 ${
          isIconOnly ? 'p-2' : 'p-4'
        }`}
      >
        {isIconOnly ? <SignOutButton iconOnly /> : <SignOutButton />}
      </div>
    </aside>
  );
};

export default DashboardSidebar;
