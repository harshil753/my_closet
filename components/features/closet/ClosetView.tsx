/**
 * Closet View Component
 *
 * This component displays the user's virtual closet with filtering,
 * sorting, and organization capabilities. It provides a comprehensive
 * view of all clothing items with category-based organization.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { ClothingItemCard } from './ClothingItemCard';
import { ClothingItemDetailModal } from './ClothingItemDetailModal';
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

// Filter and sort options
interface FilterOptions {
  category: ClothingCategory | 'all';
  search: string;
  sortBy: 'name' | 'uploaded_at' | 'category';
  sortOrder: 'asc' | 'desc';
}

// View mode options
type ViewMode = 'grid' | 'list';

// Component props
interface ClosetViewProps {
  onItemSelect?: (item: ClothingItem) => void;
  onItemEdit?: (item: ClothingItem) => void;
  onItemDelete?: (item: ClothingItem) => void;
  selectable?: boolean;
  selectedItems?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  className?: string;
}

/**
 * Main closet view component
 */
export function ClosetView({
  onItemSelect,
  onItemEdit,
  onItemDelete,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  className = '',
}: ClosetViewProps) {
  // Authentication context
  const { user } = useAuth();

  // State management
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filter and sort state
  const [filters, setFilters] = useState<FilterOptions>({
    category: 'all',
    search: '',
    sortBy: 'uploaded_at',
    sortOrder: 'desc',
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  // Load items on component mount
  useEffect(() => {
    if (user?.id) {
      loadItems();
    }
  }, [user?.id]);

  /**
   * Load clothing items from API
   */
  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/clothing-items');
      const result = await response.json();

      if (result.success) {
        setItems(result.data);
      } else {
        throw new Error(result.error || 'Failed to load items');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle item selection for multi-select mode
   */
  const handleItemSelect = (item: ClothingItem) => {
    if (selectable && onSelectionChange) {
      const isSelected = selectedItems.includes(item.id);
      if (isSelected) {
        onSelectionChange(selectedItems.filter((id) => id !== item.id));
      } else {
        onSelectionChange([...selectedItems, item.id]);
      }
    } else if (onItemSelect) {
      onItemSelect(item);
    }
  };

  /**
   * Handle item view for detail modal
   */
  const handleItemView = (item: ClothingItem) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  /**
   * Handle item edit
   */
  const handleItemEdit = (item: ClothingItem) => {
    onItemEdit?.(item);
  };

  /**
   * Handle item deletion
   */
  const handleItemDelete = async (item: ClothingItem) => {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        const response = await fetch(`/api/clothing-items/${item.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          setItems((prev) => prev.filter((i) => i.id !== item.id));
          onItemDelete?.(item);
        } else {
          throw new Error('Failed to delete item');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete item');
      }
    }
  };

  /**
   * Handle filter changes
   */
  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setFilters({
      category: 'all',
      search: '',
      sortBy: 'uploaded_at',
      sortOrder: 'desc',
    });
    setCurrentPage(1);
  };

  /**
   * Filter and sort items
   */
  const filteredAndSortedItems = useMemo(() => {
    let filtered = items;

    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter((item) => item.category === filters.category);
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.metadata.brand?.toLowerCase().includes(searchLower) ||
          item.metadata.color?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
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

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [items, filters]);

  /**
   * Get paginated items
   */
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedItems.slice(startIndex, endIndex);
  }, [filteredAndSortedItems, currentPage, itemsPerPage]);

  // Note: getCategoryDisplayName function removed as it's not currently used
  // Will be re-implemented when category display functionality is needed

  /**
   * Get category counts
   */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };

    items.forEach((item) => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });

    return counts;
  }, [items]);

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
        <strong>Error Loading Closet</strong>
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
          <h2 className="text-2xl font-bold">My Closet</h2>
          <p className="text-gray-600">
            {items.length} item{items.length !== 1 ? 's' : ''} in your
            collection
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search items..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
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

            {/* Sort By */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
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
                value={filters.sortOrder}
                onChange={(e) =>
                  handleFilterChange('sortOrder', e.target.value)
                }
                className="bg-background h-10 w-full rounded-md border px-3 py-2"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filteredAndSortedItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mb-4 text-4xl text-gray-400">👕</div>
            <h3 className="mb-2 text-lg font-medium">No items found</h3>
            <p className="mb-4 text-gray-600">
              {filters.search || filters.category !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'Start building your virtual closet by uploading your first clothing item.'}
            </p>
            <Button onClick={() => (window.location.href = '/upload')}>
              Upload Clothing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Items Grid/List */}
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'space-y-4'
            }
          >
            {paginatedItems.map((item) => (
              <ClothingItemCard
                key={item.id}
                item={item}
                viewMode={viewMode}
                selectable={selectable}
                selected={selectedItems.includes(item.id)}
                onSelect={() => handleItemSelect(item)}
                onView={() => handleItemView(item)}
                onEdit={() => handleItemEdit(item)}
                onDelete={() => handleItemDelete(item)}
              />
            ))}
          </div>

          {/* Pagination */}
          {filteredAndSortedItems.length > itemsPerPage && (
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>

              <span className="text-sm text-gray-600">
                Page {currentPage} of{' '}
                {Math.ceil(filteredAndSortedItems.length / itemsPerPage)}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(
                      Math.ceil(filteredAndSortedItems.length / itemsPerPage),
                      prev + 1
                    )
                  )
                }
                disabled={
                  currentPage >=
                  Math.ceil(filteredAndSortedItems.length / itemsPerPage)
                }
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <ClothingItemDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        item={selectedItem}
        onEdit={onItemEdit || (() => {})}
        onDelete={onItemDelete || (() => {})}
        onAddToTryOn={(item) => {
          // Handle add to try-on logic
          console.log('Add to try-on:', item);
        }}
      />
    </div>
  );
}

export default ClosetView;
