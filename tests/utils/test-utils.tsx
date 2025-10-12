/**
 * Test Utilities
 *
 * Custom render functions and utilities for testing React components
 * with proper context providers
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Mock AuthProvider for testing
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const mockAuthContext = {
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn(),
  };

  // Create a mock context
  return <>{children}</>;
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withAuth?: boolean;
}

/**
 * Custom render function that wraps components with necessary providers
 */
export function customRender(ui: ReactElement, options?: CustomRenderOptions) {
  const { withAuth = true, ...renderOptions } = options || {};

  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (withAuth) {
      return <MockAuthProvider>{children}</MockAuthProvider>;
    }
    return <>{children}</>;
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from testing library
export * from '@testing-library/react';

// Override the default render with our custom render
export { customRender as render };
