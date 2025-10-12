/**
 * Session Manager Page
 * Development tool to manage active sessions and tier limits
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { useAuth } from '@/lib/auth/auth-context';

interface SessionInfo {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface TierInfo {
  tier: string;
  limits: {
    concurrent_sessions: number;
    clothing_items: number;
    try_ons_per_month: number;
  };
  usage: {
    active_sessions: number;
    clothing_items_used: number;
    try_ons_this_month: number;
  };
}

export default function SessionManagerPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load session and tier information
  const loadData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Load active sessions only (pending and processing)
      const sessionsResponse = await fetch('/api/try-on/sessions');
      const sessionsData = await sessionsResponse.json();
      const allSessions = sessionsData.sessions || [];
      // Filter to only show active sessions (pending or processing)
      const activeSessions = allSessions.filter(
        (session: any) =>
          session.status === 'pending' || session.status === 'processing'
      );
      setSessions(activeSessions);

      // Load tier information
      const tierResponse = await fetch('/api/user/tier-status');
      const tierData = await tierResponse.json();
      setTierInfo(tierData);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load session and tier information');
    } finally {
      setLoading(false);
    }
  };

  // Clear all active sessions
  const clearSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/dev/clear-sessions', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        await loadData(); // Reload data
      } else {
        setError(result.error || 'Failed to clear sessions');
      }
    } catch (err) {
      console.error('Error clearing sessions:', err);
      setError('Failed to clear sessions');
    } finally {
      setLoading(false);
    }
  };

  // Force clear ALL sessions (including hidden ones)
  const forceClearSessions = async () => {
    if (
      !confirm(
        'This will force clear ALL sessions, including any hidden ones. Continue?'
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/dev/force-clear-sessions', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        await loadData(); // Reload data
      } else {
        setError(result.error || 'Failed to force clear sessions');
      }
    } catch (err) {
      console.error('Error force clearing sessions:', err);
      setError('Failed to force clear sessions');
    } finally {
      setLoading(false);
    }
  };

  // Nuclear clear - uses admin client as backup
  const nuclearClearSessions = async () => {
    if (
      !confirm(
        'NUCLEAR CLEAR: This will use admin privileges to clear ALL sessions. Continue?'
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/dev/nuclear-clear', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        await loadData(); // Reload data
      } else {
        setError(result.error || 'Failed to nuclear clear sessions');
      }
    } catch (err) {
      console.error('Error nuclear clearing sessions:', err);
      setError('Failed to nuclear clear sessions');
    } finally {
      setLoading(false);
    }
  };

  // Direct DB fix - most aggressive approach
  const directDbFix = async () => {
    if (
      !confirm(
        'DIRECT DB FIX: This will attempt multiple aggressive approaches to clear sessions. Continue?'
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/dev/direct-db-fix', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        await loadData(); // Reload data
      } else {
        setError(result.error || 'Failed to direct DB fix');
      }
    } catch (err) {
      console.error('Error direct DB fix:', err);
      setError('Failed to direct DB fix');
    } finally {
      setLoading(false);
    }
  };

  // Auto cleanup sessions - keeps only the most recent session
  const autoCleanupSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/dev/auto-cleanup-sessions', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(result.message);
        await loadData(); // Reload data
      } else {
        setError(result.error || 'Failed to auto cleanup sessions');
      }
    } catch (err) {
      console.error('Error auto cleanup sessions:', err);
      setError('Failed to auto cleanup sessions');
    } finally {
      setLoading(false);
    }
  };

  // Debug a specific session
  const debugSession = async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/dev/debug-session?sessionId=${sessionId}`
      );
      const result = await response.json();

      if (result.success) {
        console.log('Session debug info:', result);
        setSuccess(`Session ${sessionId} debug info logged to console`);
      } else {
        setError(result.error || 'Failed to debug session');
      }
    } catch (err) {
      console.error('Error debugging session:', err);
      setError('Failed to debug session');
    } finally {
      setLoading(false);
    }
  };

  // Check all sessions across all instances
  const checkAllSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/dev/check-all-sessions');
      const result = await response.json();

      if (result.success) {
        console.log('All sessions across instances:', result);
        setSuccess(
          `Found ${result.totalSessions} total sessions, ${result.activeSessions} active`
        );

        // Show detailed breakdown
        alert(`Session Breakdown:
- Pending: ${result.sessionsByStatus.pending}
- Processing: ${result.sessionsByStatus.processing}
- Completed: ${result.sessionsByStatus.completed}
- Failed: ${result.sessionsByStatus.failed}
- Other: ${result.sessionsByStatus.other}

This includes sessions from BOTH local and Vercel instances!`);
      } else {
        setError(result.error || 'Failed to check all sessions');
      }
    } catch (err) {
      console.error('Error checking all sessions:', err);
      setError('Failed to check all sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  if (!user) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Alert variant="destructive">
          You must be logged in to access this page.
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Session Manager</h1>
        <p className="text-gray-600">
          Manage your active sessions and view tier limits
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
          {success}
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="md" />
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.length === 0 ? (
                  <p className="text-gray-500">No active sessions found</p>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                      >
                        <div className="flex-1">
                          <p className="font-medium">
                            Session {session.id.slice(0, 8)}...
                          </p>
                          <p className="text-sm text-gray-600">
                            Status:{' '}
                            <span className="capitalize">{session.status}</span>
                          </p>
                          <p className="text-xs text-gray-500">
                            Created:{' '}
                            {new Date(session.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          onClick={() => debugSession(session.id)}
                          variant="outline"
                          size="sm"
                          disabled={loading}
                        >
                          🔍 Debug
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {sessions.length > 0 && (
                  <Button
                    onClick={clearSessions}
                    variant="destructive"
                    className="w-full"
                    disabled={loading}
                  >
                    Clear All Active Sessions
                  </Button>
                )}

                {/* Force clear button - always visible */}
                <Button
                  onClick={forceClearSessions}
                  variant="outline"
                  className="mt-2 w-full"
                  disabled={loading}
                >
                  Force Clear ALL Sessions
                </Button>

                {/* Nuclear clear button - backup option */}
                <Button
                  onClick={nuclearClearSessions}
                  variant="destructive"
                  className="mt-2 w-full"
                  disabled={loading}
                >
                  🚨 NUCLEAR CLEAR (Admin)
                </Button>

                {/* Direct DB fix button - most aggressive */}
                <Button
                  onClick={directDbFix}
                  variant="destructive"
                  className="mt-2 w-full"
                  disabled={loading}
                >
                  🔥 DIRECT DB FIX (Delete All)
                </Button>

                {/* Check all sessions button - diagnostic */}
                <Button
                  onClick={checkAllSessions}
                  variant="outline"
                  className="mt-2 w-full"
                  disabled={loading}
                >
                  🔍 CHECK ALL SESSIONS (Local + Vercel)
                </Button>

                {/* Auto cleanup button - smart session management */}
                <Button
                  onClick={autoCleanupSessions}
                  variant="outline"
                  className="mt-2 w-full"
                  disabled={loading}
                >
                  🧹 AUTO CLEANUP (Keep Latest Only)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tier Information */}
        <Card>
          <CardHeader>
            <CardTitle>Tier Information</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="md" />
              </div>
            ) : tierInfo ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium capitalize">
                    {tierInfo.tier || 'Unknown'} Tier
                  </h3>
                </div>

                {tierInfo.usage && tierInfo.limits ? (
                  <div className="space-y-3">
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Concurrent Sessions
                        </span>
                        <span className="text-sm text-gray-600">
                          {tierInfo.usage.active_sessions || 0} /{' '}
                          {tierInfo.limits.concurrent_sessions || 0}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-blue-600"
                          style={{
                            width: `${Math.min(100, ((tierInfo.usage.active_sessions || 0) / (tierInfo.limits.concurrent_sessions || 1)) * 100)}%`,
                          }}
                        ></div>
                      </div>
                      {(tierInfo.usage.active_sessions || 0) >=
                        (tierInfo.limits.concurrent_sessions || 1) && (
                        <p className="mt-1 text-sm text-red-600">
                          ⚠️ Limit reached! Clear sessions or upgrade to
                          continue.
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Clothing Items
                        </span>
                        <span className="text-sm text-gray-600">
                          {tierInfo.usage.clothing_items_used || 0} /{' '}
                          {tierInfo.limits.clothing_items || 0}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-green-600"
                          style={{
                            width: `${Math.min(100, ((tierInfo.usage.clothing_items_used || 0) / (tierInfo.limits.clothing_items || 1)) * 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Try-ons This Month
                        </span>
                        <span className="text-sm text-gray-600">
                          {tierInfo.usage.try_ons_this_month || 0} /{' '}
                          {tierInfo.limits.try_ons_per_month || 0}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-purple-600"
                          style={{
                            width: `${Math.min(100, ((tierInfo.usage.try_ons_this_month || 0) / (tierInfo.limits.try_ons_per_month || 1)) * 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Usage data not available</p>
                )}

                {tierInfo.tier === 'free' && (
                  <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <h4 className="mb-2 font-medium text-blue-900">
                      Upgrade to Premium
                    </h4>
                    <p className="mb-3 text-sm text-blue-800">
                      Get 3 concurrent sessions, 1000 clothing items, and 1000
                      try-ons per month.
                    </p>
                    <Button
                      onClick={() => (window.location.href = '/upgrade')}
                      className="w-full"
                    >
                      Upgrade Now
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Failed to load tier information</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Button onClick={loadData} variant="outline" disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Data'}
        </Button>
      </div>
    </div>
  );
}
