'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SignOutButton from '@/components/auth/signout';
import { ThemeToggle } from '@/components/shared/theme-toggle';

const DashboardTopbar = () => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <header className="neomorphic-sidebar w-full h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50 bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg sm:text-xl font-bold">Finance Tracker</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex items-center justify-center gap-2">
        <Link
          href="/dashboard"
          className={`group relative flex items-center justify-center p-2 text-sm font-medium transition-all rounded-lg ${
            isActive('/dashboard')
              ? 'text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'
          }`}
          aria-current={isActive('/dashboard') ? 'page' : undefined}
          title="Dashboard"
        >
          <div className={`relative p-2 rounded-lg transition-all ${
            isActive('/dashboard')
              ? 'bg-sidebar-accent shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]'
              : 'hover:bg-sidebar-accent/30'
          }`}>
            <svg
              className="w-5 h-5 flex-shrink-0 stroke-[2.5]"
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
          </div>
          <span className="nav-text whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-[-10px] transition-all duration-300 ease-out absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs bg-sidebar-accent px-2 py-1 rounded shadow-lg z-50 pointer-events-none">
            Dashboard
          </span>
        </Link>

        <Link
          href="/transactions"
          className={`group relative flex items-center justify-center p-2 text-sm font-medium transition-all rounded-lg ${
            isActive('/transactions')
              ? 'text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'
          }`}
          aria-current={isActive('/transactions') ? 'page' : undefined}
          title="Transactions"
        >
          <div className={`relative p-2 rounded-lg transition-all ${
            isActive('/transactions')
              ? 'bg-sidebar-accent shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]'
              : 'hover:bg-sidebar-accent/30'
          }`}>
            <svg
              className="w-5 h-5 flex-shrink-0 stroke-[2.5]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>
          <span className="nav-text whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-[-10px] transition-all duration-300 ease-out absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs bg-sidebar-accent px-2 py-1 rounded shadow-lg z-50 pointer-events-none">
            Transactions
          </span>
        </Link>

        <Link
          href="/budgets"
          className={`group relative flex items-center justify-center p-2 text-sm font-medium transition-all rounded-lg ${
            isActive('/budgets')
              ? 'text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'
          }`}
          aria-current={isActive('/budgets') ? 'page' : undefined}
          title="Budgets"
        >
          <div className={`relative p-2 rounded-lg transition-all ${
            isActive('/budgets')
              ? 'bg-sidebar-accent shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]'
              : 'hover:bg-sidebar-accent/30'
          }`}>
            <svg
              className="w-5 h-5 flex-shrink-0 stroke-[2.5]"
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
          </div>
          <span className="nav-text whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-[-10px] transition-all duration-300 ease-out absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs bg-sidebar-accent px-2 py-1 rounded shadow-lg z-50 pointer-events-none">
            Budgets
          </span>
        </Link>

        <Link
          href="/profile"
          className={`group relative flex items-center justify-center p-2 text-sm font-medium transition-all rounded-lg ${
            isActive('/profile')
              ? 'text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:text-sidebar-accent-foreground'
          }`}
          aria-current={isActive('/profile') ? 'page' : undefined}
          title="Profile"
        >
          <div className={`relative p-2 rounded-lg transition-all ${
            isActive('/profile')
              ? 'bg-sidebar-accent shadow-[inset_2px_2px_4px_rgba(0,0,0,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.8)]'
              : 'hover:bg-sidebar-accent/30'
          }`}>
            <svg
              className="w-5 h-5 flex-shrink-0 stroke-[2.5]"
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
          </div>
          <span className="nav-text whitespace-nowrap opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-[-10px] transition-all duration-300 ease-out absolute top-full mt-2 left-1/2 -translate-x-1/2 text-xs bg-sidebar-accent px-2 py-1 rounded shadow-lg z-50 pointer-events-none">
            Profile
          </span>
        </Link>
      </nav>

      {/* Theme Toggle and Sign Out */}
      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  );
};

export default DashboardTopbar;
