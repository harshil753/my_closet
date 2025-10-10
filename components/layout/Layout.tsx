/**
 * Main Layout Component
 * Wraps the application with header, footer, and main content area
 */

import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { SidebarProvider } from './Sidebar';
import { cn } from '@/lib/utils';

/**
 * Layout component props
 */
interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  showSidebar?: boolean;
  fullWidth?: boolean;
}

/**
 * Main layout component
 */
export function Layout({ 
  children, 
  className = '',
  showHeader = true,
  showFooter = true,
  showSidebar = false,
  fullWidth = false
}: LayoutProps) {
  const content = (
    <div className={cn(
      'min-h-screen flex flex-col',
      className
    )}>
      {showHeader && <Header />}
      
      <main className={cn(
        'flex-1',
        fullWidth ? 'w-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
      )}>
        {children}
      </main>
      
      {showFooter && <Footer />}
    </div>
  );

  if (showSidebar) {
    return (
      <SidebarProvider>
        {content}
      </SidebarProvider>
    );
  }

  return content;
}

/**
 * Dashboard layout with sidebar
 */
export function DashboardLayout({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <Layout 
      showHeader={false} 
      showFooter={false} 
      showSidebar={true}
      className={className}
    >
      {children}
    </Layout>
  );
}

/**
 * Auth layout for login/register pages
 */
export function AuthLayout({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <Layout 
      showHeader={false} 
      showFooter={false}
      className={cn('bg-gray-50', className)}
    >
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {children}
        </div>
      </div>
    </Layout>
  );
}

/**
 * Landing page layout
 */
export function LandingLayout({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <Layout 
      className={cn('bg-white', className)}
    >
      {children}
    </Layout>
  );
}

/**
 * Full-width layout for special pages
 */
export function FullWidthLayout({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string; 
}) {
  return (
    <Layout 
      fullWidth={true}
      className={className}
    >
      {children}
    </Layout>
  );
}
