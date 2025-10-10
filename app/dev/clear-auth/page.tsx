/**
 * Development Utility - Clear Auth Data
 *
 * This page helps clear cached authentication data for testing
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import {
  clearAuthData,
  signOutAndClear,
  clearAuthAndReload,
} from '@/lib/auth/clear-auth';

export default function ClearAuthPage() {
  const [message, setMessage] = useState('');

  const handleClearData = () => {
    clearAuthData();
    setMessage('Authentication data cleared from browser storage');
  };

  const handleSignOutAndClear = async () => {
    await signOutAndClear();
    setMessage('Signed out and cleared all authentication data');
  };

  const handleClearAndReload = () => {
    clearAuthAndReload();
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Clear Authentication Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && <Alert>{message}</Alert>}

          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-lg font-semibold">
                Clear Browser Storage
              </h3>
              <p className="mb-3 text-sm text-gray-600">
                Clears Supabase auth data from localStorage and sessionStorage
              </p>
              <Button onClick={handleClearData} variant="outline">
                Clear Auth Data
              </Button>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold">Sign Out & Clear</h3>
              <p className="mb-3 text-sm text-gray-600">
                Signs out from Supabase and clears all local auth data
              </p>
              <Button onClick={handleSignOutAndClear} variant="outline">
                Sign Out & Clear
              </Button>
            </div>

            <div>
              <h3 className="mb-2 text-lg font-semibold">Clear & Reload</h3>
              <p className="mb-3 text-sm text-gray-600">
                Clears auth data and reloads the page (recommended for testing)
              </p>
              <Button onClick={handleClearAndReload} variant="default">
                Clear & Reload Page
              </Button>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <h4 className="mb-2 font-semibold">Testing Instructions:</h4>
            <ol className="list-inside list-decimal space-y-1 text-sm">
              <li>Click &quot;Clear & Reload Page&quot; to start fresh</li>
              <li>
                Go to <code>/register</code> to create a new account
              </li>
              <li>
                Check your Supabase dashboard to verify the user record was
                created
              </li>
              <li>Use this page again to clear data for the next test</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
