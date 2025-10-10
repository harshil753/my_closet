/**
 * Closet Organization Utilities
 *
 * This module provides utilities for filtering, sorting, and organizing
 * clothing items in the virtual closet. It includes category-based
 * filtering, search functionality, and advanced organization features.
 */

import { ClothingCategory } from '@/lib/types/common';

// Clothing item interface
export interface ClothingItem {
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

// Filter options interface
export interface FilterOptions {
  category: ClothingCategory | 'all';
  search: string;
  color?: string;
  brand?: string;
  size?: string;
  isActive?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Sort options interface
export interface SortOptions {
  field: 'name' | 'category' | 'uploaded_at' | 'brand' | 'color';
  order: 'asc' | 'desc';
}

// Organization result interface
export interface OrganizationResult {
  items: ClothingItem[];
  totalCount: number;
  categoryCounts: Record<string, number>;
  filters: FilterOptions;
  sort: SortOptions;
}

// Category configuration
export const CATEGORY_CONFIG = {
  shirts_tops: {
    name: 'Shirts & Tops',
    icon: '👕',
    color: 'blue',
    subcategories: [
      't-shirts',
      'dress-shirts',
      'blouses',
      'tank-tops',
      'sweaters',
    ],
  },
  pants_bottoms: {
    name: 'Pants & Bottoms',
    icon: '👖',
    color: 'green',
    subcategories: ['jeans', 'dress-pants', 'shorts', 'skirts', 'leggings'],
  },
  shoes: {
    name: 'Shoes',
    icon: '👟',
    color: 'purple',
    subcategories: ['sneakers', 'dress-shoes', 'boots', 'sandals', 'heels'],
  },
} as const;

// Color mapping for filtering
export const COLOR_MAPPING = {
  red: ['red', 'crimson', 'scarlet', 'burgundy', 'maroon'],
  blue: ['blue', 'navy', 'royal', 'sky', 'teal', 'turquoise'],
  green: ['green', 'emerald', 'forest', 'mint', 'olive'],
  yellow: ['yellow', 'gold', 'amber', 'mustard'],
  purple: ['purple', 'violet', 'lavender', 'plum'],
  pink: ['pink', 'rose', 'magenta', 'coral'],
  black: ['black', 'charcoal', 'dark'],
  white: ['white', 'cream', 'ivory', 'off-white'],
  gray: ['gray', 'grey', 'silver', 'charcoal'],
  brown: ['brown', 'tan', 'beige', 'khaki'],
} as const;

/**
 * Main closet organization class
 */
export class ClosetOrganizer {
  private items: ClothingItem[];

  constructor(items: ClothingItem[]) {
    this.items = items;
  }

  /**
   * Filter items based on provided options
   */
  filterItems(options: FilterOptions): ClothingItem[] {
    let filtered = [...this.items];

    // Category filter
    if (options.category !== 'all') {
      filtered = filtered.filter((item) => item.category === options.category);
    }

    // Search filter
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.metadata.brand?.toLowerCase().includes(searchLower) ||
          item.metadata.color?.toLowerCase().includes(searchLower) ||
          item.metadata.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Color filter
    if (options.color) {
      const colorLower = options.color.toLowerCase();
      filtered = filtered.filter((item) => {
        const itemColor = item.metadata.color?.toLowerCase();
        if (!itemColor) return false;

        // Check exact match or color family match
        return (
          itemColor === colorLower ||
          (
            COLOR_MAPPING[
              colorLower as keyof typeof COLOR_MAPPING
            ] as readonly string[]
          )?.includes(itemColor)
        );
      });
    }

    // Brand filter
    if (options.brand) {
      const brandLower = options.brand.toLowerCase();
      filtered = filtered.filter((item) =>
        item.metadata.brand?.toLowerCase().includes(brandLower)
      );
    }

    // Size filter
    if (options.size) {
      const sizeLower = options.size.toLowerCase();
      filtered = filtered.filter((item) =>
        item.metadata.size?.toLowerCase().includes(sizeLower)
      );
    }

    // Active status filter
    if (options.isActive !== undefined) {
      filtered = filtered.filter((item) => item.is_active === options.isActive);
    }

    // Date range filter
    if (options.dateRange) {
      const { start, end } = options.dateRange;
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item.uploaded_at);
        return itemDate >= start && itemDate <= end;
      });
    }

    return filtered;
  }

  /**
   * Sort items based on provided options
   */
  sortItems(items: ClothingItem[], options: SortOptions): ClothingItem[] {
    return [...items].sort((a, b) => {
      let aValue: any, bValue: any;

      switch (options.field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        case 'uploaded_at':
          aValue = new Date(a.uploaded_at);
          bValue = new Date(b.uploaded_at);
          break;
        case 'brand':
          aValue = a.metadata.brand?.toLowerCase() || '';
          bValue = b.metadata.brand?.toLowerCase() || '';
          break;
        case 'color':
          aValue = a.metadata.color?.toLowerCase() || '';
          bValue = b.metadata.color?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return options.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return options.order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Get category counts for all items
   */
  getCategoryCounts(
    items: ClothingItem[] = this.items
  ): Record<string, number> {
    const counts: Record<string, number> = { all: items.length };

    Object.keys(CATEGORY_CONFIG).forEach((category) => {
      counts[category] = items.filter(
        (item) => item.category === category
      ).length;
    });

    return counts;
  }

  /**
   * Get color distribution for items
   *
   * This method analyzes the color metadata of clothing items and groups them
   * into color families for better organization and filtering. It uses a
   * predefined color mapping to normalize similar colors (e.g., "navy" and "blue")
   * into the same family for consistent categorization.
   *
   * Algorithm:
   * 1. Iterate through all items and extract color metadata
   * 2. Normalize color names to lowercase for case-insensitive matching
   * 3. Find the color family using the COLOR_MAPPING lookup table
   * 4. If no family match is found, use the original color name
   * 5. Increment the count for the determined color family
   *
   * @param items - Array of clothing items to analyze (defaults to all items)
   * @returns Object with color family names as keys and item counts as values
   */
  getColorDistribution(
    items: ClothingItem[] = this.items
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    items.forEach((item) => {
      const color = item.metadata.color?.toLowerCase();
      if (color) {
        // Find color family using predefined mapping
        // This allows us to group similar colors (e.g., "navy", "royal", "sky" -> "blue")
        const colorFamily =
          Object.keys(COLOR_MAPPING).find((family) =>
            (
              COLOR_MAPPING[
                family as keyof typeof COLOR_MAPPING
              ] as readonly string[]
            ).includes(color)
          ) || color; // Fallback to original color if no family match

        // Increment count for this color family
        distribution[colorFamily] = (distribution[colorFamily] || 0) + 1;
      }
    });

    return distribution;
  }

  /**
   * Get brand distribution for items
   */
  getBrandDistribution(
    items: ClothingItem[] = this.items
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    items.forEach((item) => {
      const brand = item.metadata.brand;
      if (brand) {
        distribution[brand] = (distribution[brand] || 0) + 1;
      }
    });

    return distribution;
  }

  /**
   * Get size distribution for items
   */
  getSizeDistribution(
    items: ClothingItem[] = this.items
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    items.forEach((item) => {
      const size = item.metadata.size;
      if (size) {
        distribution[size] = (distribution[size] || 0) + 1;
      }
    });

    return distribution;
  }

  /**
   * Organize items with filters and sorting
   */
  organizeItems(
    filters: FilterOptions,
    sort: SortOptions,
    pagination?: { page: number; limit: number }
  ): OrganizationResult {
    // Apply filters
    const filteredItems = this.filterItems(filters);

    // Apply sorting
    const sortedItems = this.sortItems(filteredItems, sort);

    // Apply pagination if provided
    let paginatedItems = sortedItems;
    if (pagination) {
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      paginatedItems = sortedItems.slice(startIndex, endIndex);
    }

    return {
      items: paginatedItems,
      totalCount: filteredItems.length,
      categoryCounts: this.getCategoryCounts(filteredItems),
      filters,
      sort,
    };
  }

  /**
   * Get suggested filters based on current items
   */
  getSuggestedFilters(): {
    colors: string[];
    brands: string[];
    sizes: string[];
  } {
    const colors = Object.keys(this.getColorDistribution());
    const brands = Object.keys(this.getBrandDistribution());
    const sizes = Object.keys(this.getSizeDistribution());

    return {
      colors: colors.sort(),
      brands: brands.sort(),
      sizes: sizes.sort(),
    };
  }

  /**
   * Get items by category with subcategory breakdown
   */
  getItemsByCategory(category: ClothingCategory): {
    items: ClothingItem[];
    subcategories: Record<string, ClothingItem[]>;
  } {
    const categoryItems = this.items.filter(
      (item) => item.category === category
    );
    const subcategories: Record<string, ClothingItem[]> = {};

    // Group by subcategory if metadata contains subcategory info
    categoryItems.forEach((item) => {
      const subcategory = item.metadata.notes?.toLowerCase().includes('dress')
        ? 'dress'
        : item.metadata.notes?.toLowerCase().includes('casual')
          ? 'casual'
          : item.metadata.notes?.toLowerCase().includes('formal')
            ? 'formal'
            : 'other';

      if (!subcategories[subcategory]) {
        subcategories[subcategory] = [];
      }
      subcategories[subcategory].push(item);
    });

    return {
      items: categoryItems,
      subcategories,
    };
  }

  /**
   * Get recently added items
   */
  getRecentItems(limit: number = 10): ClothingItem[] {
    return this.sortItems(this.items, {
      field: 'uploaded_at',
      order: 'desc',
    }).slice(0, limit);
  }

  /**
   * Get items by color family
   */
  getItemsByColorFamily(colorFamily: string): ClothingItem[] {
    return this.items.filter((item) => {
      const itemColor = item.metadata.color?.toLowerCase();
      if (!itemColor) return false;

      return (
        itemColor === colorFamily ||
        (
          COLOR_MAPPING[
            colorFamily as keyof typeof COLOR_MAPPING
          ] as readonly string[]
        )?.includes(itemColor)
      );
    });
  }

  /**
   * Get items by brand
   */
  getItemsByBrand(brand: string): ClothingItem[] {
    return this.items.filter((item) =>
      item.metadata.brand?.toLowerCase().includes(brand.toLowerCase())
    );
  }

  /**
   * Get items by size
   */
  getItemsBySize(size: string): ClothingItem[] {
    return this.items.filter((item) =>
      item.metadata.size?.toLowerCase().includes(size.toLowerCase())
    );
  }

  /**
   * Search items with advanced options
   *
   * This method provides flexible search functionality across multiple fields
   * with support for both fuzzy and exact matching. It allows searching across
   * different metadata fields and provides various matching strategies.
   *
   * Search Strategies:
   * 1. Fuzzy Search: Simple substring matching - returns items where the query
   *    is contained anywhere in the specified fields
   * 2. Exact Word Matching: Splits the query into words and ensures ALL words
   *    are present in the field (useful for multi-word searches like "blue shirt")
   *
   * Performance Considerations:
   * - Uses Array.some() for early termination when a match is found
   * - Case-insensitive matching by default for better user experience
   * - Supports searching across multiple fields simultaneously
   *
   * @param query - Search query string
   * @param options - Search configuration options
   * @param options.searchFields - Fields to search in (default: all fields)
   * @param options.fuzzy - Enable fuzzy matching (default: false)
   * @param options.caseSensitive - Case-sensitive matching (default: false)
   * @returns Array of items matching the search criteria
   */
  searchItems(
    query: string,
    options: {
      searchFields?: ('name' | 'brand' | 'color' | 'notes')[];
      fuzzy?: boolean;
      caseSensitive?: boolean;
    } = {}
  ): ClothingItem[] {
    const {
      searchFields = ['name', 'brand', 'color', 'notes'],
      fuzzy = false,
      caseSensitive = false,
    } = options;

    // Normalize search query based on case sensitivity setting
    const searchQuery = caseSensitive ? query : query.toLowerCase();

    return this.items.filter((item) => {
      // Use Array.some() for early termination - if any field matches, include the item
      return searchFields.some((field) => {
        let value: string;

        // Extract the appropriate field value based on the search field type
        switch (field) {
          case 'name':
            value = item.name;
            break;
          case 'brand':
            value = item.metadata.brand || '';
            break;
          case 'color':
            value = item.metadata.color || '';
            break;
          case 'notes':
            value = item.metadata.notes || '';
            break;
          default:
            return false; // Unknown field, no match
        }

        // Normalize field value based on case sensitivity setting
        const searchValue = caseSensitive ? value : value.toLowerCase();

        if (fuzzy) {
          // Simple fuzzy search - check if query is contained in value
          // This is useful for partial matches and typos
          return searchValue.includes(searchQuery);
        } else {
          // Exact word matching - split query into words and ensure ALL words are present
          // This is useful for multi-word searches like "blue cotton shirt"
          const words = searchQuery.split(' ');
          return words.every((word) => searchValue.includes(word));
        }
      });
    });
  }
}

/**
 * Utility functions for common operations
 */
export const ClosetUtils = {
  /**
   * Create a new closet organizer instance
   */
  createOrganizer: (items: ClothingItem[]) => new ClosetOrganizer(items),

  /**
   * Get category display name
   */
  getCategoryDisplayName: (category: ClothingCategory): string => {
    return CATEGORY_CONFIG[category].name;
  },

  /**
   * Get category icon
   */
  getCategoryIcon: (category: ClothingCategory): string => {
    return CATEGORY_CONFIG[category].icon;
  },

  /**
   * Get category color
   */
  getCategoryColor: (category: ClothingCategory): string => {
    return CATEGORY_CONFIG[category].color;
  },

  /**
   * Check if color matches a color family
   */
  isColorInFamily: (color: string, family: string): boolean => {
    const colorLower = color.toLowerCase();
    const familyLower = family.toLowerCase();

    return (
      colorLower === familyLower ||
      (
        COLOR_MAPPING[
          familyLower as keyof typeof COLOR_MAPPING
        ] as readonly string[]
      )?.includes(colorLower) ||
      false
    );
  },

  /**
   * Format date for display
   */
  formatDate: (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  },

  /**
   * Generate search suggestions based on items
   */
  generateSearchSuggestions: (items: ClothingItem[]): string[] => {
    const suggestions = new Set<string>();

    items.forEach((item) => {
      // Add item name words
      item.name.split(' ').forEach((word) => {
        if (word.length > 2) {
          suggestions.add(word.toLowerCase());
        }
      });

      // Add brand names
      if (item.metadata.brand) {
        suggestions.add(item.metadata.brand.toLowerCase());
      }

      // Add colors
      if (item.metadata.color) {
        suggestions.add(item.metadata.color.toLowerCase());
      }
    });

    return Array.from(suggestions).sort();
  },
};

export default ClosetOrganizer;
