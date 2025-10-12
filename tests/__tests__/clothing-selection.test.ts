/**
 * Unit Tests for Clothing Selection Logic
 *
 * Tests the validation utilities and selection logic for try-on functionality.
 */

import {
  validateItemSelection,
  validateCategorySelection,
  getSelectionStatistics,
  getSelectionRecommendations,
  DEFAULT_SELECTION_CONFIG,
  FREE_TIER_CONFIG,
  PREMIUM_TIER_CONFIG,
  type ItemSelection,
  type CategorySelection,
  type SelectionConfig,
} from '@/lib/utils/selectionValidation';
import { ClothingCategory } from '@/lib/types/common';

describe('Clothing Selection Logic', () => {
  // Mock data for testing
  const mockItems: ItemSelection[] = [
    {
      itemId: '1',
      category: 'shirts_tops' as ClothingCategory,
      name: 'Blue T-Shirt',
      isActive: true,
    },
    {
      itemId: '2',
      category: 'pants_bottoms' as ClothingCategory,
      name: 'Black Jeans',
      isActive: true,
    },
    {
      itemId: '3',
      category: 'shoes' as ClothingCategory,
      name: 'White Sneakers',
      isActive: true,
    },
    {
      itemId: '4',
      category: 'shirts_tops' as ClothingCategory,
      name: 'Red Hoodie',
      isActive: false,
    },
  ];

  const mockCategories: CategorySelection[] = [
    {
      category: 'shirts_tops' as ClothingCategory,
      itemCount: 2,
      selected: true,
    },
    {
      category: 'pants_bottoms' as ClothingCategory,
      itemCount: 1,
      selected: true,
    },
    {
      category: 'shoes' as ClothingCategory,
      itemCount: 1,
      selected: false,
    },
  ];

  describe('validateItemSelection', () => {
    it('should validate minimum item selection', () => {
      const config: SelectionConfig = {
        minItems: 2,
        maxItems: 5,
      };

      const result = validateItemSelection([mockItems[0]], config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please select at least 2 items');
      expect(result.canProceed).toBe(false);
    });

    it('should validate maximum item selection', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 2,
      };

      const result = validateItemSelection(mockItems.slice(0, 3), config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('You can select up to 2 items');
      expect(result.canProceed).toBe(false);
    });

    it('should validate active items only', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 5,
      };

      const result = validateItemSelection([mockItems[3]], config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('1 selected item is inactive');
      expect(result.canProceed).toBe(false);
    });

    it('should validate required categories', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 5,
        requiredCategories: ['shirts_tops', 'pants_bottoms'],
      };

      const result = validateItemSelection([mockItems[0]], config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Please select items from: pants_bottoms'
      );
      expect(result.canProceed).toBe(false);
    });

    it('should validate allowed categories', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 5,
        allowedCategories: ['shirts_tops'],
      };

      const result = validateItemSelection(
        [mockItems[0], mockItems[1]],
        config
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Items from these categories are not allowed: pants_bottoms'
      );
      expect(result.canProceed).toBe(false);
    });

    it('should validate tier limits', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 5,
        tierLimits: {
          maxItems: 2,
          maxCategories: 2,
        },
      };

      const result = validateItemSelection(mockItems.slice(0, 3), config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Your tier allows up to 2 items');
      expect(result.canProceed).toBe(false);
    });

    it('should detect duplicate items', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 5,
      };

      const duplicateItems = [mockItems[0], mockItems[0]];
      const result = validateItemSelection(duplicateItems, config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Duplicate items detected in selection');
      expect(result.canProceed).toBe(false);
    });

    it('should provide category diversity warnings', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 5,
      };

      const singleCategoryItems = [
        mockItems[0],
        { ...mockItems[0], itemId: '5' },
      ];
      const result = validateItemSelection(singleCategoryItems, config);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Consider selecting items from different categories for better results'
      );
      expect(result.canProceed).toBe(true);
    });

    it('should pass validation for valid selection', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 5,
      };

      const result = validateItemSelection(mockItems.slice(0, 2), config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.canProceed).toBe(true);
    });
  });

  describe('validateCategorySelection', () => {
    it('should validate minimum category selection', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 5,
      };

      const emptyCategories = mockCategories.map((cat) => ({
        ...cat,
        selected: false,
      }));
      const result = validateCategorySelection(emptyCategories, config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please select at least one category');
      expect(result.canProceed).toBe(false);
    });

    it('should validate tier limits for categories', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 5,
        tierLimits: {
          maxItems: 5,
          maxCategories: 1,
        },
      };

      const result = validateCategorySelection(mockCategories, config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Your tier allows up to 1 categories');
      expect(result.canProceed).toBe(false);
    });

    it('should validate categories with items', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 5,
      };

      const emptyCategories = mockCategories.map((cat) => ({
        ...cat,
        itemCount: 0,
      }));
      const result = validateCategorySelection(emptyCategories, config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Selected categories have no items: shirts_tops, pants_bottoms'
      );
      expect(result.canProceed).toBe(false);
    });

    it('should validate required categories', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 5,
        requiredCategories: ['shirts_tops', 'shoes'],
      };

      const result = validateCategorySelection(mockCategories, config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please select: shoes');
      expect(result.canProceed).toBe(false);
    });

    it('should validate allowed categories', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 5,
        allowedCategories: ['shirts_tops'],
      };

      const result = validateCategorySelection(mockCategories, config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'These categories are not allowed: pants_bottoms'
      );
      expect(result.canProceed).toBe(false);
    });

    it('should pass validation for valid category selection', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 5,
      };

      const result = validateCategorySelection(mockCategories, config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.canProceed).toBe(true);
    });
  });

  describe('getSelectionStatistics', () => {
    it('should calculate correct statistics', () => {
      const stats = getSelectionStatistics(mockItems.slice(0, 3));

      expect(stats.totalItems).toBe(3);
      expect(stats.uniqueCategories).toBe(3);
      expect(stats.categoryCounts).toEqual({
        shirts_tops: 1,
        pants_bottoms: 1,
        shoes: 1,
      });
      expect(stats.categoryDistribution).toHaveLength(3);
    });

    it('should handle empty selection', () => {
      const stats = getSelectionStatistics([]);

      expect(stats.totalItems).toBe(0);
      expect(stats.uniqueCategories).toBe(0);
      expect(stats.categoryCounts).toEqual({});
      expect(stats.categoryDistribution).toHaveLength(0);
    });

    it('should calculate percentages correctly', () => {
      const stats = getSelectionStatistics(mockItems.slice(0, 2));

      expect(stats.categoryDistribution[0].percentage).toBe(50);
      expect(stats.categoryDistribution[1].percentage).toBe(50);
    });
  });

  describe('getSelectionRecommendations', () => {
    it('should recommend category diversity', () => {
      const singleCategoryItems = [
        mockItems[0],
        { ...mockItems[0], itemId: '5' },
      ];
      const recommendations = getSelectionRecommendations(
        singleCategoryItems,
        mockItems
      );

      expect(recommendations).toContain(
        'Consider adding items from different categories for variety'
      );
    });

    it('should recommend color variety', () => {
      const colorItems = [
        { ...mockItems[0], name: 'Black Shirt' },
        { ...mockItems[1], name: 'Black Pants' },
      ];
      const recommendations = getSelectionRecommendations(
        colorItems,
        mockItems
      );

      expect(recommendations).toContain(
        'Try selecting items with different colors for better contrast'
      );
    });

    it('should recommend more items', () => {
      const recommendations = getSelectionRecommendations(
        [mockItems[0]],
        mockItems
      );

      expect(recommendations).toContain(
        'Adding more items can provide better try-on results'
      );
    });

    it('should recommend unused categories', () => {
      const recommendations = getSelectionRecommendations(
        [mockItems[0]],
        mockItems
      );

      expect(recommendations).toContain(
        'You have items in 2 other categories you could try'
      );
    });

    it('should return empty recommendations for optimal selection', () => {
      const recommendations = getSelectionRecommendations(
        mockItems.slice(0, 3),
        mockItems
      );

      expect(recommendations).toHaveLength(0);
    });
  });

  describe('Configuration Constants', () => {
    it('should have correct default configuration', () => {
      expect(DEFAULT_SELECTION_CONFIG.minItems).toBe(1);
      expect(DEFAULT_SELECTION_CONFIG.maxItems).toBe(5);
      expect(DEFAULT_SELECTION_CONFIG.allowedCategories).toEqual([
        'shirts_tops',
        'pants_bottoms',
        'shoes',
      ]);
    });

    it('should have correct free tier configuration', () => {
      expect(FREE_TIER_CONFIG.minItems).toBe(1);
      expect(FREE_TIER_CONFIG.maxItems).toBe(3);
      expect(FREE_TIER_CONFIG.tierLimits?.maxItems).toBe(3);
      expect(FREE_TIER_CONFIG.tierLimits?.maxCategories).toBe(2);
    });

    it('should have correct premium tier configuration', () => {
      expect(PREMIUM_TIER_CONFIG.minItems).toBe(1);
      expect(PREMIUM_TIER_CONFIG.maxItems).toBe(5);
      expect(PREMIUM_TIER_CONFIG.tierLimits?.maxItems).toBe(5);
      expect(PREMIUM_TIER_CONFIG.tierLimits?.maxCategories).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty item selection', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 5,
      };

      const result = validateItemSelection([], config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please select at least 1 item');
      expect(result.canProceed).toBe(false);
    });

    it('should handle single item selection', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 1,
      };

      const result = validateItemSelection([mockItems[0]], config);

      expect(result.isValid).toBe(true);
      expect(result.canProceed).toBe(true);
    });

    it('should handle maximum item selection', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 3,
      };

      const result = validateItemSelection(mockItems.slice(0, 3), config);

      expect(result.isValid).toBe(true);
      expect(result.canProceed).toBe(true);
    });

    it('should handle mixed active/inactive items', () => {
      const config: SelectionConfig = {
        minItems: 1,
        maxItems: 5,
      };

      const mixedItems = [mockItems[0], mockItems[3]]; // One active, one inactive
      const result = validateItemSelection(mixedItems, config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('1 selected item is inactive');
      expect(result.canProceed).toBe(false);
    });
  });
});
