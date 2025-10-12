/**
 * Category Selector Component
 *
 * This component allows users to select clothing categories for virtual try-on.
 * It provides visual category selection with item counts and validation.
 *
 * Features:
 * - Visual category selection with icons and descriptions
 * - Item count display for each category
 * - Single or multiple selection modes
 * - Real-time validation
 * - Responsive grid layout
 * - Empty state handling
 *
 * Usage:
 * - First step in try-on selection workflow
 * - Helps users narrow down their selection
 * - Provides category-based filtering for subsequent steps
 *
 * Dependencies:
 * - Authentication context for user data
 * - API integration for category statistics
 * - UI components for layout and interaction
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { ClothingCategory } from '@/lib/types/common';
import { useAuth } from '@/lib/auth/auth-context';

// Category interface
interface CategoryInfo {
  id: ClothingCategory;
  name: string;
  description: string;
  icon: string;
  itemCount: number;
  selected: boolean;
}

// Component props
interface CategorySelectorProps {
  onCategoryChange: (selectedCategories: ClothingCategory[]) => void;
  selectedCategories?: ClothingCategory[];
  maxSelections?: number;
  minSelections?: number;
  allowMultiple?: boolean;
  onContinue?: () => void;
  className?: string;
}

/**
 * Main category selector component
 */
export function CategorySelector({
  onCategoryChange,
  selectedCategories = [],
  maxSelections = 3,
  minSelections = 1,
  allowMultiple = true,
  onContinue,
  className = '',
}: CategorySelectorProps) {
  // Authentication context
  const { user } = useAuth();

  // State management
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deduping guards/caches
  const fetchedRef = useRef(false);
  const inFlightRef = useRef<Promise<any> | null>(null);

  // Simple in-memory cache keyed by user id
  // Module-level singleton via globalThis to persist across HMR
  const cacheRoot =
    (globalThis as any).__MYCLOSET_CACHE__ ||
    ((globalThis as any).__MYCLOSET_CACHE__ = {
      clothingByUser: {} as Record<string, any[]>,
    });

  /**
   * Load category data from API
   */
  const loadCategoryData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try cache first
      let items: any[] | null = null;
      const cacheKey = String(user?.id || '');
      if (cacheKey && cacheRoot.clothingByUser[cacheKey]) {
        items = cacheRoot.clothingByUser[cacheKey];
      }

      if (!items) {
        // Prevent duplicate in-flight requests
        if (!inFlightRef.current) {
          inFlightRef.current = fetch(
            `/api/clothing-items?user_id=${user?.id}`,
            {
              cache: 'no-store',
            }
          ).then((r) => r.json());
        }
        const result = await inFlightRef.current;
        inFlightRef.current = null;

        if (result.success) {
          const itemsData = result.data?.items || result.data || [];
          items = Array.isArray(itemsData) ? itemsData : [];
          if (cacheKey) cacheRoot.clothingByUser[cacheKey] = items;
        } else {
          throw new Error(result.error || 'Failed to load category data');
        }
      }

      // Count items by category
      const categoryCounts = (items || []).reduce(
        (acc: Record<string, number>, item: any) => {
          if (item.is_active) {
            acc[item.category] = (acc[item.category] || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>
      );

      // Create category info
      const categoryData: CategoryInfo[] = [
        {
          id: 'shirts_tops',
          name: 'Shirts & Tops',
          description:
            'T-shirts, blouses, sweaters, and other upper body clothing',
          icon: '👕',
          itemCount: categoryCounts.shirts_tops || 0,
          selected: selectedCategories.includes('shirts_tops'),
        },
        {
          id: 'pants_bottoms',
          name: 'Pants & Bottoms',
          description: 'Jeans, trousers, skirts, and other lower body clothing',
          icon: '👖',
          itemCount: categoryCounts.pants_bottoms || 0,
          selected: selectedCategories.includes('pants_bottoms'),
        },
        {
          id: 'shoes',
          name: 'Shoes',
          description: 'Sneakers, boots, heels, and other footwear',
          icon: '👟',
          itemCount: categoryCounts.shoes || 0,
          selected: selectedCategories.includes('shoes'),
        },
      ];

      setCategories(categoryData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load category data'
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load category data on component mount
  useEffect(() => {
    if (user?.id && !fetchedRef.current) {
      fetchedRef.current = true; // Prevent StrictMode double-fetch
      loadCategoryData();
    }
  }, [user?.id, loadCategoryData]);

  /**
   * Handle category selection
   */
  const handleCategorySelect = (categoryId: ClothingCategory) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category || category.itemCount === 0) return;

    let newSelection: ClothingCategory[];

    if (category.selected) {
      // Remove from selection
      newSelection = selectedCategories.filter((id) => id !== categoryId);
    } else {
      // Add to selection
      if (!allowMultiple) {
        // Single selection mode
        newSelection = [categoryId];
      } else {
        // Multiple selection mode
        if (selectedCategories.length >= maxSelections) {
          return; // Cannot select more categories
        }
        newSelection = [...selectedCategories, categoryId];
      }
    }

    // Update local state
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        selected: newSelection.includes(c.id),
      }))
    );

    onCategoryChange(newSelection);
  };

  /**
   * Clear all selections
   */
  const clearSelection = () => {
    setCategories((prev) => prev.map((c) => ({ ...c, selected: false })));
    onCategoryChange([]);
  };

  /**
   * Get selection validation
   */
  const getSelectionValidation = () => {
    const selectedCount = selectedCategories.length;
    const isValid =
      selectedCount >= minSelections && selectedCount <= maxSelections;
    const canSelectMore = selectedCount < maxSelections;
    const needsMore = selectedCount < minSelections;

    return {
      isValid,
      canSelectMore,
      needsMore,
      selectedCount,
      remaining: maxSelections - selectedCount,
    };
  };

  const validation = getSelectionValidation();

  // Loading state
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <strong>Error Loading Categories</strong>
        <p>{error}</p>
        <Button onClick={loadCategoryData} className="mt-2">
          Try Again
        </Button>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold">Select Categories</h2>
          <p className="text-gray-600">
            Choose {minSelections}-{maxSelections} categor
            {allowMultiple ? 'ies' : 'y'} for your virtual try-on
          </p>
        </div>

        {/* Selection Summary */}
        <div className="flex items-center space-x-4">
          <Badge variant={validation.isValid ? 'default' : 'destructive'}>
            {validation.selectedCount}/{maxSelections} selected
          </Badge>
          {validation.selectedCount > 0 && (
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Selection Validation + Next */}
      <Alert variant={validation.needsMore ? 'destructive' : 'default'}>
        <div className="flex items-center justify-between">
          <div>
            {validation.needsMore ? (
              <p>
                Please select at least {minSelections} categor
                {minSelections !== 1 ? 'ies' : 'y'} to continue.
              </p>
            ) : validation.canSelectMore ? (
              <p>
                {validation.selectedCount}/{maxSelections} selected. You can
                select up to {maxSelections}.
              </p>
            ) : (
              <p>
                {validation.selectedCount}/{maxSelections} selected. You're all
                set.
              </p>
            )}
          </div>
          <div>
            <Button
              size="sm"
              onClick={onContinue}
              disabled={!validation.isValid}
            >
              Next: Select Items
            </Button>
          </div>
        </div>
      </Alert>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Card
            key={category.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              category.selected ? 'ring-primary ring-2 ring-offset-2' : ''
            } ${category.itemCount === 0 ? 'cursor-not-allowed opacity-50' : ''}`}
            onClick={() => handleCategorySelect(category.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                {/* Category Icon */}
                <div className="text-4xl">{category.icon}</div>

                {/* Category Info */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold">{category.name}</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {category.description}
                  </p>

                  {/* Item Count */}
                  <div className="mt-3 flex items-center space-x-2">
                    <Badge variant="secondary">
                      {category.itemCount} item
                      {category.itemCount !== 1 ? 's' : ''}
                    </Badge>
                    {category.itemCount === 0 && (
                      <Badge variant="destructive">No items</Badge>
                    )}
                  </div>

                  {/* Selection Indicator */}
                  {category.selected && (
                    <div className="text-primary mt-3 flex items-center">
                      <svg
                        className="mr-1 h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm font-medium">Selected</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selection Summary (counts only) */}
      {validation.selectedCount > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {validation.selectedCount} categor
                  {validation.selectedCount !== 1 ? 'ies' : 'y'} selected
                </span>
                {validation.remaining > 0 && (
                  <span className="text-sm text-gray-500">
                    {validation.remaining} more can be selected
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {categories.every((c) => c.itemCount === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mb-4 text-4xl text-gray-400">👕</div>
            <h3 className="mb-2 text-lg font-medium">
              No clothing items found
            </h3>
            <p className="mb-4 text-gray-600">
              Upload some clothing items to get started with virtual try-on.
            </p>
            <Button onClick={() => (window.location.href = '/upload')}>
              Upload Clothing
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CategorySelector;
