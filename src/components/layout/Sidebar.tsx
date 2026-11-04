import React, { useState, useEffect, useMemo } from 'react';
import { NAVIGATION_ITEMS, filterNavigationForUser } from '../../config/navigation';
import type { NavItem, NavChild } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Briefcase,
  Megaphone,
  ShoppingBag,
  Factory,
  Truck,
  Landmark,
  Users,
  UserCheck,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Tooltip } from '../ui/tooltip';

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-4 h-4" />,
  Briefcase: <Briefcase className="w-4 h-4" />,
  Megaphone: <Megaphone className="w-4 h-4" />,
  UserCheck: <UserCheck className="w-4 h-4" />,
  ShoppingBag: <ShoppingBag className="w-4 h-4" />,
  Factory: <Factory className="w-4 h-4" />,
  Truck: <Truck className="w-4 h-4" />,
  Landmark: <Landmark className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
  Settings: <Settings className="w-4 h-4" />,
};

export interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  currentPath,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const { user } = useAuth();

  // Dynamically compute permitted navigation hierarchy
  const visibleNavigationItems = useMemo(() => {
    return filterNavigationForUser(NAVIGATION_ITEMS, user);
  }, [user]);

  // Track open accordion groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const item of NAVIGATION_ITEMS) {
      if (item.children) {
        // Auto-expand if current route belongs to this group
        const isChildActive =
          currentPath.startsWith(item.path) ||
          item.children.some((c) => currentPath.startsWith(c.path));
        if (isChildActive) {
          initial[item.id] = true;
        }
      }
    }
    return initial;
  });

  // Automatically expand group when navigating to a route inside it
  useEffect(() => {
    for (const item of visibleNavigationItems) {
      if (item.children) {
        const isChildActive =
          currentPath.startsWith(item.path) ||
          item.children.some((c) => currentPath.startsWith(c.path));
        if (isChildActive) {
          setOpenGroups((prev) => ({ ...prev, [item.id]: true }));
        }
      }
    }
  }, [currentPath, visibleNavigationItems]);

  const toggleGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNavigate = (path: string) => {
    onNavigate(path);
    if (isMobileOpen) {
      onCloseMobile();
    }
  };

  const renderSubItem = (child: NavChild, depth = 1) => {
    const isExactActive = currentPath === child.path;
    const hasChildren = Boolean(child.children && child.children.length > 0);
    const isChildGroupOpen = Boolean(openGroups[child.id]);

    return (
      <div key={child.id} className="space-y-0.5">
        <button
          id={`nav-child-${child.id}`}
          onClick={(e) => {
            if (hasChildren) {
              toggleGroup(child.id, e);
            } else {
              handleNavigate(child.path);
            }
          }}
          className={cn(
            'flex w-full items-center justify-between py-1.5 px-2 rounded-md text-xs transition-colors group text-left',
            depth === 1 ? 'pl-7' : 'pl-9',
            isExactActive
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0 transition-colors',
                isExactActive ? 'bg-white' : 'bg-slate-600 group-hover:bg-slate-400'
              )}
            />
            <span className="truncate">{child.title}</span>
          </div>

          {hasChildren && (
            <span
              onClick={(e) => toggleGroup(child.id, e)}
              className="p-0.5 rounded text-slate-500 hover:text-slate-300"
            >
              <ChevronDown
                className={cn(
                  'w-3 h-3 transition-transform duration-200',
                  isChildGroupOpen && 'rotate-180'
                )}
              />
            </span>
          )}
        </button>

        {/* 3rd Level Nested Children (e.g. Marketplaces -> Amazon, Flipkart, Myntra) */}
        {hasChildren && isChildGroupOpen && (
          <div className="space-y-0.5 pt-0.5 border-l border-slate-800 ml-7 pl-1">
            {child.children?.map((subChild) => {
              const isSubActive = currentPath === subChild.path;
              return (
                <button
                  key={subChild.id}
                  id={`nav-subchild-${subChild.id}`}
                  onClick={() => handleNavigate(subChild.path)}
                  className={cn(
                    'flex w-full items-center gap-2 py-1 px-2.5 rounded-md text-[11px] transition-colors text-left',
                    isSubActive
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                  )}
                >
                  <span
                    className={cn(
                      'w-1 h-1 rounded-full shrink-0',
                      isSubActive ? 'bg-white' : 'bg-slate-600'
                    )}
                  />
                  <span className="truncate">{subChild.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Element */}
      <aside
        id="app-sidebar"
        aria-label="Sidebar Navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-900 text-slate-200 border-r border-slate-800/90 transition-all duration-300 ease-in-out lg:static shrink-0 select-none',
          isCollapsed ? 'lg:w-16' : 'lg:w-64',
          isMobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between px-3.5 border-b border-slate-800/90">
          <div
            onClick={() => handleNavigate('/command-center')}
            className="flex items-center gap-2.5 overflow-hidden cursor-pointer"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-900 shrink-0 font-bold tracking-tight text-base shadow-xs">
              J
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col truncate">
                <span className="font-semibold text-sm tracking-tight text-white leading-none">
                  Jyotsvan
                </span>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5 uppercase">
                  Enterprise Core
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle Button */}
          <button
            id="sidebar-collapse-toggle"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
            className="hidden lg:flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Phase Indicator Ribbon */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="mx-3 my-2 px-2.5 py-1.5 rounded-md bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium text-slate-300">Phase 2 Shell Active</span>
            </div>
            <span className="text-[9px] text-slate-400 font-mono uppercase bg-slate-700/80 px-1.5 py-0.5 rounded">
              Ready
            </span>
          </div>
        )}

        {/* Scrollable Navigation Tree */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
          {(!isCollapsed || isMobileOpen) && (
            <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Enterprise Domains
            </div>
          )}

          {visibleNavigationItems.map((item: NavItem) => {
            const hasChildren = Boolean(item.children && item.children.length > 0);
            const isGroupOpen = Boolean(openGroups[item.id]);
            const isExactActive = currentPath === item.path;
            const isChildActive = Boolean(
              item.children?.some(
                (c) => currentPath === c.path || c.children?.some((sub) => currentPath === sub.path)
              )
            );
            const isActive = isExactActive || isChildActive;
            const icon = ICON_MAP[item.iconName] || <Layers className="w-4 h-4" />;

            // Render Collapsed Version (Icon-only with Tooltip)
            if (isCollapsed && !isMobileOpen) {
              return (
                <Tooltip
                  key={item.id}
                  content={`${item.title} — ${item.plannedPhase}`}
                  position="right"
                >
                  <button
                    id={`nav-collapsed-${item.id}`}
                    onClick={() => {
                      // Navigate to primary route or first child
                      const target = item.children?.[0]?.path || item.path;
                      handleNavigate(target);
                    }}
                    className={cn(
                      'flex h-10 w-full items-center justify-center rounded-md transition-colors relative group',
                      isActive
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-white rounded-r-full" />
                    )}
                    {icon}
                  </button>
                </Tooltip>
              );
            }

            // Expanded Version (Supports Accordion Submodules)
            return (
              <div key={item.id} className="space-y-0.5">
                <button
                  id={`nav-item-${item.id}`}
                  onClick={(e) => {
                    if (hasChildren) {
                      toggleGroup(item.id, e);
                      // If not navigating into a child yet, navigate to the parent route or first child
                      if (!isActive) {
                        handleNavigate(item.path);
                      }
                    } else {
                      handleNavigate(item.path);
                    }
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-all group relative text-left',
                    isActive
                      ? 'bg-slate-800 text-white font-semibold shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  )}
                >
                  {/* Active Indicator Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-white rounded-r-full" />
                  )}

                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={cn(
                        'shrink-0 flex items-center justify-center transition-colors',
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                      )}
                    >
                      {icon}
                    </span>
                    <span className="truncate">{item.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    {hasChildren && (
                      <span
                        onClick={(e) => toggleGroup(item.id, e)}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-200"
                        title={isGroupOpen ? 'Collapse submodules' : 'Expand submodules'}
                      >
                        <ChevronDown
                          className={cn(
                            'w-3.5 h-3.5 transition-transform duration-200',
                            isGroupOpen && 'rotate-180'
                          )}
                        />
                      </span>
                    )}
                  </div>
                </button>

                {/* Submenu Accordion */}
                {hasChildren && isGroupOpen && (
                  <div className="space-y-0.5 pt-0.5 border-l border-slate-800/80 ml-4 pl-1 animate-in fade-in-0 duration-150">
                    {item.children?.map((child) => renderSubItem(child, 1))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer System Badge */}
        <div className="p-3 border-t border-slate-800/90 bg-slate-950/40">
          {(!isCollapsed || isMobileOpen) ? (
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <div className="flex items-center gap-1.5 truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Modular Monolith</span>
              </div>
              <span className="font-mono text-[9px] bg-slate-800 px-1 py-0.5 rounded text-slate-400">
                v1.2
              </span>
            </div>
          ) : (
            <div className="flex justify-center text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
