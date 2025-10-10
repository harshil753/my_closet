/**
 * Application Header Component
 * Main navigation header with user authentication and navigation
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Menu, MenuItem } from '@/components/ui/Menu';
import { Logo } from '@/components/ui/Logo';
import { 
  User, 
  Settings, 
  LogOut, 
  Menu as MenuIcon,
  X,
  Home,
  Shirt,
  Camera,
  Sparkles
} from 'lucide-react';

/**
 * Header component props
 */
interface HeaderProps {
  className?: string;
}

/**
 * Main header component
 */
export function Header({ className = '' }: HeaderProps) {
  const { user, loading, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  /**
   * Handle user sign out
   */
  const handleSignOut = async () => {
    try {
      await signOut();
      setIsUserMenuOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  /**
   * Toggle mobile menu
   */
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  /**
   * Close mobile menu
   */
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Logo className="h-8 w-8" />
              <span className="text-xl font-bold text-gray-900">
                My Closet
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
            
            {user && (
              <>
                <Link 
                  href="/closet" 
                  className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <Shirt className="h-4 w-4" />
                  <span>My Closet</span>
                </Link>
                
                <Link 
                  href="/try-on" 
                  className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  <span>Try On</span>
                </Link>
                
                <Link 
                  href="/upload" 
                  className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Add Items</span>
                </Link>
              </>
            )}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {loading ? (
              <div className="animate-pulse bg-gray-200 h-8 w-8 rounded-full" />
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <Avatar 
                    src={user.user_metadata?.avatar_url} 
                    alt={user.user_metadata?.display_name || 'User'}
                    size="sm"
                  />
                  <span className="hidden sm:block text-sm font-medium">
                    {user.user_metadata?.display_name || 'User'}
                  </span>
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <Menu
                    isOpen={isUserMenuOpen}
                    onClose={() => setIsUserMenuOpen(false)}
                    className="absolute right-0 mt-2 w-48"
                  >
                    <MenuItem
                      icon={<User className="h-4 w-4" />}
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        // Navigate to profile
                      }}
                    >
                      Profile
                    </MenuItem>
                    
                    <MenuItem
                      icon={<Settings className="h-4 w-4" />}
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        // Navigate to settings
                      }}
                    >
                      Settings
                    </MenuItem>
                    
                    <div className="border-t border-gray-200" />
                    
                    <MenuItem
                      icon={<LogOut className="h-4 w-4" />}
                      onClick={handleSignOut}
                      className="text-red-600 hover:text-red-700"
                    >
                      Sign Out
                    </MenuItem>
                  </Menu>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <MenuIcon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="flex flex-col space-y-4">
              <Link 
                href="/" 
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
                onClick={closeMobileMenu}
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Link>
              
              {user && (
                <>
                  <Link 
                    href="/closet" 
                    className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
                    onClick={closeMobileMenu}
                  >
                    <Shirt className="h-4 w-4" />
                    <span>My Closet</span>
                  </Link>
                  
                  <Link 
                    href="/try-on" 
                    className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
                    onClick={closeMobileMenu}
                  >
                    <Camera className="h-4 w-4" />
                    <span>Try On</span>
                  </Link>
                  
                  <Link 
                    href="/upload" 
                    className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
                    onClick={closeMobileMenu}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Add Items</span>
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
