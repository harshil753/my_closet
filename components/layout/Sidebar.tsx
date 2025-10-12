/**
 * Application Sidebar Component
 * Navigation sidebar for dashboard and authenticated areas
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  Shirt,
  Camera,
  Sparkles,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

/**
 * Sidebar item interface
 */
interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: SidebarItem[];
}

/**
 * Sidebar component props
 */
interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

/**
 * Sidebar items configuration
 */
const sidebarItems: SidebarItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    icon: Home,
  },
  {
    id: 'closet',
    label: 'My Closet',
    href: '/closet',
    icon: Shirt,
  },
  {
    id: 'try-on',
    label: 'Virtual Try-On',
    href: '/try-on',
    icon: Camera,
  },
  {
    id: 'upload',
    label: 'Add Items',
    href: '/upload',
    icon: Sparkles,
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/profile',
    icon: User,
  },
];

/**
 * Sidebar component
 */
export function Sidebar({
  className = '',
  isCollapsed = false,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  /**
   * Toggle expanded state for items with children
   */
  const toggleExpanded = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  /**
   * Check if item is active
   */
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  /**
   * Render sidebar item
   */
  const renderSidebarItem = (item: SidebarItem, level: number = 0) => {
    const isItemActive = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);

    return (
      <div key={item.id}>
        <Link
          href={item.href}
          className={cn(
            'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            'hover:bg-gray-100 hover:text-gray-900',
            isItemActive
              ? 'border-r-2 border-blue-700 bg-blue-50 text-blue-700'
              : 'text-gray-700',
            level > 0 && 'ml-6',
            isCollapsed && 'justify-center px-2'
          )}
          title={isCollapsed ? item.label : undefined}
        >
          <item.icon
            className={cn(
              'h-5 w-5 flex-shrink-0',
              isItemActive ? 'text-blue-700' : 'text-gray-500'
            )}
          />

          {!isCollapsed && (
            <>
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    toggleExpanded(item.id);
                  }}
                  className="rounded p-1 hover:bg-gray-200"
                >
                  {isExpanded ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </button>
              )}
            </>
          )}
        </Link>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && !isCollapsed && (
          <div className="mt-1 space-y-1">
            {item.children?.map((child) => renderSidebarItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'flex flex-col border-r border-gray-200 bg-white transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
        )}

        {onToggle && (
          <button
            onClick={onToggle}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {sidebarItems.map((item) => renderSidebarItem(item))}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="border-t border-gray-200 p-4">
          <div className="text-xs text-gray-500">
            <p>My Closet v1.0.0</p>
            <p>© 2025 All rights reserved</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Sidebar provider for managing sidebar state
 */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="flex h-screen">
      <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
