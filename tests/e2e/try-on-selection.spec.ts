/**
 * E2E Tests for Try-On Selection Workflow
 *
 * Tests the complete user journey from category selection to try-on session creation.
 */

import { test, expect } from '@playwright/test';

test.describe('Try-On Selection Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/');
  });

  test('should complete full try-on selection workflow', async ({ page }) => {
    // Navigate to try-on page
    await page.goto('/try-on');
    await expect(page).toHaveURL('/try-on');

    // Step 1: Category Selection
    await expect(page.locator('h2')).toContainText('Select Categories');

    // Select categories
    await page.click('[data-testid="category-shirts_tops"]');
    await page.click('[data-testid="category-pants_bottoms"]');

    // Verify selection
    await expect(
      page.locator('[data-testid="category-shirts_tops"]')
    ).toHaveClass(/ring-primary/);
    await expect(
      page.locator('[data-testid="category-pants_bottoms"]')
    ).toHaveClass(/ring-primary/);

    // Proceed to next step
    await page.click('[data-testid="next-button"]');

    // Step 2: Item Selection
    await expect(page.locator('h2')).toContainText('Select Clothing Items');

    // Select items
    await page.click('[data-testid="item-1"]');
    await page.click('[data-testid="item-2"]');

    // Verify selection
    await expect(page.locator('[data-testid="item-1"]')).toHaveClass(
      /ring-primary/
    );
    await expect(page.locator('[data-testid="item-2"]')).toHaveClass(
      /ring-primary/
    );

    // Proceed to confirmation
    await page.click('[data-testid="next-button"]');

    // Step 3: Confirmation
    await expect(page.locator('h2')).toContainText('Confirm Your Selection');

    // Verify selected categories are displayed
    await expect(
      page.locator('[data-testid="selected-categories"]')
    ).toContainText('SHIRTS_TOPS');
    await expect(
      page.locator('[data-testid="selected-categories"]')
    ).toContainText('PANTS_BOTTOMS');

    // Verify selected items count
    await expect(
      page.locator('[data-testid="selected-items-count"]')
    ).toContainText('2 items selected');

    // Start try-on session
    await page.click('[data-testid="start-try-on-button"]');

    // Verify redirect to processing page
    await page.waitForURL(/\/try-on\/process\//);
    await expect(page.locator('h1')).toContainText('Processing Try-On');
  });

  test('should validate minimum item selection', async ({ page }) => {
    await page.goto('/try-on');

    // Select categories
    await page.click('[data-testid="category-shirts_tops"]');
    await page.click('[data-testid="next-button"]');

    // Try to proceed without selecting items
    await page.click('[data-testid="next-button"]');

    // Should show validation error
    await expect(
      page.locator('[data-testid="validation-error"]')
    ).toContainText('Please select at least one item');

    // Should not proceed to confirmation
    await expect(page.locator('h2')).toContainText('Select Clothing Items');
  });

  test('should enforce maximum item selection', async ({ page }) => {
    await page.goto('/try-on');

    // Select categories
    await page.click('[data-testid="category-shirts_tops"]');
    await page.click('[data-testid="next-button"]');

    // Try to select more than 5 items
    for (let i = 1; i <= 6; i++) {
      await page.click(`[data-testid="item-${i}"]`);
    }

    // Should show validation error
    await expect(
      page.locator('[data-testid="validation-error"]')
    ).toContainText('You can select up to 5 items');

    // Should not be able to select more items
    await expect(page.locator('[data-testid="item-7"]')).toBeDisabled();
  });

  test('should filter items by category', async ({ page }) => {
    await page.goto('/try-on');

    // Select only shirts category
    await page.click('[data-testid="category-shirts_tops"]');
    await page.click('[data-testid="next-button"]');

    // Should only show shirts items
    await expect(page.locator('[data-testid="item-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="item-2"]')).toBeVisible();

    // Should not show pants items
    await expect(page.locator('[data-testid="item-3"]')).not.toBeVisible();
  });

  test('should search items', async ({ page }) => {
    await page.goto('/try-on');

    // Select categories
    await page.click('[data-testid="category-shirts_tops"]');
    await page.click('[data-testid="next-button"]');

    // Search for specific item
    await page.fill('[data-testid="search-input"]', 'blue');

    // Should filter results
    await expect(page.locator('[data-testid="item-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="item-2"]')).not.toBeVisible();
  });

  test('should sort items', async ({ page }) => {
    await page.goto('/try-on');

    // Select categories
    await page.click('[data-testid="category-shirts_tops"]');
    await page.click('[data-testid="next-button"]');

    // Sort by name
    await page.selectOption('[data-testid="sort-select"]', 'name');

    // Verify items are sorted
    const items = page.locator('[data-testid^="item-"]');
    const firstItem = items.first();
    const lastItem = items.last();

    await expect(firstItem).toContainText('Blue Shirt');
    await expect(lastItem).toContainText('Red Hoodie');
  });

  test('should handle empty closet', async ({ page }) => {
    // Mock empty closet
    await page.route('**/api/clothing-items**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [] },
        }),
      });
    });

    await page.goto('/try-on');

    // Should show empty state
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-state"]')).toContainText(
      'No clothing items found'
    );

    // Should have upload button
    await expect(page.locator('[data-testid="upload-button"]')).toBeVisible();
  });

  test('should handle API errors', async ({ page }) => {
    // Mock API error
    await page.route('**/api/clothing-items**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Failed to load items',
        }),
      });
    });

    await page.goto('/try-on');

    // Should show error state
    await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-state"]')).toContainText(
      'Error Loading Items'
    );

    // Should have retry button
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should handle tier limits', async ({ page }) => {
    // Mock tier limit error
    await page.route('**/api/try-on/sessions', async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'TIER_LIMIT_EXCEEDED',
            message: 'Monthly try-ons limit reached',
            details: {
              resource: 'try_ons_per_month',
              currentUsage: 10,
              limit: 10,
              remaining: 0,
              upgradeRequired: true,
            },
          },
        }),
      });
    });

    await page.goto('/try-on');

    // Complete selection workflow
    await page.click('[data-testid="category-shirts_tops"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="item-1"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="start-try-on-button"]');

    // Should show tier limit error
    await expect(
      page.locator('[data-testid="tier-limit-error"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="tier-limit-error"]')
    ).toContainText('Monthly try-ons limit reached');

    // Should have upgrade button
    await expect(page.locator('[data-testid="upgrade-button"]')).toBeVisible();
  });

  test('should allow step navigation', async ({ page }) => {
    await page.goto('/try-on');

    // Step 1: Category Selection
    await page.click('[data-testid="category-shirts_tops"]');
    await page.click('[data-testid="next-button"]');

    // Step 2: Item Selection
    await page.click('[data-testid="item-1"]');
    await page.click('[data-testid="next-button"]');

    // Step 3: Confirmation
    await expect(page.locator('h2')).toContainText('Confirm Your Selection');

    // Go back to item selection
    await page.click('[data-testid="back-button"]');
    await expect(page.locator('h2')).toContainText('Select Clothing Items');

    // Go back to category selection
    await page.click('[data-testid="back-button"]');
    await expect(page.locator('h2')).toContainText('Select Categories');
  });

  test('should clear selection', async ({ page }) => {
    await page.goto('/try-on');

    // Select categories
    await page.click('[data-testid="category-shirts_tops"]');
    await page.click('[data-testid="category-pants_bottoms"]');

    // Clear selection
    await page.click('[data-testid="clear-selection-button"]');

    // Verify selection is cleared
    await expect(
      page.locator('[data-testid="category-shirts_tops"]')
    ).not.toHaveClass(/ring-primary/);
    await expect(
      page.locator('[data-testid="category-pants_bottoms"]')
    ).not.toHaveClass(/ring-primary/);
  });

  test('should show selection summary', async ({ page }) => {
    await page.goto('/try-on');

    // Complete selection
    await page.click('[data-testid="category-shirts_tops"]');
    await page.click('[data-testid="next-button"]');
    await page.click('[data-testid="item-1"]');
    await page.click('[data-testid="item-2"]');
    await page.click('[data-testid="next-button"]');

    // Verify summary
    await expect(
      page.locator('[data-testid="selection-summary"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="total-items"]')).toContainText(
      '2'
    );
    await expect(
      page.locator('[data-testid="selected-categories"]')
    ).toContainText('SHIRTS_TOPS');
  });

  test('should handle loading states', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/clothing-items**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { items: [] },
        }),
      });
    });

    await page.goto('/try-on');

    // Should show loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();

    // Wait for loading to complete
    await expect(
      page.locator('[data-testid="loading-spinner"]')
    ).not.toBeVisible();
  });
});
