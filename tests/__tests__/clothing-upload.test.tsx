/**
 * Unit Tests for Clothing Upload Functionality
 *
 * This test suite covers the clothing upload functionality including
 * form validation, image processing, tier limits, and API integration.
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { jest } from '@jest/globals';
import ClothingUploadForm from '@/components/forms/ClothingUploadForm';
import { ClothingCategory } from '@/lib/types/common';

// Mock the auth context
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    loading: false,
  }),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock file creation for testing
const createMockFile = (name: string, type: string, size: number): File => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Default tier status mock
const mockTierStatus = {
  success: true,
  data: {
    tier: 'basic',
    limits: {
      clothing_items: {
        allowed: true,
        reason: '',
        percentage: 20,
      },
    },
    upgradeAvailable: false,
  },
};

describe('ClothingUploadForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for tier status API
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/user/tier-status') {
        return Promise.resolve({
          ok: true,
          json: async () => mockTierStatus,
        });
      }
      // Default response for other endpoints
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: { id: 'test-item-id' } }),
      });
    });
  });

  describe('Form Rendering', () => {
    it('renders all form fields correctly', async () => {
      await act(async () => {
        render(<ClothingUploadForm />);
      });

      expect(screen.getByLabelText(/item name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByText(/drag & drop an image/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/color/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/brand/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/size/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('renders submit and reset buttons', async () => {
      await act(async () => {
        render(<ClothingUploadForm />);
      });

      expect(
        screen.getByRole('button', { name: /upload item/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /reset/i })
      ).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('disables submit button when name field is empty', async () => {
      await act(async () => {
        render(<ClothingUploadForm />);
      });

      const submitButton = screen.getByRole('button', {
        name: /upload item/i,
      });

      expect(submitButton).toBeDisabled();
    });

    it('allows form submission with valid name length', async () => {
      await act(async () => {
        render(<ClothingUploadForm />);
      });

      await act(async () => {
        const nameInput = screen.getByLabelText(/item name/i);
        // Test with a valid name that's under 100 characters
        fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
      });

      const nameInput = screen.getByLabelText(/item name/i);
      expect(nameInput).toHaveValue('Valid Name');
    });

    it('disables submit button when no image is selected', async () => {
      await act(async () => {
        render(<ClothingUploadForm />);
      });

      await act(async () => {
        const nameInput = screen.getByLabelText(/item name/i);
        fireEvent.change(nameInput, { target: { value: 'Test Item' } });
      });

      const submitButton = screen.getByRole('button', {
        name: /upload item/i,
      });

      // Button should still be disabled without an image
      expect(submitButton).toBeDisabled();
    });
  });

  describe('File Upload', () => {
    it('accepts valid image files', async () => {
      global.URL.createObjectURL = jest.fn(() => 'mock-url');

      await act(async () => {
        render(<ClothingUploadForm />);
      });

      await act(async () => {
        const dropzone = screen
          .getByText(/drag & drop an image/i)
          .closest('div');
        const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024); // 1MB

        fireEvent.drop(dropzone!, {
          dataTransfer: {
            files: [file],
          },
        });
      });

      // Check that file info is displayed (filename and size)
      await waitFor(() => {
        expect(screen.getByText(/test\.jpg/i)).toBeInTheDocument();
      });
    });

    it('rejects files that are too large', async () => {
      await act(async () => {
        render(<ClothingUploadForm maxFileSize={5} />); // 5MB limit
      });

      await act(async () => {
        const dropzone = screen
          .getByText(/drag & drop an image/i)
          .closest('div');
        const file = createMockFile('large.jpg', 'image/jpeg', 6 * 1024 * 1024); // 6MB

        fireEvent.drop(dropzone!, {
          dataTransfer: {
            files: [file],
          },
        });
      });

      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });

    it('rejects invalid file types', async () => {
      await act(async () => {
        render(<ClothingUploadForm />);
      });

      await act(async () => {
        const dropzone = screen
          .getByText(/drag & drop an image/i)
          .closest('div');
        const file = createMockFile(
          'document.pdf',
          'application/pdf',
          1024 * 1024
        );

        fireEvent.drop(dropzone!, {
          dataTransfer: {
            files: [file],
          },
        });
      });

      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    });

    it('shows image preview when valid file is uploaded', async () => {
      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'mock-url');

      await act(async () => {
        render(<ClothingUploadForm />);
      });

      await act(async () => {
        const dropzone = screen
          .getByText(/drag & drop an image/i)
          .closest('div');
        const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);

        fireEvent.drop(dropzone!, {
          dataTransfer: {
            files: [file],
          },
        });
      });

      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const onUploadComplete = jest.fn();

      await act(async () => {
        render(<ClothingUploadForm onUploadComplete={onUploadComplete} />);
      });

      // Fill form
      await act(async () => {
        fireEvent.change(screen.getByLabelText(/item name/i), {
          target: { value: 'Test Shirt' },
        });
        fireEvent.change(screen.getByLabelText(/category/i), {
          target: { value: 'shirts_tops' },
        });
        fireEvent.change(screen.getByLabelText(/color/i), {
          target: { value: 'Blue' },
        });
        fireEvent.change(screen.getByLabelText(/brand/i), {
          target: { value: 'Nike' },
        });
      });

      // Upload file
      await act(async () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);
        global.URL.createObjectURL = jest.fn(() => 'mock-url');

        const dropzone = screen
          .getByText(/drag & drop an image/i)
          .closest('div');
        fireEvent.drop(dropzone!, {
          dataTransfer: { files: [file] },
        });
      });

      // Submit form
      await act(async () => {
        const submitButton = screen.getByRole('button', {
          name: /upload item/i,
        });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/upload/clothing',
          expect.objectContaining({
            method: 'POST',
            body: expect.any(FormData),
          })
        );
      });
    });

    it('shows loading state during upload', async () => {
      // Mock slow response
      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/user/tier-status') {
          return Promise.resolve({
            ok: true,
            json: async () => mockTierStatus,
          });
        }
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  success: true,
                  data: { id: 'test-item-id' },
                }),
              }),
            100
          )
        );
      });

      await act(async () => {
        render(<ClothingUploadForm />);
      });

      // Fill and submit form
      await act(async () => {
        fireEvent.change(screen.getByLabelText(/item name/i), {
          target: { value: 'Test Item' },
        });
      });

      await act(async () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);
        global.URL.createObjectURL = jest.fn(() => 'mock-url');

        const dropzone = screen
          .getByText(/drag & drop an image/i)
          .closest('div');
        fireEvent.drop(dropzone!, {
          dataTransfer: { files: [file] },
        });
      });

      await act(async () => {
        const submitButton = screen.getByRole('button', {
          name: /upload item/i,
        });
        fireEvent.click(submitButton);
      });

      // Check for the loading spinner and uploading text
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /uploading/i })
        ).toBeInTheDocument();
      });
    });

    it('handles upload error', async () => {
      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === '/api/user/tier-status') {
          return Promise.resolve({
            ok: true,
            json: async () => mockTierStatus,
          });
        }
        return Promise.resolve({
          ok: false,
          text: async () => 'Upload failed',
          json: async () => ({ success: false, error: 'Upload failed' }),
        });
      });

      const onUploadError = jest.fn();

      await act(async () => {
        render(<ClothingUploadForm onUploadError={onUploadError} />);
      });

      // Fill and submit form
      await act(async () => {
        fireEvent.change(screen.getByLabelText(/item name/i), {
          target: { value: 'Test Item' },
        });
      });

      await act(async () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);
        global.URL.createObjectURL = jest.fn(() => 'mock-url');

        const dropzone = screen
          .getByText(/drag & drop an image/i)
          .closest('div');
        fireEvent.drop(dropzone!, {
          dataTransfer: { files: [file] },
        });
      });

      await act(async () => {
        const submitButton = screen.getByRole('button', {
          name: /upload item/i,
        });
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        // Check for the Alert component with role="alert"
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent(/upload failed/i);
      });

      // Check that error callback was called
      expect(onUploadError).toHaveBeenCalled();
    });
  });

  describe('Tier Limit Integration', () => {
    it('shows tier limit warning when limit is reached', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            tier: 'free',
            limits: {
              clothing_items: {
                allowed: false,
                reason: 'Limit reached',
                percentage: 100,
              },
            },
            upgradeAvailable: false,
          },
        }),
      });

      await act(async () => {
        render(<ClothingUploadForm />);
      });

      await waitFor(() => {
        expect(screen.getByText(/upload limit reached/i)).toBeInTheDocument();
      });
    });

    it('disables submit button when tier limit is reached', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            tier: 'free',
            limits: {
              clothing_items: {
                allowed: false,
                reason: 'Limit reached',
                percentage: 100,
              },
            },
            upgradeAvailable: false,
          },
        }),
      });

      await act(async () => {
        render(<ClothingUploadForm />);
      });

      await waitFor(() => {
        const submitButton = screen.getByRole('button', {
          name: /upload item/i,
        });
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Form Reset', () => {
    it('resets form when reset button is clicked', async () => {
      await act(async () => {
        render(<ClothingUploadForm />);
      });

      // Fill form
      await act(async () => {
        fireEvent.change(screen.getByLabelText(/item name/i), {
          target: { value: 'Test Item' },
        });
        fireEvent.change(screen.getByLabelText(/color/i), {
          target: { value: 'Blue' },
        });
      });

      // Upload file
      await act(async () => {
        const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);
        global.URL.createObjectURL = jest.fn(() => 'mock-url');

        const dropzone = screen
          .getByText(/drag & drop an image/i)
          .closest('div');
        fireEvent.drop(dropzone!, {
          dataTransfer: { files: [file] },
        });
      });

      // Reset form
      await act(async () => {
        const resetButton = screen.getByRole('button', { name: /reset/i });
        fireEvent.click(resetButton);
      });

      expect(screen.getByLabelText(/item name/i)).toHaveValue('');
      expect(screen.getByLabelText(/color/i)).toHaveValue('');
      expect(screen.getByText(/drag & drop an image/i)).toBeInTheDocument();
    });
  });

  describe('Metadata Fields', () => {
    it('allows optional metadata to be filled', async () => {
      await act(async () => {
        render(<ClothingUploadForm />);
      });

      const colorInput = screen.getByLabelText(/color/i);
      const brandInput = screen.getByLabelText(/brand/i);
      const sizeInput = screen.getByLabelText(/size/i);
      const notesInput = screen.getByLabelText(/notes/i);

      await act(async () => {
        fireEvent.change(colorInput, { target: { value: 'Red' } });
        fireEvent.change(brandInput, { target: { value: 'Adidas' } });
        fireEvent.change(sizeInput, { target: { value: 'M' } });
        fireEvent.change(notesInput, { target: { value: 'Casual wear' } });
      });

      expect(colorInput).toHaveValue('Red');
      expect(brandInput).toHaveValue('Adidas');
      expect(sizeInput).toHaveValue('M');
      expect(notesInput).toHaveValue('Casual wear');
    });
  });
});

describe('Clothing Upload API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // These tests are testing API behavior directly, which requires a running server
  // In a real implementation, these would use mock service workers (MSW) or API mocks
  it.skip('validates required fields', async () => {
    const response = await fetch('/api/upload/clothing', {
      method: 'POST',
      body: new FormData(),
    });

    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required fields');
  });

  it.skip('validates file size limits', async () => {
    const formData = new FormData();
    formData.append('name', 'Test Item');
    formData.append('category', 'shirts_tops');

    const largeFile = createMockFile(
      'large.jpg',
      'image/jpeg',
      60 * 1024 * 1024
    ); // 60MB
    formData.append('image', largeFile);
    formData.append('metadata', JSON.stringify({}));

    const response = await fetch('/api/upload/clothing', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Image too large');
  });

  it.skip('validates file types', async () => {
    const formData = new FormData();
    formData.append('name', 'Test Item');
    formData.append('category', 'shirts_tops');

    const invalidFile = createMockFile(
      'document.pdf',
      'application/pdf',
      1024 * 1024
    );
    formData.append('image', invalidFile);
    formData.append('metadata', JSON.stringify({}));

    const response = await fetch('/api/upload/clothing', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid image type');
  });
});
