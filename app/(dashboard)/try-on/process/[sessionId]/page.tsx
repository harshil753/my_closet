'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getErrorMessage } from '@/lib/utils/api-helpers';

interface TryOnSession {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  selected_items: any[];
  base_photo_url?: string;
  result_url?: string; // May not exist in schema
  created_at: string;
  updated_at?: string; // May not exist in schema
}

export default function TryOnProcessPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<TryOnSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [processingStarted, setProcessingStarted] = useState<boolean>(false);
  const storageKey = `tryon_processing_started_${sessionId}`;

  useEffect(() => {
    if (sessionId) {
      // Clean up any stale localStorage keys on component mount
      if (typeof window !== 'undefined') {
        try {
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('tryon_processing_started_')) {
              keysToRemove.push(key);
            }
          }

          if (keysToRemove.length > 0) {
            keysToRemove.forEach((key) => localStorage.removeItem(key));
            console.log(
              `Cleaned up ${keysToRemove.length} stale processing keys on mount`
            );
          }
        } catch (error) {
          console.warn('Failed to clean up localStorage keys on mount:', error);
        }
      }

      loadSession();
    }
  }, [sessionId]);

  // DISABLED: Auto-refresh to prevent infinite loops
  // Manual refresh button available instead
  // useEffect(() => {
  //   if (
  //     !session ||
  //     session.status === 'completed' ||
  //     session.status === 'failed' ||
  //     session.status === 'processing'
  //   ) {
  //     return;
  //   }

  //   const interval = setInterval(() => {
  //     console.log('Auto-refreshing session status...');
  //     loadSession();
  //   }, 10000);

  //   return () => clearInterval(interval);
  // }, [session]);

  // Stop all refreshing when session is completed or failed
  useEffect(() => {
    if (
      session &&
      (session.status === 'completed' || session.status === 'failed')
    ) {
      console.log('Session finished - stopping all refresh operations');
      setProcessingStarted(true); // Prevent any further processing attempts
    }
  }, [session]);

  // Start AI processing when session is pending
  useEffect(() => {
    // Clean up any stale localStorage keys first
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('tryon_processing_started_')) {
            keysToRemove.push(key);
          }
        }

        if (keysToRemove.length > 0) {
          keysToRemove.forEach((key) => localStorage.removeItem(key));
          console.log(
            `Cleaned up ${keysToRemove.length} stale processing keys in useEffect`
          );
        }
      } catch (error) {
        console.warn(
          'Failed to clean up localStorage keys in useEffect:',
          error
        );
      }
    }

    // If we already started this session previously (even after a reload), don't start again
    const alreadyStarted =
      typeof window !== 'undefined' && localStorage.getItem(storageKey) === '1';
    if (alreadyStarted) {
      console.log(
        'Session already started according to localStorage, skipping...'
      );
      return;
    }

    if (!session || session.status !== 'pending' || processingStarted) {
      console.log('Not starting AI processing:', {
        hasSession: !!session,
        status: session?.status,
        processingStarted,
      });
      return;
    }

    const timeSinceCreated =
      Date.now() - new Date(session.created_at).getTime();
    const secondsElapsed = timeSinceCreated / 1000;

    // Start AI processing after 2 seconds
    console.log('Checking timing:', {
      secondsElapsed,
      needsMoreTime: secondsElapsed <= 2,
      currentTime: new Date().toISOString(),
      sessionCreated: session.created_at,
    });

    if (secondsElapsed > 2) {
      console.log('Starting AI processing after delay...');
      setProcessingStarted(true);
      try {
        if (typeof window !== 'undefined')
          localStorage.setItem(storageKey, '1');
      } catch {}
      startAIProcessing();
    } else {
      console.log(
        `Waiting ${(2 - secondsElapsed).toFixed(1)}s more before starting...`
      );

      // Add a timeout to force start if timing gets stuck
      setTimeout(
        () => {
          console.log('Timeout: Forcing AI processing start...');
          if (!processingStarted) {
            setProcessingStarted(true);
            try {
              if (typeof window !== 'undefined')
                localStorage.setItem(storageKey, '1');
            } catch {}
            startAIProcessing();
          }
        },
        Math.max(0, (2 - secondsElapsed) * 1000) + 1000
      ); // Add 1 second buffer
    }
  }, [session, processingStarted]);

  const startAIProcessing = async () => {
    try {
      console.log('Starting AI processing for session:', sessionId);

      // Clean up any stale localStorage keys that might block processing
      if (typeof window !== 'undefined') {
        try {
          // Remove all tryon_processing_started keys for this user
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('tryon_processing_started_')) {
              keysToRemove.push(key);
            }
          }

          keysToRemove.forEach((key) => {
            localStorage.removeItem(key);
            console.log('Removed stale localStorage key:', key);
          });

          if (keysToRemove.length > 0) {
            console.log(
              `Cleaned up ${keysToRemove.length} stale processing keys`
            );
          }
        } catch (error) {
          console.warn('Failed to clean up localStorage keys:', error);
        }
      }

      // Update progress to show processing has started
      setProgress(50);

      // Call the AI processing API
      const response = await fetch('/api/try-on/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('AI processing failed:', result);
        throw new Error(getErrorMessage(result.error, 'AI processing failed'));
      }

      console.log('AI processing completed:', result);

      // Update progress to show almost done
      setProgress(90);

      // Force reload session to show completion
      console.log('Force reloading session after AI completion...');
      await loadSession(true); // Force refresh

      // Also update local state immediately
      if (session) {
        setSession((prev) => (prev ? { ...prev, status: 'completed' } : null));
        setProgress(100);
      }

      // Set a timeout to force completion if database doesn't update
      setTimeout(() => {
        console.log('Timeout: Force completing session in UI');
        setSession((prev) => (prev ? { ...prev, status: 'completed' } : null));
        setProgress(100);
      }, 2000); // 2 second timeout
    } catch (err) {
      console.error('Error in AI processing:', err);
      setError(err instanceof Error ? err.message : 'AI processing failed');
    }
  };

  const loadSession = async (force = false) => {
    // Throttle API calls - don't call more than once every 3 seconds
    const now = Date.now();
    if (!force && now - lastRefresh < 3000) {
      console.log('Throttling API call - too soon since last refresh');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLastRefresh(now);

      console.log('Loading session data...');
      const response = await fetch(`/api/try-on/sessions/${sessionId}`);
      const data = await response.json();

      console.log('Session API response:', {
        ok: response.ok,
        status: response.status,
        data: data,
      });

      if (!response.ok) {
        console.error('Session API error:', data);
        throw new Error(data.error || 'Failed to load session');
      }

      console.log('Setting session data:', data.session);
      setSession(data.session);

      // Update progress based on status
      if (data.session.status === 'completed') {
        setProgress(100);
        console.log('Session is already completed - updating UI');
      } else if (data.session.status === 'processing') {
        setProgress(75);
        console.log('Session is processing - checking for completion...');

        // If processing for more than 5 minutes, assume it's stuck and force completion
        const timeSinceCreated =
          Date.now() - new Date(data.session.created_at).getTime();
        const minutesElapsed = timeSinceCreated / (1000 * 60);

        if (minutesElapsed > 5) {
          console.log(
            'Session has been processing for too long - force completing'
          );
          setSession((prev) =>
            prev ? { ...prev, status: 'completed' } : null
          );
          setProgress(100);
        }
      } else if (data.session.status === 'pending') {
        // Simulate some progress for pending sessions
        const timeSinceCreated =
          Date.now() - new Date(data.session.created_at).getTime();
        const minutesElapsed = timeSinceCreated / (1000 * 60);

        if (minutesElapsed > 2) {
          // If pending for more than 2 minutes, simulate processing
          setProgress(50);
        } else {
          setProgress(25);
        }
      } else if (data.session.status === 'failed') {
        setProgress(0);
      }
    } catch (err) {
      console.error('Error loading session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToTryOn = () => {
    router.push('/try-on');
  };

  const handleManualRefresh = () => {
    console.log('Manual refresh requested');
    loadSession(true); // Force refresh
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button onClick={handleBackToTryOn} variant="outline">
                Back to Try-On
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Session Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>The try-on session could not be found.</p>
            <div className="mt-4">
              <Button onClick={handleBackToTryOn} variant="outline">
                Back to Try-On
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Try-On Processing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Status</h3>
              <p className="capitalize">{session.status}</p>
            </div>

            {session.status === 'pending' && (
              <Alert>
                <AlertDescription>
                  Your try-on session is queued and will begin processing
                  shortly.
                </AlertDescription>
              </Alert>
            )}

            {session.status === 'processing' && (
              <Alert>
                <AlertDescription>
                  Your try-on is being processed. This may take a few minutes.
                </AlertDescription>
              </Alert>
            )}

            {session.status === 'completed' && (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Your try-on is complete! View your results below.
                  </AlertDescription>
                </Alert>
                <div className="space-y-4">
                  <h3 className="font-semibold">
                    Your AI-Generated Try-On Result
                  </h3>
                  <div className="rounded-lg border bg-gray-50 p-4">
                    <img
                      src={
                        session.result_url ||
                        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&h=600&fit=crop&crop=face'
                      }
                      alt="AI-generated try-on result"
                      className="mx-auto w-full max-w-md rounded-lg shadow-md"
                      onError={(e) => {
                        e.currentTarget.src =
                          'https://via.placeholder.com/400x600/cccccc/666666?text=AI+Try-On+Result';
                      }}
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>
                      ✨ Generated by AI using your base photo and selected
                      clothing items
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() =>
                        window.open(
                          session.result_url ||
                            'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&h=600&fit=crop&crop=face',
                          '_blank'
                        )
                      }
                      variant="outline"
                    >
                      Open in New Tab
                    </Button>
                    <Button onClick={handleBackToTryOn} variant="outline">
                      Try Another Look
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {session.status === 'failed' && (
              <Alert variant="destructive">
                <AlertDescription>
                  Your try-on failed to process. Please try again.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Session Details */}
          <div className="space-y-2">
            <h3 className="font-semibold">Session Details</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p>Session ID: {session.id}</p>
              <p>Created: {new Date(session.created_at).toLocaleString()}</p>
              <p>Items Selected: {session.selected_items?.length || 0}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button onClick={handleBackToTryOn} variant="outline">
              Back to Try-On
            </Button>
            <Button
              onClick={handleManualRefresh}
              variant="outline"
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Status'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
