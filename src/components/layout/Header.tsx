import { useState, useEffect } from 'react';
import {
  Menu,
  Building2,
  User as UserIcon,
  LogOut,
  Check,
  ChevronDown,
  Search,
} from 'lucide-react';
import { Breadcrumb } from './Breadcrumb';
import { useAuth } from '../../context/AuthContext';
import { INITIAL_BRANCHES } from '../../database/initial-data';
import type { BreadcrumbItem } from '../../types/navigation';
import { Dropdown } from '../ui/dropdown';
import { InsForgeConnectionBadge } from './InsForgeConnectionBadge';
import { NotificationBellDropdown } from '../notifications/NotificationBellDropdown';

export interface HeaderProps {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (path: string) => void;
  onOpenMobileSidebar: () => void;
  onOpenProfile: () => void;
  onOpenSearch: () => void;
}

export function Header({
  title,
  breadcrumbs,
  onNavigate,
  onOpenMobileSidebar,
  onOpenProfile,
  onOpenSearch,
}: HeaderProps) {
  const { user, logout, switchBranch } = useAuth();

  const currentBranchName = user?.currentBranch?.name || INITIAL_BRANCHES[0].name;

  // Global shortcut (Ctrl+K or Cmd+K) for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 lg:px-8 backdrop-blur-xs">
      {/* Left Area: Mobile Trigger + Breadcrumb / Title */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <button
          id="mobile-sidebar-toggle"
          onClick={onOpenMobileSidebar}
          className="flex lg:hidden h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"
          title="Toggle Navigation Menu"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex flex-col min-w-0">
          <Breadcrumb items={breadcrumbs} onNavigate={onNavigate} className="hidden md:flex" />
          <h2 className="text-sm font-semibold text-slate-900 truncate leading-tight md:mt-0.5">
            {title}
          </h2>
        </div>
      </div>

      {/* Center/Right Area: Global Search Placeholder */}
      <div className="hidden sm:flex items-center justify-center flex-1 max-w-xs md:max-w-md mx-4">
        <button
          id="global-search-trigger"
          onClick={onOpenSearch}
          className="flex w-full items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 text-xs text-slate-500 transition-all hover:border-slate-300"
          title="Search platform modules (Ctrl+K / Cmd+K)"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Search platform modules & settings...</span>
          </div>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-200 bg-white font-mono text-[10px] text-slate-400 shrink-0">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Right Controls: Search icon (mobile), Branch Switcher, Notifications, User Menu */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* InsForge Live Connection Badge */}
        <InsForgeConnectionBadge />

        {/* Mobile Search Trigger */}
        <button
          id="mobile-search-trigger"
          onClick={onOpenSearch}
          className="flex sm:hidden h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
          title="Search (Ctrl+K)"
          aria-label="Open search dialog"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Branch / Facility Switcher */}
        <Dropdown
          align="right"
          trigger={
            <div
              id="branch-switcher-trigger"
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate max-w-[130px]">{currentBranchName}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          }
          items={INITIAL_BRANCHES.map((b) => ({
            id: b.id,
            label: `${b.name} (${b.code})`,
            icon: user?.currentBranch?.id === b.id ? <Check className="w-3.5 h-3.5 text-slate-900" /> : undefined,
            onClick: () => switchBranch(b.id),
          }))}
        />

        {/* Global Live Notification Dropdown */}
        <NotificationBellDropdown onNavigate={onNavigate} />

        {/* User Profile Menu */}
        <Dropdown
          align="right"
          trigger={
            <div
              id="user-profile-menu-trigger"
              className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-semibold shrink-0 shadow-xs">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-900 leading-none truncate max-w-[120px]">
                  {user?.full_name || 'Architect'}
                </span>
                <span className="text-[10px] text-slate-500 leading-tight mt-0.5 capitalize truncate">
                  {user?.roles?.[0]?.name || 'Super Admin'}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
            </div>
          }
          items={[
            {
              id: 'profile-info',
              label: 'User Profile & Identity',
              icon: <UserIcon className="w-3.5 h-3.5 text-slate-600" />,
              onClick: onOpenProfile,
            },
            {
              id: 'org-settings',
              label: 'Organization Settings',
              icon: <Building2 className="w-3.5 h-3.5 text-slate-600" />,
              onClick: () => onNavigate('/settings/organization'),
            },
            {
              id: 'sign-out',
              label: 'Sign Out Session',
              icon: <LogOut className="w-3.5 h-3.5 text-red-600" />,
              destructive: true,
              onClick: () => logout(),
            },
          ]}
        />
      </div>
    </header>
  );
}
