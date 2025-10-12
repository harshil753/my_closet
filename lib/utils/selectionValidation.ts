/**
 * Selection Validation Utilities
 *
 * This module provides validation functions for try-on selection,
 * including item limits, category requirements, and tier restrictions.
 */

import { ClothingCategory } from '@/lib/types/common';

// Selection validation result interface
export interface SelectionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canProceed: boolean;
}

// Selection configuration interface
export interface SelectionConfig {
  minItems: number;
  maxItems: number;
  requiredCategories?: ClothingCategory[];
  allowedCategories?: ClothingCategory[];
  tierLimits?: {
    maxItems: number;
    maxCategories: number;
  };
}

// Item selection interface
export interface ItemSelection {
  itemId: string;
  category: ClothingCategory;
  name: string;
  isActive: boolean;
}

// Category selection interface
export interface CategorySelection {
  category: ClothingCategory;
  itemCount: number;
  selected: boolean;
}

/**
 * Validate item selection
 */
export function validateItemSelection(
  selectedItems: ItemSelection[],
  config: SelectionConfig
): SelectionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check minimum items
  if (selectedItems.length < config.minItems) {
    errors.push(
      `Please select at least ${config.minItems} item${config.minItems !== 1 ? 's' : ''}`
    );
  }

  // Check maximum items
  if (selectedItems.length > config.maxItems) {
    errors.push(`You can select up to ${config.maxItems} items`);
  }

  // Check if all items are active
  const inactiveItems = selectedItems.filter((item) => !item.isActive);
  if (inactiveItems.length > 0) {
    errors.push(
      `${inactiveItems.length} selected item${inactiveItems.length !== 1 ? 's' : ''} are inactive`
    );
  }

  // Check required categories
  if (config.requiredCategories && config.requiredCategories.length > 0) {
    const selectedCategories = new Set(
      selectedItems.map((item) => item.category)
    );
    const missingCategories = config.requiredCategories.filter(
      (category) => !selectedCategories.has(category)
    );

    if (missingCategories.length > 0) {
      errors.push(`Please select items from: ${missingCategories.join(', ')}`);
    }
  }

  // Check allowed categories
  if (config.allowedCategories && config.allowedCategories.length > 0) {
    const selectedCategories = new Set(
      selectedItems.map((item) => item.category)
    );
    const disallowedCategories = Array.from(selectedCategories).filter(
      (category) => !config.allowedCategories!.includes(category)
    );

    if (disallowedCategories.length > 0) {
      errors.push(
        `Items from these categories are not allowed: ${disallowedCategories.join(', ')}`
      );
    }
  }

  // Check tier limits
  if (config.tierLimits) {
    if (selectedItems.length > config.tierLimits.maxItems) {
      errors.push(`Your tier allows up to ${config.tierLimits.maxItems} items`);
    }
  }

  // Check for category diversity
  const categoryCount = new Set(selectedItems.map((item) => item.category))
    .size;
  if (categoryCount < 2 && selectedItems.length > 1) {
    warnings.push(
      'Consider selecting items from different categories for better results'
    );
  }

  // Check for duplicate items
  const duplicateIds = selectedItems
    .map((item) => item.itemId)
    .filter((id, index, array) => array.indexOf(id) !== index);

  if (duplicateIds.length > 0) {
    errors.push('Duplicate items detected in selection');
  }

  const isValid = errors.length === 0;
  const canProceed = isValid && selectedItems.length >= config.minItems;

  return {
    isValid,
    errors,
    warnings,
    canProceed,
  };
}

/**
 * Validate category selection
 */
export function validateCategorySelection(
  selectedCategories: CategorySelection[],
  config: SelectionConfig
): SelectionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const selected = selectedCategories.filter((cat) => cat.selected);
  const selectedCount = selected.length;

  // Check minimum categories
  if (selectedCount < 1) {
    errors.push('Please select at least one category');
  }

  // Check maximum categories
  if (config.tierLimits && selectedCount > config.tierLimits.maxCategories) {
    errors.push(
      `Your tier allows up to ${config.tierLimits.maxCategories} categories`
    );
  }

  // Check if selected categories have items
  const emptyCategories = selected.filter((cat) => cat.itemCount === 0);
  if (emptyCategories.length > 0) {
    errors.push(
      `Selected categories have no items: ${emptyCategories.map((cat) => cat.category).join(', ')}`
    );
  }

  // Check required categories
  if (config.requiredCategories && config.requiredCategories.length > 0) {
    const selectedCategoryNames = selected.map((cat) => cat.category);
    const missingCategories = config.requiredCategories.filter(
      (category) => !selectedCategoryNames.includes(category)
    );

    if (missingCategories.length > 0) {
      errors.push(`Please select: ${missingCategories.join(', ')}`);
    }
  }

  // Check allowed categories
  if (config.allowedCategories && config.allowedCategories.length > 0) {
    const selectedCategoryNames = selected.map((cat) => cat.category);
    const disallowedCategories = selectedCategoryNames.filter(
      (category) => !config.allowedCategories!.includes(category)
    );

    if (disallowedCategories.length > 0) {
      errors.push(
        `These categories are not allowed: ${disallowedCategories.join(', ')}`
      );
    }
  }

  const isValid = errors.length === 0;
  const canProceed = isValid && selectedCount > 0;

  return {
    isValid,
    errors,
    warnings,
    canProceed,
  };
}

/**
 * Get selection statistics
 */
export function getSelectionStatistics(selectedItems: ItemSelection[]) {
  const categoryCounts = selectedItems.reduce(
    (acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    },
    {} as Record<ClothingCategory, number>
  );

  const uniqueCategories = Object.keys(categoryCounts).length;
  const totalItems = selectedItems.length;

  return {
    totalItems,
    uniqueCategories,
    categoryCounts,
    categoryDistribution: Object.entries(categoryCounts).map(
      ([category, count]) => ({
        category: category as ClothingCategory,
        count,
        percentage: Math.round((count / totalItems) * 100),
      })
    ),
  };
}

/**
 * Get selection recommendations
 */
export function getSelectionRecommendations(
  selectedItems: ItemSelection[],
  availableItems: ItemSelection[]
): string[] {
  const recommendations: string[] = [];
  const stats = getSelectionStatistics(selectedItems);

  // Check for category balance
  if (stats.uniqueCategories === 1 && selectedItems.length > 1) {
    recommendations.push(
      'Consider adding items from different categories for variety'
    );
  }

  // Check for color variety
  const colors = selectedItems
    .map((item) => item.name.toLowerCase())
    .filter(
      (name) =>
        name.includes('color') ||
        name.includes('black') ||
        name.includes('white')
    );

  if (colors.length === selectedItems.length) {
    recommendations.push(
      'Try selecting items with different colors for better contrast'
    );
  }

  // Check for item count
  if (selectedItems.length < 3) {
    recommendations.push('Adding more items can provide better try-on results');
  }

  // Check for category coverage
  const availableCategories = new Set(
    availableItems.map((item) => item.category)
  );
  const selectedCategories = new Set(
    selectedItems.map((item) => item.category)
  );
  const unusedCategories = Array.from(availableCategories).filter(
    (cat) => !selectedCategories.has(cat)
  );

  if (unusedCategories.length > 0) {
    recommendations.push(
      `You have items in ${unusedCategories.length} other categories you could try`
    );
  }

  return recommendations;
}

/**
 * Default selection configuration
 */
export const DEFAULT_SELECTION_CONFIG: SelectionConfig = {
  minItems: 1,
  maxItems: 5,
  allowedCategories: ['shirts_tops', 'pants_bottoms', 'shoes'],
};

/**
 * Free tier selection configuration
 */
export const FREE_TIER_CONFIG: SelectionConfig = {
  minItems: 1,
  maxItems: 3,
  allowedCategories: ['shirts_tops', 'pants_bottoms', 'shoes'],
  tierLimits: {
    maxItems: 3,
    maxCategories: 2,
  },
};

/**
 * Premium tier selection configuration
 */
export const PREMIUM_TIER_CONFIG: SelectionConfig = {
  minItems: 1,
  maxItems: 5,
  allowedCategories: ['shirts_tops', 'pants_bottoms', 'shoes'],
  tierLimits: {
    maxItems: 5,
    maxCategories: 3,
  },
};
