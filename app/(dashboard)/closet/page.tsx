/**
 * Closet Page
 *
 * This page displays the user's virtual closet with all their clothing items.
 * It provides filtering, sorting, and organization capabilities, along with
 * quick actions for uploading new items and starting try-on sessions.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { Modal } from '@/components/ui/modal';
import { ClosetView } from '@/components/features/closet/ClosetView';
import { useAuth } from '@/lib/auth/auth-context';
import { ClothingCategory } from '@/lib/types/common';
import { useSessionCleanup } from '@/lib/hooks/useSessionCleanup';

// Clothing item interface
interface ClothingItem {
  id: string;
  name: string;
  category: ClothingCategory;
  image_url: string;
  thumbnail_url: string;
  uploaded_at: string;
  is_active: boolean;
  metadata: {
    color?: string;
    brand?: string;
    size?: string;
    notes?: string;
  };
}

// Quick stats interface
interface ClosetStats {
  totalItems: number;
  categoryCounts: Record<string, number>;
  recentItems: ClothingItem[];
  favoriteItems: ClothingItem[];
  shirtsTopsCount: number;
}

/**
 * Main closet page component
 */
export default function ClosetPage() {
  // Authentication and navigation
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { checkAndCleanup } = useSessionCleanup();

  // State management
  const [closetStats, setClosetStats] = useState<ClosetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(false);

  /**
   * Load closet statistics and data
   */
  const loadClosetData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/closet/stats?user_id=${user?.id}`);
      const result = await response.json();

      if (result.success) {
        setClosetStats(result.data);
      } else {
        throw new Error(result.error || 'Failed to load closet data');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load closet data'
      );
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load closet data on component mount
  useEffect(() => {
    if (user?.id) {
      loadClosetData();
    }
  }, [user?.id, loadClosetData]);

  // Auto-cleanup sessions when user accesses closet
  useEffect(() => {
    if (user?.id) {
      console.log('User accessed closet - cleaning up old sessions');
      checkAndCleanup().then((success) => {
        if (success) {
          console.log('✅ Session cleanup completed on closet access');
        } else {
          console.warn('Session cleanup failed on closet access');
        }
      });
    }
  }, [user?.id, checkAndCleanup]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  /**
   * Handle item selection for multi-select mode
   */
  const handleItemSelect = (item: ClothingItem) => {
    // Toggle selection
    const isSelected = selectedItems.includes(item.id);
    if (isSelected) {
      setSelectedItems((prev) => prev.filter((id) => id !== item.id));
    } else {
      setSelectedItems((prev) => [...prev, item.id]);
    }
  };

  /**
   * Handle item edit
   */
  const handleItemEdit = (item: ClothingItem) => {
    // Navigate to edit page or open edit modal
    router.push(`/closet/edit/${item.id}`);
  };

  /**
   * Handle item deletion
   */
  const handleItemDelete = (item: ClothingItem) => {
    // Remove from selected items if it was selected
    setSelectedItems((prev) => prev.filter((id) => id !== item.id));
    // Reload closet data
    loadClosetData();
  };

  /**
   * Validate selected items for try-on (max 2 categories, max 1 item per category)
   */
  const validateTryOnSelection = async () => {
    if (selectedItems.length === 0) {
      setError('Please select at least one item to try on');
      return false;
    }

    // Fetch the selected items' details to check categories
    const response = await fetch(
      `/api/clothing-items?user_id=${user?.id}&_t=${Date.now()}`
    );
    const result = await response.json();

    if (!result.success) {
      setError('Failed to validate selection');
      return false;
    }

    const allItems = result.data?.items || result.data || [];
    const selected = allItems.filter((item: ClothingItem) =>
      selectedItems.includes(item.id)
    );

    // Check category counts
    const categoryCounts: Record<string, number> = {};
    selected.forEach((item: ClothingItem) => {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    });

    // Check if more than 2 categories are selected
    const uniqueCategories = Object.keys(categoryCounts);
    if (uniqueCategories.length > 2) {
      setError(
        'Please select items from a maximum of 2 categories for optimal results'
      );
      return false;
    }

    // Check if any category has more than 1 item
    const overloadedCategories = Object.entries(categoryCounts)
      .filter(([, count]) => count > 1)
      .map(([category]) => category);

    if (overloadedCategories.length > 0) {
      setError('Please select only 1 item per category for optimal results');
      return false;
    }

    return true;
  };

  /**
   * Handle bulk actions
   */
  const handleBulkAction = async (action: string) => {
    if (selectedItems.length === 0) return;

    switch (action) {
      case 'delete':
        if (confirm(`Delete ${selectedItems.length} selected items?`)) {
          // Implement bulk delete
          console.log('Bulk delete:', selectedItems);
          setSelectedItems([]);
          loadClosetData();
        }
        break;
      case 'try-on':
        try {
          // Validate selection
          const isValid = await validateTryOnSelection();
          if (!isValid) {
            // Error message is already set by validateTryOnSelection
            setShowErrorModal(true);
            return;
          }

          // Clear any previous errors
          setError(null);
          setShowErrorModal(false);

          // Navigate to try-on page with selected items as URL params
          const itemsParam = selectedItems.join(',');
          router.push(`/try-on?items=${itemsParam}`);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Failed to start try-on'
          );
          setShowErrorModal(true);
        }
        break;
      case 'export':
        // Export selected items
        console.log('Export items:', selectedItems);
        break;
      default:
        break;
    }
  };

  /**
   * Clear all selections
   */
  const clearSelection = () => {
    setSelectedItems([]);
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              My Virtual Closet
            </h1>
            <p className="text-gray-600">
              Organize and manage your clothing collection
            </p>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      <Modal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setError(null);
        }}
        size="md"
      >
        <div className="p-6">
          <div className="mb-4 flex items-center justify-center">
            <div className="rounded-full bg-red-100 p-3">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
          <h3 className="mb-2 text-center text-lg font-semibold text-gray-900">
            Selection Error
          </h3>
          <p className="mb-6 text-center text-sm text-gray-600">{error}</p>
          <div className="flex justify-center space-x-3">
            <Button
              onClick={() => {
                setShowErrorModal(false);
                setError(null);
              }}
              variant="outline"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowErrorModal(false);
                setError(null);
                clearSelection();
              }}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quick Stats */}
      {closetStats && (
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="mr-3 text-2xl">📦</div>
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold">{closetStats.totalItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="mr-3 text-2xl">👖</div>
                <div>
                  <p className="text-sm text-gray-600">Pants & Bottoms</p>
                  <p className="text-2xl font-bold">
                    {closetStats.categoryCounts.pants_bottoms || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="mr-3 text-2xl">👟</div>
                <div>
                  <p className="text-sm text-gray-600">Shoes</p>
                  <p className="text-2xl font-bold">
                    {closetStats.categoryCounts.shoes || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="mr-3 text-2xl">👕</div>
                <div>
                  <p className="text-sm text-gray-600">Shirts & Tops</p>
                  <p className="text-2xl font-bold">
                    {closetStats.shirtsTopsCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Selection Actions */}
      {selectedItems.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {selectedItems.length} item
                  {selectedItems.length !== 1 ? 's' : ''} selected
                </span>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear Selection
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('try-on')}
                >
                  Start Try-On
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('export')}
                >
                  Export
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Closet View */}
      <ClosetView
        onItemSelect={handleItemSelect}
        onItemEdit={handleItemEdit}
        onItemDelete={handleItemDelete}
        selectable={true}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
      />

      {/* Quick Actions Panel */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Button
                variant="outline"
                className="flex h-20 flex-col items-center justify-center space-y-2"
                onClick={() => router.push('/upload')}
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span>Upload Items</span>
              </Button>

              <Button
                variant="outline"
                className="flex h-20 flex-col items-center justify-center space-y-2"
                onClick={() => {
                  if (selectedItems.length > 0) {
                    // If items are selected, go to try-on with them
                    handleBulkAction('try-on');
                  } else {
                    // If no items selected, start fresh
                    router.push('/try-on');
                  }
                }}
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <span>Start Try-On</span>
              </Button>

              <Button
                variant="outline"
                className="flex h-20 flex-col items-center justify-center space-y-2"
                onClick={() => setShowQuickActions(!showQuickActions)}
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>More Options</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expanded Quick Actions */}
      {showQuickActions && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Additional Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button
                variant="outline"
                className="flex h-16 flex-col items-center justify-center space-y-1"
                onClick={() => router.push('/profile')}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span className="text-sm">Profile</span>
              </Button>

              <Button
                variant="outline"
                className="flex h-16 flex-col items-center justify-center space-y-1"
                onClick={() => router.push('/privacy')}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span className="text-sm">Privacy</span>
              </Button>

              <Button
                variant="outline"
                className="flex h-16 flex-col items-center justify-center space-y-1"
                onClick={() => window.open('/help', '_blank')}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm">Help</span>
              </Button>

              <Button
                variant="outline"
                className="flex h-16 flex-col items-center justify-center space-y-1"
                onClick={() => window.open('/upgrade', '_blank')}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span className="text-sm">Upgrade</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
