/**
 * E2E tests for complete try-on workflow
 * Tests the full user journey from login to virtual try-on generation
 */

import { test, expect } from '@playwright/test';

test.describe('Complete Try-On Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('User Authentication Flow', () => {
    test('should allow user to register and login', async ({ page }) => {
      // Click on register/sign up button
      await page.click('text=Sign Up');

      // Fill registration form
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.fill('input[name="displayName"]', 'Test User');

      // Submit registration
      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard
      await page.waitForURL('/dashboard');

      // Verify user is logged in
      await expect(page.locator('text=Welcome, Test User')).toBeVisible();
    });

    test('should allow existing user to login', async ({ page }) => {
      // Click on login button
      await page.click('text=Log In');

      // Fill login form
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');

      // Submit login
      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard
      await page.waitForURL('/dashboard');

      // Verify user is logged in
      await expect(page.locator('text=Welcome, Test User')).toBeVisible();
    });
  });

  test.describe('Base Photo Upload Flow', () => {
    test('should allow user to upload base photos', async ({ page }) => {
      // Login first
      await page.click('text=Log In');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');

      // Navigate to profile page
      await page.click('text=Profile');
      await page.waitForURL('/dashboard/profile');

      // Upload front photo
      await page.setInputFiles('input[type="file"][accept="image/*"]', {
        name: 'front-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data-front'),
      });

      // Select photo type
      await page.selectOption('select[name="photoType"]', 'front');

      // Upload photo
      await page.click('button:has-text("Upload Photo")');

      // Wait for upload to complete
      await expect(
        page.locator('text=Photo uploaded successfully')
      ).toBeVisible();

      // Upload side photo
      await page.setInputFiles('input[type="file"][accept="image/*"]', {
        name: 'side-photo.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data-side'),
      });

      await page.selectOption('select[name="photoType"]', 'side');
      await page.click('button:has-text("Upload Photo")');

      await expect(
        page.locator('text=Photo uploaded successfully')
      ).toBeVisible();

      // Verify photos are displayed
      await expect(
        page.locator('[data-testid="base-photo-front"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="base-photo-side"]')
      ).toBeVisible();
    });

    test('should validate base photo requirements', async ({ page }) => {
      // Login and navigate to profile
      await page.click('text=Log In');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      await page.click('text=Profile');
      await page.waitForURL('/dashboard/profile');

      // Try to upload invalid file
      await page.setInputFiles('input[type="file"][accept="image/*"]', {
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('fake-pdf-data'),
      });

      await page.click('button:has-text("Upload Photo")');

      // Should show validation error
      await expect(
        page.locator('text=Please upload a valid image file')
      ).toBeVisible();
    });
  });

  test.describe('Clothing Upload Flow', () => {
    test('should allow user to upload clothing items', async ({ page }) => {
      // Login and navigate to upload page
      await page.click('text=Log In');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      await page.click('text=Upload');
      await page.waitForURL('/dashboard/upload');

      // Upload first clothing item
      await page.setInputFiles('input[type="file"][accept="image/*"]', {
        name: 'blue-shirt.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data-shirt'),
      });

      await page.fill('input[name="itemName"]', 'Blue Cotton Shirt');
      await page.selectOption('select[name="category"]', 'shirts_tops');

      await page.click('button:has-text("Upload Item")');

      // Wait for upload to complete
      await expect(
        page.locator('text=Item uploaded successfully')
      ).toBeVisible();

      // Upload second clothing item
      await page.setInputFiles('input[type="file"][accept="image/*"]', {
        name: 'black-jeans.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data-jeans'),
      });

      await page.fill('input[name="itemName"]', 'Black Denim Jeans');
      await page.selectOption('select[name="category"]', 'pants_bottoms');

      await page.click('button:has-text("Upload Item")');

      await expect(
        page.locator('text=Item uploaded successfully')
      ).toBeVisible();

      // Navigate to closet to verify items
      await page.click('text=Closet');
      await page.waitForURL('/dashboard/closet');

      // Verify items are displayed
      await expect(page.locator('text=Blue Cotton Shirt')).toBeVisible();
      await expect(page.locator('text=Black Denim Jeans')).toBeVisible();
    });

    test('should validate clothing item requirements', async ({ page }) => {
      // Login and navigate to upload page
      await page.click('text=Log In');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      await page.click('text=Upload');
      await page.waitForURL('/dashboard/upload');

      // Try to upload without required fields
      await page.setInputFiles('input[type="file"][accept="image/*"]', {
        name: 'test-image.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data'),
      });

      // Don't fill name or category
      await page.click('button:has-text("Upload Item")');

      // Should show validation errors
      await expect(page.locator('text=Item name is required')).toBeVisible();
      await expect(page.locator('text=Category is required')).toBeVisible();
    });
  });

  test.describe('Try-On Selection Flow', () => {
    test('should allow user to select clothing items for try-on', async ({
      page,
    }) => {
      // Login and navigate to try-on page
      await page.click('text=Log In');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      await page.click('text=Try On');
      await page.waitForURL('/dashboard/try-on');

      // Select category
      await page.click('button:has-text("Shirts & Tops")');

      // Wait for items to load
      await page.waitForSelector('[data-testid="clothing-item"]');

      // Select first item
      await page.click(
        '[data-testid="clothing-item"]:first-child input[type="checkbox"]'
      );

      // Select another category
      await page.click('button:has-text("Pants & Bottoms")');
      await page.waitForSelector('[data-testid="clothing-item"]');

      // Select second item
      await page.click(
        '[data-testid="clothing-item"]:first-child input[type="checkbox"]'
      );

      // Verify selection summary
      await expect(page.locator('text=2 items selected')).toBeVisible();

      // Proceed to processing
      await page.click('button:has-text("Generate Try-On")');

      // Should navigate to processing page
      await page.waitForURL('/dashboard/try-on/process/*');
    });

    test('should validate minimum selection requirements', async ({ page }) => {
      // Login and navigate to try-on page
      await page.click('text=Log In');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      await page.click('text=Try On');
      await page.waitForURL('/dashboard/try-on');

      // Try to proceed without selecting items
      await page.click('button:has-text("Generate Try-On")');

      // Should show validation error
      await expect(
        page.locator('text=Please select at least one clothing item')
      ).toBeVisible();
    });

    test('should enforce maximum selection limits', async ({ page }) => {
      // Login and navigate to try-on page
      await page.click('text=Log In');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      await page.click('text=Try On');
      await page.waitForURL('/dashboard/try-on');

      // Select multiple items (more than 5)
      for (let i = 0; i < 6; i++) {
        await page.click(
          `[data-testid="clothing-item"]:nth-child(${i + 1}) input[type="checkbox"]`
        );
      }

      // Should show limit warning
      await expect(page.locator('text=Maximum 5 items allowed')).toBeVisible();

      // Generate button should be disabled
      await expect(
        page.locator('button:has-text("Generate Try-On")')
      ).toBeDisabled();
    });
  });

  test.describe('AI Processing Flow', () => {
    test('should process virtual try-on request successfully', async ({
      page,
    }) => {
      // Login and navigate to try-on page
      await page.click('text=Log In');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      await page.click('text=Try On');
      await page.waitForURL('/dashboard/try-on');

      // Select items
      await page.click(
        '[data-testid="clothing-item"]:first-child input[type="checkbox"]'
      );
      await page.click('button:has-text("Generate Try-On")');

      // Should navigate to processing page
      await page.waitForURL('/dashboard/try-on/process/*');

      // Should show processing status
      await expect(
        page.locator('text=Processing your virtual try-on')
      ).toBeVisible();
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();

      // Wait for processing to complete (mock successful result)
      await page.waitForSelector('text=Try-on completed successfully', {
        timeout: 30000,
      });

      // Should show result image
      await expect(page.locator('[data-testid="result-image"]')).toBeVisible();

      // Should show download and share options
      await expect(page.locator('button:has-text("Download")')).toBeVisible();
      await expect(page.locator('button:has-text("Share")')).toBeVisible();
    });

    test('should handle AI processing failures gracefully', async ({
      page,
    }) => {
      // Login and navigate to try-on page
      await page.click('text=Log In');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      await page.click('text=Try On');
      await page.waitForURL('/dashboard/try-on');

      // Select items
      await page.click(
        '[data-testid="clothing-item"]:first-child input[type="checkbox"]'
      );
      await page.click('button:has-text("Generate Try-On")');

      // Should navigate to processing page
      await page.waitForURL('/dashboard/try-on/process/*');

      // Mock AI processing failure
      await page.waitForSelector('text=Processing failed', { timeout: 30000 });

      // Should show error message
      await expect(
        page.locator('text=AI service temporarily unavailable')
      ).toBeVisible();

      // Should show retry option
      await expect(page.locator('button:has-text("Try Again")')).toBeVisible();

      // Should show suggested actions
      await expect(
        page.locator('text=Wait a few minutes and try again')
      ).toBeVisible();
    });

    test('should show processing progress and status updates', async ({
      page,
    }) => {
      // Login and navigate to try-on page
      await page.click('text=Log In');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      await page.click('text=Try On');
      await page.waitForURL('/dashboard/try-on');

      // Select items
      await page.click(
        '[data-testid="clothing-item"]:first-child input[type="checkbox"]'
      );
      await page.click('button:has-text("Generate Try-On")');

      // Should navigate to processing page
      await page.waitForURL('/dashboard/try-on/process/*');

      // Should show initial status
      await expect(page.locator('text=Preparing images')).toBeVisible();

      // Should show progress updates
      await expect(page.locator('text=Analyzing clothing items')).toBeVisible();
      await expect(
        page.locator('text=Generating virtual try-on')
      ).toBeVisible();
      await expect(page.locator('text=Finalizing result')).toBeVisible();

      // Should show completion
      await expect(
        page.locator('text=Try-on completed successfully')
      ).toBeVisible();
    });
  });

  test.describe('Result Management Flow', () => {
    test('should allow user to download result image', async ({ page }) => {
      // Complete try-on process first
      await page.click('text=Log In');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      await page.click('text=Try On');
      await page.waitForURL('/dashboard/try-on');
      await page.click(
        '[data-testid="clothing-item"]:first-child input[type="checkbox"]'
      );
      await page.click('button:has-text("Generate Try-On")');
      await page.waitForURL('/dashboard/try-on/process/*');
      await page.waitForSelector('text=Try-on completed successfully', {
        timeout: 30000,
      });

      // Click download button
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Download")');

      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toMatch(/try-on-result-.*\.jpg/);
    });

    test('should allow user to share result', async ({ page }) => {
      // Complete try-on process first
      await page.click('text=Log In');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      await page.click('text=Try On');
      await page.waitForURL('/dashboard/try-on');
      await page.click(
        '[data-testid="clothing-item"]:first-child input[type="checkbox"]'
      );
      await page.click('button:has-text("Generate Try-On")');
      await page.waitForURL('/dashboard/try-on/process/*');
      await page.waitForSelector('text=Try-on completed successfully', {
        timeout: 30000,
      });

      // Click share button
      await page.click('button:has-text("Share")');

      // Should show share options
      await expect(
        page.locator('text=Share your virtual try-on')
      ).toBeVisible();
      await expect(page.locator('button:has-text("Copy Link")')).toBeVisible();
      await expect(
        page.locator('button:has-text("Share on Social Media")')
      ).toBeVisible();
    });

    test('should allow user to create new try-on from result page', async ({
      page,
    }) => {
      // Complete try-on process first
      await page.click('text=Log In');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      await page.click('text=Try On');
      await page.waitForURL('/dashboard/try-on');
      await page.click(
        '[data-testid="clothing-item"]:first-child input[type="checkbox"]'
      );
      await page.click('button:has-text("Generate Try-On")');
      await page.waitForURL('/dashboard/try-on/process/*');
      await page.waitForSelector('text=Try-on completed successfully', {
        timeout: 30000,
      });

      // Click create new try-on button
      await page.click('button:has-text("Create New Try-On")');

      // Should navigate back to selection page
      await page.waitForURL('/dashboard/try-on');

      // Should reset selection
      await expect(page.locator('text=0 items selected')).toBeVisible();
    });
  });

  test.describe('Tier Enforcement Flow', () => {
    test('should enforce free tier limits', async ({ page }) => {
      // Login as free user
      await page.click('text=Log In');
      await page.fill('input[name="email"]', 'freeuser@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');

      // Navigate to try-on page
      await page.click('text=Try On');
      await page.waitForURL('/dashboard/try-on');

      // Mock reaching monthly limit
      await page.evaluate(() => {
        window.localStorage.setItem('tryOnUsage', '100');
        window.localStorage.setItem('tryOnLimit', '100');
      });

      // Try to create try-on
      await page.click(
        '[data-testid="clothing-item"]:first-child input[type="checkbox"]'
      );
      await page.click('button:has-text("Generate Try-On")');

      // Should show limit exceeded message
      await expect(
        page.locator('text=Monthly try-on limit exceeded')
      ).toBeVisible();
      await expect(
        page.locator('text=Upgrade to Premium for unlimited try-ons')
      ).toBeVisible();

      // Should show upgrade button
      await expect(
        page.locator('button:has-text("Upgrade to Premium")')
      ).toBeVisible();
    });

    test('should allow premium users unlimited usage', async ({ page }) => {
      // Login as premium user
      await page.click('text=Log In');
      await page.fill('input[name="email"]', 'premiumuser@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');

      // Navigate to try-on page
      await page.click('text=Try On');
      await page.waitForURL('/dashboard/try-on');

      // Should not show limit warnings
      await expect(
        page.locator('text=Monthly try-on limit exceeded')
      ).not.toBeVisible();

      // Should be able to create try-on
      await page.click(
        '[data-testid="clothing-item"]:first-child input[type="checkbox"]'
      );
      await page.click('button:has-text("Generate Try-On")');

      // Should proceed to processing
      await page.waitForURL('/dashboard/try-on/process/*');
    });
  });

  test.describe('Error Recovery Flow', () => {
    test('should allow user to retry failed try-on', async ({ page }) => {
      // Login and navigate to try-on page
      await page.click('text=Log In');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      await page.click('text=Try On');
      await page.waitForURL('/dashboard/try-on');

      // Select items and start processing
      await page.click(
        '[data-testid="clothing-item"]:first-child input[type="checkbox"]'
      );
      await page.click('button:has-text("Generate Try-On")');
      await page.waitForURL('/dashboard/try-on/process/*');

      // Mock processing failure
      await page.waitForSelector('text=Processing failed', { timeout: 30000 });

      // Click retry button
      await page.click('button:has-text("Try Again")');

      // Should retry processing
      await expect(
        page.locator('text=Processing your virtual try-on')
      ).toBeVisible();
    });

    test('should allow user to modify selection and retry', async ({
      page,
    }) => {
      // Login and navigate to try-on page
      await page.click('text=Log In');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'testpassword123');
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard');
      await page.click('text=Try On');
      await page.waitForURL('/dashboard/try-on');

      // Select items and start processing
      await page.click(
        '[data-testid="clothing-item"]:first-child input[type="checkbox"]'
      );
      await page.click('button:has-text("Generate Try-On")');
      await page.waitForURL('/dashboard/try-on/process/*');

      // Mock processing failure
      await page.waitForSelector('text=Processing failed', { timeout: 30000 });

      // Click modify selection button
      await page.click('button:has-text("Modify Selection")');

      // Should navigate back to selection page
      await page.waitForURL('/dashboard/try-on');

      // Should preserve previous selection
      await expect(page.locator('text=1 items selected')).toBeVisible();
    });
  });
});
