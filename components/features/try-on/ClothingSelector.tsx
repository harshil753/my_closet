/**
 * Clothing Selector Component
 *
 * This component allows users to select clothing items for virtual try-on.
 * It provides category-based filtering, multi-selection, and validation.
 *
 * Features:
 * - Multi-item selection with configurable limits
 * - Category-based filtering
 * - Search functionality
 * - Real-time validation
 * - Responsive grid layout
 * - Integration with existing ClothingItemCard component
 *
 * Usage:
 * - Used in try-on selection workflow
 * - Supports both category and item-level selection
 * - Provides validation feedback for selection limits
 *
 * Dependencies:
 * - ClothingItemCard component for item display
 * - Authentication context for user data
 * - API integration for clothing items
 */

'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { ClothingItemCard } from '../closet/ClothingItemCard';
import { ClothingCategory } from '@/lib/types/common';
import { useAuth } from '@/lib/auth/auth-context';
import { getErrorMessage } from '@/lib/utils/api-helpers';

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
  categoryFilter: ClothingCategory | 'all';
  searchQuery: string;
}

// Component props
interface ClothingSelectorProps {
  onSelectionChange: (selectedItems: string[]) => void;
  selectedItems?: string[];
  maxSelections?: number;
  minSelections?: number;
  allowedCategories?: ClothingCategory[];
  className?: string;
}

/**
 * Main clothing selector component
 */
export function ClothingSelector({
  onSelectionChange,
  selectedItems = [],
  maxSelections = 5,
  minSelections = 1,
  allowedCategories,
  className = '',
}: ClothingSelectorProps) {
  // Authentication context
  const { user } = useAuth();

  // State management
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);
  const inFlightRef = useRef<Promise<any> | null>(null);

  // Global cache (persist across HMR)
  const cacheRoot =
    (globalThis as any).__MYCLOSET_CACHE__ ||
    ((globalThis as any).__MYCLOSET_CACHE__ = {
      clothingByUser: {} as Record<string, any[]>,
    });
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedItems: [...selectedItems],
    maxSelections,
    minSelections,
    categoryFilter: 'all',
    searchQuery: '',
  });

  /**
   * Load clothing items from API
   */
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const cacheKey = String(user?.id || '');
      let clothing: any[] | null = cacheKey
        ? cacheRoot.clothingByUser[cacheKey]
        : null;

      if (!clothing) {
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
          clothing = Array.isArray(itemsData) ? itemsData : [];
          if (cacheKey) cacheRoot.clothingByUser[cacheKey] = clothing;
        } else {
          throw new Error(getErrorMessage(result.error, 'Failed to load items'));
        }
      }

      setItems(clothing as any[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load clothing items on component mount
  useEffect(() => {
    if (user?.id && !fetchedRef.current) {
      fetchedRef.current = true; // prevent StrictMode double-invoke
      loadItems();
    }
  }, [user?.id, loadItems]);

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
   * Handle category filter change
   */
  const handleCategoryFilter = (category: ClothingCategory | 'all') => {
    setSelectionState((prev) => ({
      ...prev,
      categoryFilter: category,
    }));
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
  const filteredItems = useMemo(() => {
    let filtered = [...items];

    // Filter by category
    if (selectionState.categoryFilter !== 'all') {
      filtered = filtered.filter(
        (item) => item.category === selectionState.categoryFilter
      );
    }

    // Filter by allowed categories
    if (allowedCategories && allowedCategories.length > 0) {
      filtered = filtered.filter((item) =>
        allowedCategories.includes(item.category)
      );
    }

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

    return filtered;
  }, [items, selectionState, allowedCategories]);

  /**
   * Get category counts
   */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };

    items.forEach((item) => {
      if (item.is_active) {
        counts[item.category] = (counts[item.category] || 0) + 1;
      }
    });

    return counts;
  }, [items]);

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
          <h2 className="text-2xl font-bold">Select Clothing Items</h2>
          <p className="text-gray-600">
            Choose {minSelections}-{maxSelections} items for your virtual try-on
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
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

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select
                value={selectionState.categoryFilter}
                onChange={(e) =>
                  handleCategoryFilter(
                    e.target.value as ClothingCategory | 'all'
                  )
                }
                className="bg-background h-10 w-full rounded-md border px-3 py-2"
              >
                <option value="all">
                  All Categories ({categoryCounts.all})
                </option>
                <option value="shirts_tops">
                  Shirts & Tops ({categoryCounts.shirts_tops || 0})
                </option>
                <option value="pants_bottoms">
                  Pants & Bottoms ({categoryCounts.pants_bottoms || 0})
                </option>
                <option value="shoes">
                  Shoes ({categoryCounts.shoes || 0})
                </option>
              </select>
            </div>

            {/* Selection Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Selection Status</label>
              <div className="flex h-10 items-center rounded-md border px-3 py-2">
                <span className="text-sm text-gray-600">
                  {validation.selectedCount} of {maxSelections} selected
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mb-4 text-4xl text-gray-400">👕</div>
            <h3 className="mb-2 text-lg font-medium">No items found</h3>
            <p className="mb-4 text-gray-600">
              {selectionState.searchQuery ||
              selectionState.categoryFilter !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'Upload some clothing items to get started.'}
            </p>
            <Button onClick={() => (window.location.href = '/upload')}>
              Upload Clothing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
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

      {/* Removed top selection summary/actions per new layout */}
    </div>
  );
}

export default ClothingSelector;
