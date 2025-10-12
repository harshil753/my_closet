/**
 * Unit Tests for Clothing Upload Functionality
 * 
 * This test suite covers the clothing upload functionality including
 * form validation, image processing, tier limits, and API integration.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

describe('ClothingUploadForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 'test-item-id' } }),
    });
  });

  describe('Form Rendering', () => {
    it('renders all form fields correctly', () => {
      render(<ClothingUploadForm />);
      
      expect(screen.getByLabelText(/item name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByText(/drag & drop an image/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/color/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/brand/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/size/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('renders submit and reset buttons', () => {
      render(<ClothingUploadForm />);
      
      expect(screen.getByRole('button', { name: /upload item/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows error for empty name field', async () => {
      render(<ClothingUploadForm />);
      
      const submitButton = screen.getByRole('button', { name: /upload item/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/item name is required/i)).toBeInTheDocument();
      });
    });

    it('shows error for name too long', async () => {
      render(<ClothingUploadForm />);
      
      const nameInput = screen.getByLabelText(/item name/i);
      fireEvent.change(nameInput, { target: { value: 'a'.repeat(101) } });
      
      const submitButton = screen.getByRole('button', { name: /upload item/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/name must be 100 characters or less/i)).toBeInTheDocument();
      });
    });

    it('shows error when no image is selected', async () => {
      render(<ClothingUploadForm />);
      
      const nameInput = screen.getByLabelText(/item name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Item' } });
      
      const submitButton = screen.getByRole('button', { name: /upload item/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/please select an image/i)).toBeInTheDocument();
      });
    });
  });

  describe('File Upload', () => {
    it('accepts valid image files', () => {
      render(<ClothingUploadForm />);
      
      const fileInput = screen.getByRole('button', { name: /drag & drop an image/i });
      const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024); // 1MB
      
      fireEvent.drop(fileInput, {
        dataTransfer: {
          files: [file],
        },
      });
      
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });

    it('rejects files that are too large', () => {
      render(<ClothingUploadForm maxFileSize={5} />); // 5MB limit
      
      const fileInput = screen.getByRole('button', { name: /drag & drop an image/i });
      const file = createMockFile('large.jpg', 'image/jpeg', 6 * 1024 * 1024); // 6MB
      
      fireEvent.drop(fileInput, {
        dataTransfer: {
          files: [file],
        },
      });
      
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });

    it('rejects invalid file types', () => {
      render(<ClothingUploadForm />);
      
      const fileInput = screen.getByRole('button', { name: /drag & drop an image/i });
      const file = createMockFile('document.pdf', 'application/pdf', 1024 * 1024);
      
      fireEvent.drop(fileInput, {
        dataTransfer: {
          files: [file],
        },
      });
      
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    });

    it('shows image preview when valid file is uploaded', () => {
      render(<ClothingUploadForm />);
      
      const fileInput = screen.getByRole('button', { name: /drag & drop an image/i });
      const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);
      
      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      
      fireEvent.drop(fileInput, {
        dataTransfer: {
          files: [file],
        },
      });
      
      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data', async () => {
      const onUploadComplete = jest.fn();
      render(<ClothingUploadForm onUploadComplete={onUploadComplete} />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: 'Test Shirt' } });
      fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'shirts_tops' } });
      fireEvent.change(screen.getByLabelText(/color/i), { target: { value: 'Blue' } });
      fireEvent.change(screen.getByLabelText(/brand/i), { target: { value: 'Nike' } });
      
      // Upload file
      const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      
      const fileInput = screen.getByRole('button', { name: /drag & drop an image/i });
      fireEvent.drop(fileInput, {
        dataTransfer: { files: [file] },
      });
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /upload item/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/upload/clothing', expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        }));
      });
    });

    it('shows loading state during upload', async () => {
      // Mock slow response
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, data: { id: 'test-item-id' } }),
        }), 100))
      );
      
      render(<ClothingUploadForm />);
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: 'Test Item' } });
      
      const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      
      const fileInput = screen.getByRole('button', { name: /drag & drop an image/i });
      fireEvent.drop(fileInput, {
        dataTransfer: { files: [file] },
      });
      
      const submitButton = screen.getByRole('button', { name: /upload item/i });
      fireEvent.click(submitButton);
      
      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });

    it('handles upload error', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: 'Upload failed' }),
      });
      
      const onUploadError = jest.fn();
      render(<ClothingUploadForm onUploadError={onUploadError} />);
      
      // Fill and submit form
      fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: 'Test Item' } });
      
      const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      
      const fileInput = screen.getByRole('button', { name: /drag & drop an image/i });
      fireEvent.drop(fileInput, {
        dataTransfer: { files: [file] },
      });
      
      const submitButton = screen.getByRole('button', { name: /upload item/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
        expect(onUploadError).toHaveBeenCalledWith('Upload failed');
      });
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
              clothing_items: { allowed: false, reason: 'Limit reached' }
            }
          }
        }),
      });
      
      render(<ClothingUploadForm />);
      
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
              clothing_items: { allowed: false, reason: 'Limit reached' }
            }
          }
        }),
      });
      
      render(<ClothingUploadForm />);
      
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /upload item/i });
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Form Reset', () => {
    it('resets form when reset button is clicked', () => {
      render(<ClothingUploadForm />);
      
      // Fill form
      fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: 'Test Item' } });
      fireEvent.change(screen.getByLabelText(/color/i), { target: { value: 'Blue' } });
      
      // Upload file
      const file = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      
      const fileInput = screen.getByRole('button', { name: /drag & drop an image/i });
      fireEvent.drop(fileInput, {
        dataTransfer: { files: [file] },
      });
      
      // Reset form
      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);
      
      expect(screen.getByLabelText(/item name/i)).toHaveValue('');
      expect(screen.getByLabelText(/color/i)).toHaveValue('');
      expect(screen.getByText(/drag & drop an image/i)).toBeInTheDocument();
    });
  });

  describe('Metadata Fields', () => {
    it('allows optional metadata to be filled', () => {
      render(<ClothingUploadForm />);
      
      const colorInput = screen.getByLabelText(/color/i);
      const brandInput = screen.getByLabelText(/brand/i);
      const sizeInput = screen.getByLabelText(/size/i);
      const notesInput = screen.getByLabelText(/notes/i);
      
      fireEvent.change(colorInput, { target: { value: 'Red' } });
      fireEvent.change(brandInput, { target: { value: 'Adidas' } });
      fireEvent.change(sizeInput, { target: { value: 'M' } });
      fireEvent.change(notesInput, { target: { value: 'Casual wear' } });
      
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

  it('validates required fields', async () => {
    const response = await fetch('/api/upload/clothing', {
      method: 'POST',
      body: new FormData(),
    });
    
    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required fields');
  });

  it('validates file size limits', async () => {
    const formData = new FormData();
    formData.append('name', 'Test Item');
    formData.append('category', 'shirts_tops');
    
    const largeFile = createMockFile('large.jpg', 'image/jpeg', 60 * 1024 * 1024); // 60MB
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

  it('validates file types', async () => {
    const formData = new FormData();
    formData.append('name', 'Test Item');
    formData.append('category', 'shirts_tops');
    
    const invalidFile = createMockFile('document.pdf', 'application/pdf', 1024 * 1024);
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
