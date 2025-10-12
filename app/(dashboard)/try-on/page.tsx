/**
 * Try-On Selection Page
 *
 * This page allows users to select clothing items for virtual try-on.
 * It provides a step-by-step selection process with category and item selection.
 *
 * Features:
 * - Multi-step selection workflow
 * - Category and item selection
 * - Real-time validation
 * - Step navigation
 * - Selection confirmation
 * - Try-on session creation
 *
 * Workflow:
 * 1. Category Selection - Choose clothing categories
 * 2. Item Selection - Select specific items from categories
 * 3. Confirmation - Review and confirm selection
 *
 * Dependencies:
 * - CategorySelector component
 * - ClothingSelector component
 * - SelectionSummary component
 * - Authentication context
 * - API integration for try-on sessions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { ClothingSelector } from '@/components/features/try-on/ClothingSelector';
import { CategorySelector } from '@/components/features/try-on/CategorySelector';
import { ClothingCategory } from '@/lib/types/common';
import { useAuth } from '@/lib/auth/auth-context';
// Removed client-side cleanup to avoid duplicate calls; cleanup is server-driven

// Selection step type
type SelectionStep = 'category' | 'items' | 'confirmation';

// Selection state interface
interface SelectionState {
  selectedCategories: ClothingCategory[];
  selectedItems: string[];
  currentStep: SelectionStep;
  maxSelections: number;
  minSelections: number;
  currentCategoryIndex: number; // Track which category we're currently selecting from
  itemsByCategory: Record<string, string[]>; // Track selected items per category
}

/**
 * Main try-on selection page component
 */
export default function TryOnSelectionPage() {
  // Authentication and navigation
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // State management
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedCategories: [],
    selectedItems: [],
    currentStep: 'category',
    maxSelections: 5,
    minSelections: 1,
    currentCategoryIndex: 0,
    itemsByCategory: {},
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // No client-side cleanup here; backend endpoint performs cleanup idempotently

  /**
   * Handle category selection
   */
  const handleCategorySelection = (selectedCategories: ClothingCategory[]) => {
    setSelectionState((prev) => ({
      ...prev,
      selectedCategories,
      // Stay on category step; move forward only when user clicks Next
      currentStep: prev.currentStep,
      currentCategoryIndex: prev.currentCategoryIndex ?? 0,
      itemsByCategory: {},
    }));
  };

  /**
   * Handle item selection - one item per category
   */
  const handleItemSelection = (selectedItems: string[]) => {
    const currentCategory =
      selectionState.selectedCategories[selectionState.currentCategoryIndex];

    setSelectionState((prev) => {
      const newItemsByCategory = {
        ...prev.itemsByCategory,
        [currentCategory]: selectedItems,
      };

      // Flatten all selected items from all categories
      const allSelectedItems = Object.values(newItemsByCategory).flat();

      return {
        ...prev,
        selectedItems: allSelectedItems,
        itemsByCategory: newItemsByCategory,
      };
    });
  };

  /**
   * Handle step navigation
   */
  const handleStepNavigation = (step: SelectionStep) => {
    setSelectionState((prev) => ({
      ...prev,
      currentStep: step,
    }));
  };

  /**
   * Move to next category or confirmation
   */
  const handleNextCategory = () => {
    const nextIndex = selectionState.currentCategoryIndex + 1;

    if (nextIndex >= selectionState.selectedCategories.length) {
      // All categories done, move to confirmation
      setSelectionState((prev) => ({
        ...prev,
        currentStep: 'confirmation',
      }));
    } else {
      // Move to next category
      setSelectionState((prev) => ({
        ...prev,
        currentCategoryIndex: nextIndex,
      }));
    }
  };

  /**
   * Move to previous category
   */
  const handlePreviousCategory = () => {
    if (selectionState.currentCategoryIndex > 0) {
      setSelectionState((prev) => ({
        ...prev,
        currentCategoryIndex: prev.currentCategoryIndex - 1,
      }));
    } else {
      // Go back to category selection
      setSelectionState((prev) => ({
        ...prev,
        currentStep: 'category',
        currentCategoryIndex: 0,
      }));
    }
  };

  /**
   * Handle try-on session creation
   */
  const handleCreateTryOnSession = async () => {
    // In-flight guard to prevent duplicate creation
    const creatingRef =
      (handleCreateTryOnSession as any)._creatingRef ||
      ((handleCreateTryOnSession as any)._creatingRef = { current: false });
    if (creatingRef.current) {
      return;
    }
    creatingRef.current = true;
    if (selectionState.selectedItems.length === 0) {
      setError('Please select at least one item for try-on');
      creatingRef.current = false;
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Server endpoint performs cleanup atomically; create session once
      const response = await fetch('/api/try-on/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clothing_item_ids: selectionState.selectedItems,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Navigate to try-on processing page
        router.push(`/try-on/process/${result.data.id}`);
      } else {
        throw new Error(result.error || 'Failed to create try-on session');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create try-on session'
      );
    } finally {
      setLoading(false);
      creatingRef.current = false;
    }
  };

  /**
   * Get step validation
   */
  const getStepValidation = () => {
    const {
      selectedCategories,
      selectedItems,
      currentStep,
      currentCategoryIndex,
      itemsByCategory,
    } = selectionState;

    switch (currentStep) {
      case 'category':
        return {
          canProceed: selectedCategories.length >= 1,
          message:
            selectedCategories.length === 0
              ? 'Please select at least one category'
              : null,
        };
      case 'items':
        const currentCategory = selectedCategories[currentCategoryIndex];
        const currentCategoryItems = itemsByCategory[currentCategory] || [];
        const hasSelectedItem = currentCategoryItems.length > 0;
        const isLastCategory =
          currentCategoryIndex >= selectedCategories.length - 1;

        return {
          canProceed: hasSelectedItem,
          message: hasSelectedItem
            ? null
            : `Please select one item from ${currentCategory}`,
          canProceedToNext: hasSelectedItem && !isLastCategory,
          canProceedToConfirmation: hasSelectedItem && isLastCategory,
        };
      case 'confirmation':
        return {
          canProceed: selectedItems.length >= 1,
          message:
            selectedItems.length === 0
              ? 'Please select at least one item'
              : null,
        };
      default:
        return { canProceed: false, message: null };
    }
  };

  const validation = getStepValidation();

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
              Virtual Try-On
            </h1>
            <p className="text-gray-600">
              Select clothing items to create your virtual try-on session
            </p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <strong>Error</strong>
          <p>{error}</p>
          <Button onClick={() => setError(null)} className="mt-2">
            Dismiss
          </Button>
        </Alert>
      )}

      {/* Step Navigation */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    selectionState.currentStep === 'category'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  1
                </div>
                <span className="text-sm font-medium">Select Categories</span>
              </div>

              <div className="h-0.5 w-8 bg-gray-200"></div>

              <div className="flex items-center space-x-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    selectionState.currentStep === 'items'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  2
                </div>
                <span className="text-sm font-medium">Select Items</span>
              </div>

              <div className="h-0.5 w-8 bg-gray-200"></div>

              <div className="flex items-center space-x-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    selectionState.currentStep === 'confirmation'
                      ? 'bg-primary text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  3
                </div>
                <span className="text-sm font-medium">Confirm Selection</span>
              </div>
            </div>

            {/* Step Actions */}
            <div className="flex items-center justify-end space-x-2">
              {selectionState.currentStep === 'items' && (
                <Button
                  variant="outline"
                  onClick={() => handleStepNavigation('category')}
                >
                  Back to Categories
                </Button>
              )}

              {selectionState.currentStep === 'confirmation' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleStepNavigation('items')}
                  >
                    Back to Items
                  </Button>
                  <Button
                    onClick={handleCreateTryOnSession}
                    disabled={!validation.canProceed || loading}
                  >
                    {loading
                      ? 'Ending other sessions & Creating...'
                      : 'Start Try-On'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {selectionState.currentStep === 'category' && (
        <CategorySelector
          onCategoryChange={handleCategorySelection}
          selectedCategories={selectionState.selectedCategories}
          maxSelections={3}
          minSelections={1}
          allowMultiple={true}
          onContinue={() => handleStepNavigation('items')}
        />
      )}

      {selectionState.currentStep === 'items' && (
        <div className="space-y-4">
          {/* Item Selection */}
          <ClothingSelector
            onSelectionChange={handleItemSelection}
            selectedItems={
              selectionState.itemsByCategory[
                selectionState.selectedCategories[
                  selectionState.currentCategoryIndex
                ]
              ] || []
            }
            maxSelections={1}
            minSelections={1}
            allowedCategories={[
              selectionState.selectedCategories[
                selectionState.currentCategoryIndex
              ],
            ]}
          />

          {/* Bottom Navigation / Context */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Select from{' '}
                {
                  selectionState.selectedCategories[
                    selectionState.currentCategoryIndex
                  ]
                }
              </CardTitle>
              <p className="text-gray-600">
                Choose 1 item from this category (
                {selectionState.currentCategoryIndex + 1} of{' '}
                {selectionState.selectedCategories.length})
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={handlePreviousCategory}
                    disabled={selectionState.currentCategoryIndex === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-500">
                    Category {selectionState.currentCategoryIndex + 1} of{' '}
                    {selectionState.selectedCategories.length}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {validation.canProceedToNext && (
                    <Button onClick={handleNextCategory}>Next Category</Button>
                  )}
                  {validation.canProceedToConfirmation && (
                    <Button onClick={handleNextCategory}>
                      Review Selection
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectionState.currentStep === 'confirmation' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Confirm Your Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-600">
                  Selected Categories
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectionState.selectedCategories.map((category) => (
                    <span
                      key={category}
                      className="bg-primary/10 text-primary inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
                    >
                      {category.replace('_', ' ').toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-600">
                  Selected Items by Category
                </h3>
                <div className="mt-2 space-y-2">
                  {selectionState.selectedCategories.map((category) => {
                    const categoryItems =
                      selectionState.itemsByCategory[category] || [];
                    return (
                      <div
                        key={category}
                        className="flex items-center space-x-2"
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {category.replace('_', ' ').toUpperCase()}:
                        </span>
                        <span className="text-sm text-gray-500">
                          {categoryItems.length > 0
                            ? '1 item selected'
                            : 'No item selected'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Total: {selectionState.selectedItems.length} item
                  {selectionState.selectedItems.length !== 1 ? 's' : ''}{' '}
                  selected
                </p>
              </div>

              <div className="pt-4">
                <p className="text-sm text-gray-600">
                  Ready to start your virtual try-on session? This will create a
                  new session with your selected items.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Message */}
      {validation.message && (
        <Alert variant="destructive" className="mt-4">
          <p>{validation.message}</p>
        </Alert>
      )}
    </div>
  );
}
