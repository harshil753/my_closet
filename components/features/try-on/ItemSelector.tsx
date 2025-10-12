/**
 * Item Selector Component
 *
 * This component provides a detailed view for selecting specific clothing items
 * within a category. It shows item details, allows selection, and provides
 * validation feedback.
 *
 * Features:
 * - Category-specific item filtering
 * - Search and sort functionality
 * - Multi-item selection with limits
 * - Real-time validation
 * - Responsive grid layout
 * - Integration with ClothingItemCard component
 *
 * Usage:
 * - Second step in try-on selection workflow
 * - Shows items filtered by selected categories
 * - Allows detailed item selection
 *
 * Dependencies:
 * - ClothingItemCard component for item display
 * - Authentication context for user data
 * - API integration for clothing items
 * - Category filtering from parent component
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { ClothingItemCard } from '../closet/ClothingItemCard';
import { ClothingCategory } from '@/lib/types/common';
import { useAuth } from '@/lib/auth/auth-context';

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

// Selection state interface
interface SelectionState {
  selectedItems: string[];
  maxSelections: number;
  minSelections: number;
  searchQuery: string;
  sortBy: 'name' | 'uploaded_at' | 'category';
  sortOrder: 'asc' | 'desc';
}

// Component props
interface ItemSelectorProps {
  category: ClothingCategory;
  onSelectionChange: (selectedItems: string[]) => void;
  selectedItems?: string[];
  maxSelections?: number;
  minSelections?: number;
  className?: string;
}

/**
 * Main item selector component
 */
export function ItemSelector({
  category,
  onSelectionChange,
  selectedItems = [],
  maxSelections = 5,
  minSelections = 1,
  className = '',
}: ItemSelectorProps) {
  // Authentication context
  const { user } = useAuth();

  // State management
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedItems: [...selectedItems],
    maxSelections,
    minSelections,
    searchQuery: '',
    sortBy: 'uploaded_at',
    sortOrder: 'desc',
  });

  /**
   * Load clothing items from API
   */
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/clothing-items?user_id=${user?.id}&category=${category}&_t=${Date.now()}`
      );
      const result = await response.json();

      if (result.success) {
        const itemsData = result.data?.items || result.data || [];
        setItems(Array.isArray(itemsData) ? itemsData : []);
      } else {
        throw new Error(result.error || 'Failed to load items');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [user?.id, category]);

  // Load items when category changes
  useEffect(() => {
    if (user?.id && category) {
      loadItems();
    }
  }, [user?.id, category, loadItems]);

  // Update selection state when props change
  useEffect(() => {
    setSelectionState((prev) => ({
      ...prev,
      selectedItems: [...selectedItems],
      maxSelections,
      minSelections,
    }));
  }, [selectedItems, maxSelections, minSelections]);

  /**
   * Handle item selection
   */
  const handleItemSelect = (itemId: string) => {
    const isSelected = selectionState.selectedItems.includes(itemId);
    let newSelection: string[];

    if (isSelected) {
      // Remove from selection
      newSelection = selectionState.selectedItems.filter((id) => id !== itemId);
    } else {
      // Add to selection (check max limit)
      if (selectionState.selectedItems.length >= maxSelections) {
        return; // Cannot select more items
      }
      newSelection = [...selectionState.selectedItems, itemId];
    }

    setSelectionState((prev) => ({
      ...prev,
      selectedItems: newSelection,
    }));

    onSelectionChange(newSelection);
  };

  /**
   * Handle search query change
   */
  const handleSearchChange = (query: string) => {
    setSelectionState((prev) => ({
      ...prev,
      searchQuery: query,
    }));
  };

  /**
   * Handle sort change
   */
  const handleSortChange = (
    sortBy: 'name' | 'uploaded_at' | 'category',
    sortOrder: 'asc' | 'desc'
  ) => {
    setSelectionState((prev) => ({
      ...prev,
      sortBy,
      sortOrder,
    }));
  };

  /**
   * Clear all selections
   */
  const clearSelection = () => {
    setSelectionState((prev) => ({
      ...prev,
      selectedItems: [],
    }));
    onSelectionChange([]);
  };

  /**
   * Filter and sort items based on current state
   */
  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...items];

    // Filter by search query
    if (selectionState.searchQuery) {
      const query = selectionState.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.metadata.brand?.toLowerCase().includes(query) ||
          item.metadata.color?.toLowerCase().includes(query)
      );
    }

    // Only show active items
    filtered = filtered.filter((item) => item.is_active);

    // Sort items
    filtered.sort((a, b) => {
      let aValue: string | Date, bValue: string | Date;

      switch (selectionState.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'uploaded_at':
          aValue = new Date(a.uploaded_at);
          bValue = new Date(b.uploaded_at);
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return selectionState.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return selectionState.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [items, selectionState]);

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
   * Get selection validation
   */
  const getSelectionValidation = () => {
    const selectedCount = selectionState.selectedItems.length;
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
        <strong>Error Loading Items</strong>
        <p>{error}</p>
        <Button onClick={loadItems} className="mt-2">
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
          <h2 className="text-2xl font-bold">
            Select {getCategoryDisplayName(category)}
          </h2>
          <p className="text-gray-600">
            Choose {minSelections}-{maxSelections} items from this category
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

      {/* Selection Validation */}
      {!validation.isValid && (
        <Alert variant={validation.needsMore ? 'destructive' : 'default'}>
          {validation.needsMore ? (
            <p>
              Please select at least {minSelections} item
              {minSelections !== 1 ? 's' : ''} to continue.
            </p>
          ) : (
            <p>You can select up to {maxSelections} items.</p>
          )}
        </Alert>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Sort</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search items..."
                value={selectionState.searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <select
                value={selectionState.sortBy}
                onChange={(e) =>
                  handleSortChange(
                    e.target.value as 'name' | 'uploaded_at' | 'category',
                    selectionState.sortOrder
                  )
                }
                className="bg-background h-10 w-full rounded-md border px-3 py-2"
              >
                <option value="uploaded_at">Date Added</option>
                <option value="name">Name</option>
                <option value="category">Category</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Order</label>
              <select
                value={selectionState.sortOrder}
                onChange={(e) =>
                  handleSortChange(
                    selectionState.sortBy,
                    e.target.value as 'asc' | 'desc'
                  )
                }
                className="bg-background h-10 w-full rounded-md border px-3 py-2"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      {filteredAndSortedItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mb-4 text-4xl text-gray-400">👕</div>
            <h3 className="mb-2 text-lg font-medium">No items found</h3>
            <p className="mb-4 text-gray-600">
              {selectionState.searchQuery
                ? 'Try adjusting your search terms.'
                : `No ${getCategoryDisplayName(category).toLowerCase()} found in your closet.`}
            </p>
            <Button onClick={() => (window.location.href = '/upload')}>
              Upload Clothing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAndSortedItems.map((item) => (
            <ClothingItemCard
              key={item.id}
              item={item}
              viewMode="grid"
              selectable={true}
              selected={selectionState.selectedItems.includes(item.id)}
              onSelect={() => handleItemSelect(item.id)}
              onView={() => undefined} // Disable view in selection mode
              onEdit={() => undefined} // Disable edit in selection mode
              onDelete={() => undefined} // Disable delete in selection mode
            />
          ))}
        </div>
      )}

      {/* Selection Summary */}
      {validation.selectedCount > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {validation.selectedCount} item
                  {validation.selectedCount !== 1 ? 's' : ''} selected
                </span>
                {validation.remaining > 0 && (
                  <span className="text-sm text-gray-500">
                    {validation.remaining} more can be selected
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear Selection
                </Button>
                {validation.isValid && (
                  <Button size="sm">Continue with Selection</Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ItemSelector;
