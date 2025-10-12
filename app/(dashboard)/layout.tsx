/**
 * Dashboard Layout
 * Provides sidebar navigation for all dashboard pages
 */

'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <h1 className="text-lg font-semibold text-gray-900">My Closet</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMobileMenu}
          className="p-2"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="bg-opacity-50 fixed inset-0 z-40 bg-black lg:hidden"
          onClick={toggleMobileMenu}
        />
      )}

      {/* Sidebar - Desktop & Mobile */}
      <div
        className={`fixed z-40 h-full transition-transform duration-300 ease-in-out lg:relative ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="h-full">{children}</div>
      </main>
    </div>
  );
}
