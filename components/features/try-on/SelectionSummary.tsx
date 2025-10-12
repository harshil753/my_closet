/**
 * Selection Summary Component
 *
 * This component displays a summary of the user's try-on selection,
 * including selected items, categories, and validation status.
 * It provides a clear overview before starting the try-on session.
 *
 * Features:
 * - Selection statistics display
 * - Category breakdown
 * - Item details with thumbnails
 * - Validation status
 * - Action buttons for editing and starting try-on
 *
 * Usage:
 * - Final step in try-on selection workflow
 * - Provides confirmation before session creation
 * - Shows comprehensive selection overview
 *
 * Dependencies:
 * - API integration for item details
 * - UI components for layout and interaction
 * - Parent component callbacks for actions
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { ClothingCategory } from '@/lib/types/common';

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

// Selection summary interface
interface SelectionSummary {
  selectedItems: ClothingItem[];
  selectedCategories: ClothingCategory[];
  totalItems: number;
  categoryCounts: Record<ClothingCategory, number>;
  isValid: boolean;
  validationMessage?: string;
}

// Component props
interface SelectionSummaryProps {
  selectedItemIds: string[];
  selectedCategories: ClothingCategory[];
  onStartTryOn: () => void;
  onEditSelection: () => void;
  loading?: boolean;
  className?: string;
}

/**
 * Main selection summary component
 */
export function SelectionSummary({
  selectedItemIds,
  selectedCategories,
  onStartTryOn,
  onEditSelection,
  loading = false,
  className = '',
}: SelectionSummaryProps) {
  // State management
  const [summary, setSummary] = useState<SelectionSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load summary data from API
   */
  const loadSummaryData = useCallback(async () => {
    try {
      setLoadingSummary(true);
      setError(null);

      // Fetch item details for selected items
      const response = await fetch(
        `/api/clothing-items?ids=${selectedItemIds.join(',')}&_t=${Date.now()}`
      );
      const result = await response.json();

      if (result.success) {
        const items = result.data?.items || result.data || [];
        const selectedItems = Array.isArray(items) ? items : [];

        // Calculate category counts
        const categoryCounts = selectedItems.reduce(
          (acc, item) => {
            acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
          },
          {} as Record<ClothingCategory, number>
        );

        // Validate selection
        const isValid = selectedItems.length >= 1 && selectedItems.length <= 5;
        const validationMessage = !isValid
          ? selectedItems.length === 0
            ? 'Please select at least one item'
            : 'You can select up to 5 items'
          : '';

        setSummary({
          selectedItems,
          selectedCategories,
          totalItems: selectedItems.length,
          categoryCounts,
          isValid,
          validationMessage,
        });
      } else {
        throw new Error(result.error || 'Failed to load selection summary');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load selection summary'
      );
    } finally {
      setLoadingSummary(false);
    }
  }, [selectedItemIds, selectedCategories]);

  // Load summary data when selection changes
  useEffect(() => {
    if (selectedItemIds.length > 0) {
      loadSummaryData();
    } else {
      setSummary(null);
      setLoadingSummary(false);
    }
  }, [selectedItemIds, selectedCategories, loadSummaryData]);

  /**
   * Get category display name
   */
  const getCategoryDisplayName = (category: ClothingCategory): string => {
    const names = {
      shirts_tops: 'Shirts & Tops',
      pants_bottoms: 'Pants & Bottoms',
      shoes: 'Shoes',
    };
    return names[category];
  };

  /**
   * Get category color for badge
   */
  const getCategoryColor = (category: ClothingCategory): string => {
    const colors = {
      shirts_tops: 'bg-blue-100 text-blue-800',
      pants_bottoms: 'bg-green-100 text-green-800',
      shoes: 'bg-purple-100 text-purple-800',
    };
    return colors[category];
  };

  // Loading state
  if (loadingSummary) {
    return (
      <div className="flex h-32 items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <strong>Error Loading Summary</strong>
        <p>{error}</p>
        <Button onClick={loadSummaryData} className="mt-2">
          Try Again
        </Button>
      </Alert>
    );
  }

  // No selection state
  if (!summary || summary.totalItems === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <div className="mb-4 text-4xl text-gray-400">👕</div>
          <h3 className="mb-2 text-lg font-medium">No items selected</h3>
          <p className="mb-4 text-gray-600">
            Select clothing items to see your try-on summary.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selection Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Selection Stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-primary text-2xl font-bold">
                  {summary.totalItems}
                </div>
                <div className="text-sm text-gray-600">Items Selected</div>
              </div>

              <div className="text-center">
                <div className="text-primary text-2xl font-bold">
                  {summary.selectedCategories.length}
                </div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>

              <div className="text-center">
                <div className="text-primary text-2xl font-bold">
                  {Object.keys(summary.categoryCounts).length}
                </div>
                <div className="text-sm text-gray-600">Unique Categories</div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-600">
                Category Breakdown
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.categoryCounts).map(
                  ([category, count]) => (
                    <Badge
                      key={category}
                      variant="secondary"
                      className={`text-xs ${getCategoryColor(category as ClothingCategory)}`}
                    >
                      {getCategoryDisplayName(category as ClothingCategory)} (
                      {count})
                    </Badge>
                  )
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Selected Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {summary.selectedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center space-x-3 rounded-lg border p-3"
              >
                {/* Item Image */}
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  <Image
                    src={item.thumbnail_url || item.image_url}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Item Details */}
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-medium">{item.name}</h4>
                  <div className="mt-1 flex items-center space-x-2">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${getCategoryColor(item.category)}`}
                    >
                      {getCategoryDisplayName(item.category)}
                    </Badge>
                    {item.metadata.brand && (
                      <span className="text-xs text-gray-500">
                        {item.metadata.brand}
                      </span>
                    )}
                    {item.metadata.color && (
                      <span className="text-xs text-gray-500">
                        {item.metadata.color}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Validation and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Validation Status */}
              <div className="flex items-center space-x-2">
                {summary.isValid ? (
                  <div className="flex items-center space-x-1 text-green-600">
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-medium">Ready to try on</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-red-600">
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-medium">
                      Selection incomplete
                    </span>
                  </div>
                )}
              </div>

              {/* Validation Message */}
              {summary.validationMessage && (
                <span className="text-sm text-gray-500">
                  {summary.validationMessage}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={onEditSelection}
                disabled={loading}
              >
                Edit Selection
              </Button>
              <Button
                onClick={onStartTryOn}
                disabled={!summary.isValid || loading}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Starting...
                  </>
                ) : (
                  'Start Try-On'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Alert */}
      {!summary.isValid && summary.validationMessage && (
        <Alert variant="destructive">
          <p>{summary.validationMessage}</p>
        </Alert>
      )}
    </div>
  );
}

export default SelectionSummary;
