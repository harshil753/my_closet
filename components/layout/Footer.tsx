/**
 * Application Footer Component
 * Site footer with links, legal information, and social media
 */

import React from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { 
  Github, 
  Twitter, 
  Mail, 
  Heart,
  ExternalLink
} from 'lucide-react';

/**
 * Footer component props
 */
interface FooterProps {
  className?: string;
}

/**
 * Footer component
 */
export function Footer({ className = '' }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`bg-gray-50 border-t border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand and Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Logo className="h-8 w-8" />
              <span className="text-xl font-bold text-gray-900">
                My Closet
              </span>
            </div>
            <p className="text-gray-600 mb-4 max-w-md">
              AI-powered virtual try-on for your digital wardrobe. 
              Upload your clothes and see how they look on you with 
              the power of artificial intelligence.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="mailto:support@mycloset.com"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/features" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link 
                  href="/pricing" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link 
                  href="/demo" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Demo
                </Link>
              </li>
              <li>
                <Link 
                  href="/api" 
                  className="text-gray-600 hover:text-gray-900 transition-colors flex items-center"
                >
                  API
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Support
            </h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/help" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link 
                  href="/docs" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/status" 
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Status
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <Link 
                href="/privacy" 
                className="hover:text-gray-900 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link 
                href="/terms" 
                className="hover:text-gray-900 transition-colors"
              >
                Terms of Service
              </Link>
              <Link 
                href="/cookies" 
                className="hover:text-gray-900 transition-colors"
              >
                Cookie Policy
              </Link>
            </div>
            
            <div className="mt-4 md:mt-0 flex items-center space-x-1 text-sm text-gray-600">
              <span>Made with</span>
              <Heart className="h-4 w-4 text-red-500" />
              <span>by the My Closet team</span>
            </div>
          </div>
          
          <div className="mt-4 text-center text-sm text-gray-500">
            © {currentYear} My Closet. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
