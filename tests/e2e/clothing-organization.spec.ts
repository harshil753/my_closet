/**
 * E2E Tests for Clothing Organization Workflow
 * 
 * This test suite covers end-to-end user workflows for clothing organization,
 * including upload, categorization, filtering, and management.
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const testClothingItems = [
  {
    name: 'Blue Casual Shirt',
    category: 'shirts_tops',
    color: 'Blue',
    brand: 'Nike',
    size: 'M',
    notes: 'Perfect for casual outings'
  },
  {
    name: 'Black Formal Pants',
    category: 'pants',
    color: 'Black',
    brand: 'Hugo Boss',
    size: '32',
    notes: 'Business attire'
  },
  {
    name: 'Red Summer Dress',
    category: 'dresses',
    color: 'Red',
    brand: 'Zara',
    size: 'S',
    notes: 'Light and comfortable'
  }
];

test.describe('Clothing Organization Workflow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock authentication
    await page.addInitScript(() => {
      window.localStorage.setItem('auth-token', 'mock-token');
      window.localStorage.setItem('user', JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        tier: 'free'
      }));
    });

    // Mock API responses
    await page.route('**/api/clothing-items', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      });
    });

    await page.route('**/api/upload/clothing', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { id: 'new-item-id' }
        })
      });
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Upload Workflow', () => {
    test('should upload a clothing item successfully', async () => {
      await page.goto('/upload');
      
      // Fill form fields
      await page.fill('[data-testid="item-name"]', testClothingItems[0].name);
      await page.selectOption('[data-testid="category-select"]', testClothingItems[0].category);
      await page.fill('[data-testid="color-input"]', testClothingItems[0].color);
      await page.fill('[data-testid="brand-input"]', testClothingItems[0].brand);
      await page.fill('[data-testid="size-input"]', testClothingItems[0].size);
      await page.fill('[data-testid="notes-input"]', testClothingItems[0].notes);
      
      // Upload image
      const fileInput = page.locator('[data-testid="image-upload"]');
      await fileInput.setInputFiles({
        name: 'test-shirt.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });
      
      // Submit form
      await page.click('[data-testid="upload-button"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Item uploaded successfully');
    });

    test('should show validation errors for invalid input', async () => {
      await page.goto('/upload');
      
      // Try to submit empty form
      await page.click('[data-testid="upload-button"]');
      
      // Verify validation errors
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="name-error"]')).toContainText('Item name is required');
      
      await expect(page.locator('[data-testid="image-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="image-error"]')).toContainText('Please select an image');
    });

    test('should handle file size limits', async () => {
      await page.goto('/upload');
      
      // Fill form
      await page.fill('[data-testid="item-name"]', 'Test Item');
      await page.selectOption('[data-testid="category-select"]', 'shirts_tops');
      
      // Mock large file upload
      const fileInput = page.locator('[data-testid="image-upload"]');
      await fileInput.setInputFiles({
        name: 'large-image.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.alloc(60 * 1024 * 1024) // 60MB
      });
      
      // Verify file size error
      await expect(page.locator('[data-testid="file-size-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-size-error"]')).toContainText('File too large');
    });

    test('should handle tier limits for free users', async () => {
      // Mock tier limit response
      await page.route('**/api/upload/clothing', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Upload limit reached for free tier'
          })
        });
      });

      await page.goto('/upload');
      
      // Fill and submit form
      await page.fill('[data-testid="item-name"]', 'Test Item');
      await page.selectOption('[data-testid="category-select"]', 'shirts_tops');
      
      const fileInput = page.locator('[data-testid="image-upload"]');
      await fileInput.setInputFiles({
        name: 'test.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });
      
      await page.click('[data-testid="upload-button"]');
      
      // Verify tier limit message
      await expect(page.locator('[data-testid="tier-limit-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="tier-limit-message"]')).toContainText('Upload limit reached');
    });
  });

  test.describe('Closet Organization Workflow', () => {
    test.beforeEach(async () => {
      // Mock closet with items
      await page.route('**/api/clothing-items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: testClothingItems.map((item, index) => ({
              id: `item-${index + 1}`,
              name: item.name,
              category: item.category,
              imageUrl: `/images/${item.name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
              metadata: {
                color: item.color,
                brand: item.brand,
                size: item.size,
                notes: item.notes
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              userId: 'test-user-id'
            }))
          })
        });
      });
    });

    test('should display clothing items in closet', async () => {
      await page.goto('/closet');
      
      // Verify items are displayed
      await expect(page.locator('[data-testid="clothing-item-card"]')).toHaveCount(3);
      await expect(page.locator('text=Blue Casual Shirt')).toBeVisible();
      await expect(page.locator('text=Black Formal Pants')).toBeVisible();
      await expect(page.locator('text=Red Summer Dress')).toBeVisible();
    });

    test('should filter items by category', async () => {
      await page.goto('/closet');
      
      // Apply category filter
      await page.selectOption('[data-testid="category-filter"]', 'shirts_tops');
      
      // Verify only shirts are shown
      await expect(page.locator('[data-testid="clothing-item-card"]')).toHaveCount(1);
      await expect(page.locator('text=Blue Casual Shirt')).toBeVisible();
      await expect(page.locator('text=Black Formal Pants')).not.toBeVisible();
      await expect(page.locator('text=Red Summer Dress')).not.toBeVisible();
    });

    test('should filter items by color', async () => {
      await page.goto('/closet');
      
      // Apply color filter
      await page.selectOption('[data-testid="color-filter"]', 'Blue');
      
      // Verify only blue items are shown
      await expect(page.locator('[data-testid="clothing-item-card"]')).toHaveCount(1);
      await expect(page.locator('text=Blue Casual Shirt')).toBeVisible();
      await expect(page.locator('text=Black Formal Pants')).not.toBeVisible();
      await expect(page.locator('text=Red Summer Dress')).not.toBeVisible();
    });

    test('should search items by name', async () => {
      await page.goto('/closet');
      
      // Search for specific item
      await page.fill('[data-testid="search-input"]', 'dress');
      
      // Verify only dress is shown
      await expect(page.locator('[data-testid="clothing-item-card"]')).toHaveCount(1);
      await expect(page.locator('text=Red Summer Dress')).toBeVisible();
      await expect(page.locator('text=Blue Casual Shirt')).not.toBeVisible();
      await expect(page.locator('text=Black Formal Pants')).not.toBeVisible();
    });

    test('should sort items by name', async () => {
      await page.goto('/closet');
      
      // Sort by name
      await page.selectOption('[data-testid="sort-select"]', 'name');
      
      // Verify items are sorted alphabetically
      const items = page.locator('[data-testid="clothing-item-card"]');
      await expect(items.nth(0)).toContainText('Black Formal Pants');
      await expect(items.nth(1)).toContainText('Blue Casual Shirt');
      await expect(items.nth(2)).toContainText('Red Summer Dress');
    });

    test('should sort items by date', async () => {
      await page.goto('/closet');
      
      // Sort by date
      await page.selectOption('[data-testid="sort-select"]', 'date');
      
      // Verify items are sorted by date (newest first)
      const items = page.locator('[data-testid="clothing-item-card"]');
      await expect(items.nth(0)).toContainText('Red Summer Dress');
      await expect(items.nth(1)).toContainText('Black Formal Pants');
      await expect(items.nth(2)).toContainText('Blue Casual Shirt');
    });

    test('should switch between grid and list view', async () => {
      await page.goto('/closet');
      
      // Verify default grid view
      await expect(page.locator('[data-testid="closet-grid-view"]')).toBeVisible();
      
      // Switch to list view
      await page.click('[data-testid="list-view-button"]');
      await expect(page.locator('[data-testid="closet-list-view"]')).toBeVisible();
      
      // Switch back to grid view
      await page.click('[data-testid="grid-view-button"]');
      await expect(page.locator('[data-testid="closet-grid-view"]')).toBeVisible();
    });
  });

  test.describe('Item Management Workflow', () => {
    test.beforeEach(async () => {
      // Mock closet with items
      await page.route('**/api/clothing-items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: testClothingItems.map((item, index) => ({
              id: `item-${index + 1}`,
              name: item.name,
              category: item.category,
              imageUrl: `/images/${item.name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
              metadata: {
                color: item.color,
                brand: item.brand,
                size: item.size,
                notes: item.notes
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              userId: 'test-user-id'
            }))
          })
        });
      });
    });

    test('should view item details', async () => {
      await page.goto('/closet');
      
      // Click on first item
      await page.click('[data-testid="clothing-item-card"]:first-child');
      
      // Verify detail modal opens
      await expect(page.locator('[data-testid="item-detail-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="item-detail-modal"]')).toContainText('Blue Casual Shirt');
      await expect(page.locator('[data-testid="item-detail-modal"]')).toContainText('Nike');
      await expect(page.locator('[data-testid="item-detail-modal"]')).toContainText('M');
    });

    test('should edit item details', async () => {
      await page.goto('/closet');
      
      // Click edit on first item
      await page.click('[data-testid="clothing-item-card"]:first-child [data-testid="edit-button"]');
      
      // Verify edit modal opens
      await expect(page.locator('[data-testid="edit-item-modal"]')).toBeVisible();
      
      // Modify item details
      await page.fill('[data-testid="edit-name-input"]', 'Updated Blue Shirt');
      await page.fill('[data-testid="edit-notes-input"]', 'Updated notes');
      
      // Save changes
      await page.click('[data-testid="save-changes-button"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Item updated successfully');
    });

    test('should delete item with confirmation', async () => {
      await page.goto('/closet');
      
      // Click delete on first item
      await page.click('[data-testid="clothing-item-card"]:first-child [data-testid="delete-button"]');
      
      // Verify confirmation dialog
      await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
      await expect(page.locator('[data-testid="delete-confirmation"]')).toContainText('Are you sure you want to delete this item?');
      
      // Confirm deletion
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Item deleted successfully');
      
      // Verify item is removed from list
      await expect(page.locator('[data-testid="clothing-item-card"]')).toHaveCount(2);
    });

    test('should cancel item deletion', async () => {
      await page.goto('/closet');
      
      // Click delete on first item
      await page.click('[data-testid="clothing-item-card"]:first-child [data-testid="delete-button"]');
      
      // Verify confirmation dialog
      await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
      
      // Cancel deletion
      await page.click('[data-testid="cancel-delete-button"]');
      
      // Verify item is still in list
      await expect(page.locator('[data-testid="clothing-item-card"]')).toHaveCount(3);
      await expect(page.locator('text=Blue Casual Shirt')).toBeVisible();
    });

    test('should select multiple items', async () => {
      await page.goto('/closet');
      
      // Enable selection mode
      await page.click('[data-testid="select-mode-button"]');
      
      // Select multiple items
      await page.click('[data-testid="clothing-item-card"]:first-child');
      await page.click('[data-testid="clothing-item-card"]:nth-child(2)');
      
      // Verify selection
      await expect(page.locator('[data-testid="selected-count"]')).toContainText('2 items selected');
      
      // Verify selected items are highlighted
      await expect(page.locator('[data-testid="clothing-item-card"]:first-child')).toHaveClass(/selected/);
      await expect(page.locator('[data-testid="clothing-item-card"]:nth-child(2)')).toHaveClass(/selected/);
    });

    test('should bulk delete selected items', async () => {
      await page.goto('/closet');
      
      // Enable selection mode
      await page.click('[data-testid="select-mode-button"]');
      
      // Select multiple items
      await page.click('[data-testid="clothing-item-card"]:first-child');
      await page.click('[data-testid="clothing-item-card"]:nth-child(2)');
      
      // Click bulk delete
      await page.click('[data-testid="bulk-delete-button"]');
      
      // Verify confirmation dialog
      await expect(page.locator('[data-testid="bulk-delete-confirmation"]')).toBeVisible();
      await expect(page.locator('[data-testid="bulk-delete-confirmation"]')).toContainText('Delete 2 selected items?');
      
      // Confirm deletion
      await page.click('[data-testid="confirm-bulk-delete-button"]');
      
      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('2 items deleted successfully');
      
      // Verify items are removed
      await expect(page.locator('[data-testid="clothing-item-card"]')).toHaveCount(1);
    });
  });

  test.describe('Pagination Workflow', () => {
    test.beforeEach(async () => {
      // Mock many items for pagination
      const manyItems = Array.from({ length: 25 }, (_, i) => ({
        id: `item-${i + 1}`,
        name: `Item ${i + 1}`,
        category: 'shirts_tops',
        imageUrl: `/images/item-${i + 1}.jpg`,
        metadata: {
          color: 'Blue',
          brand: 'Nike',
          size: 'M',
          notes: 'Test item'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: 'test-user-id'
      }));

      await page.route('**/api/clothing-items', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: manyItems
          })
        });
      });
    });

    test('should navigate between pages', async () => {
      await page.goto('/closet');
      
      // Verify pagination controls
      await expect(page.locator('[data-testid="pagination-info"]')).toContainText('Page 1 of 3');
      await expect(page.locator('[data-testid="next-page-button"]')).toBeVisible();
      
      // Navigate to next page
      await page.click('[data-testid="next-page-button"]');
      
      // Verify page 2
      await expect(page.locator('[data-testid="pagination-info"]')).toContainText('Page 2 of 3');
      await expect(page.locator('[data-testid="prev-page-button"]')).toBeVisible();
      
      // Navigate to previous page
      await page.click('[data-testid="prev-page-button"]');
      
      // Verify back to page 1
      await expect(page.locator('[data-testid="pagination-info"]')).toContainText('Page 1 of 3');
    });

    test('should jump to specific page', async () => {
      await page.goto('/closet');
      
      // Click page 3
      await page.click('[data-testid="page-3-button"]');
      
      // Verify page 3
      await expect(page.locator('[data-testid="pagination-info"]')).toContainText('Page 3 of 3');
      await expect(page.locator('[data-testid="prev-page-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="next-page-button"]')).toBeDisabled();
    });
  });

  test.describe('Error Handling Workflow', () => {
    test('should handle network errors gracefully', async () => {
      // Mock network error
      await page.route('**/api/clothing-items', async (route) => {
        await route.abort('failed');
      });

      await page.goto('/closet');
      
      // Verify error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Failed to load items');
      
      // Verify retry button
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should retry failed requests', async () => {
      let requestCount = 0;
      
      await page.route('**/api/clothing-items', async (route) => {
        requestCount++;
        if (requestCount === 1) {
          await route.abort('failed');
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: testClothingItems.map((item, index) => ({
                id: `item-${index + 1}`,
                name: item.name,
                category: item.category,
                imageUrl: `/images/${item.name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
                metadata: item,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                userId: 'test-user-id'
              }))
            })
          });
        }
      });

      await page.goto('/closet');
      
      // Verify error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      
      // Click retry
      await page.click('[data-testid="retry-button"]');
      
      // Verify items load successfully
      await expect(page.locator('[data-testid="clothing-item-card"]')).toHaveCount(3);
      await expect(page.locator('text=Blue Casual Shirt')).toBeVisible();
    });
  });
});
