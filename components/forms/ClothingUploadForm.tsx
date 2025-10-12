/**
 * Clothing Upload Form Component
 *
 * This component provides a comprehensive form for uploading clothing items
 * with drag-and-drop functionality, image preview, category selection,
 * and tier limit validation.
 */

'use client';

import React, { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
// import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { ClothingCategory } from '@/lib/types/common';
import { useAuth } from '@/lib/auth/auth-context';

// Form data interface
interface ClothingUploadData {
  name: string;
  category: ClothingCategory;
  image: File | null;
  metadata: {
    color?: string;
    brand?: string;
    size?: string;
    notes?: string;
  };
}

// Upload status
interface UploadStatus {
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

// Component props
interface ClothingUploadFormProps {
  onUploadComplete?: (item: {
    id: string;
    name: string;
    category: string;
    image_url: string;
    thumbnail_url: string;
    metadata: Record<string, unknown>;
    is_active: boolean;
    uploaded_at: string;
  }) => void;
  onUploadError?: (error: string) => void;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
  className?: string;
}

/**
 * Main clothing upload form component
 */
export function ClothingUploadForm({
  onUploadComplete,
  onUploadError,
  maxFileSize = 50, // 50MB default
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className = '',
}: ClothingUploadFormProps) {
  // Authentication context
  const { user } = useAuth();

  // Form state
  const [formData, setFormData] = useState<ClothingUploadData>({
    name: '',
    category: 'shirts_tops',
    image: null,
    metadata: {
      color: '',
      brand: '',
      size: '',
      notes: '',
    },
  });

  // Upload status
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    uploading: false,
    progress: 0,
    error: null,
    success: false,
  });

  // Tier limit checking
  const [tierStatus, setTierStatus] = useState<{
    tier: string;
    limits: {
      clothing_items: {
        allowed: boolean | null;
        reason?: string;
        percentage: number;
      };
    };
    upgradeAvailable?: boolean;
  } | null>(null);
  const [, setTierLoading] = useState(true);

  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load tier status on component mount
  React.useEffect(() => {
    if (user?.id) {
      loadTierStatus();
    }
  }, [user?.id]);

  /**
   * Load user's tier status and limits
   */
  const loadTierStatus = async () => {
    try {
      setTierLoading(true);
      const response = await fetch('/api/user/tier-status');
      if (response.ok) {
        const status = await response.json();
        setTierStatus(status.data);
      }
    } catch (error) {
      console.error('Failed to load tier status:', error);
    } finally {
      setTierLoading(false);
    }
  };

  /**
   * Handle file drop/selection
   */
  /**
   * Validate uploaded file
   */
  const validateFile = useCallback(
    (file: File): { valid: boolean; error?: string } => {
      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        return {
          valid: false,
          error: `File too large. Maximum size: ${maxFileSize}MB`,
        };
      }

      // Check file type
      if (!allowedTypes.includes(file.type)) {
        return {
          valid: false,
          error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}`,
        };
      }

      return { valid: true };
    },
    [maxFileSize, allowedTypes]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
          setErrors({ image: validation.error || 'Invalid file' });
          return;
        }

        // Update form data
        setFormData((prev) => ({ ...prev, image: file }));
        setErrors((prev) => ({ ...prev, image: '' }));
      }
    },
    [validateFile]
  );

  /**
   * Handle file selection from input
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setErrors({ image: validation.error || 'Invalid file' });
        return;
      }

      setFormData((prev) => ({ ...prev, image: file }));
      setErrors((prev) => ({ ...prev, image: '' }));
    }
  };

  /**
   * Handle drag events
   */
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onDrop(files);
    }
  };

  /**
   * Configure dropzone
   */
  const getRootProps = () => ({
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  });

  /**
   * Handle form field changes
   */
  const handleFieldChange = (
    field: string,
    value: string | ClothingCategory
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear field error
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  /**
   * Handle metadata field changes
   */
  const handleMetadataChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: value,
      },
    }));
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    }

    // Validate image
    if (!formData.image) {
      newErrors.image = 'Please select an image';
    }

    // Validate category
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if user is authenticated
    if (!user?.id) {
      setUploadStatus((prev) => ({
        ...prev,
        error: 'Please sign in to upload clothing items',
      }));
      return;
    }

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Check tier limits
    if (tierStatus && !tierStatus.limits.clothing_items.allowed) {
      setUploadStatus((prev) => ({
        ...prev,
        error: tierStatus.limits.clothing_items.reason || null,
      }));
      return;
    }

    // Start upload
    setUploadStatus({
      uploading: true,
      progress: 0,
      error: null,
      success: false,
    });

    try {
      // Create form data for upload
      const uploadData = new FormData();
      uploadData.append('name', formData.name);
      uploadData.append('category', formData.category);
      uploadData.append('image', formData.image!);
      uploadData.append('metadata', JSON.stringify(formData.metadata));

      // Upload to API
      const response = await fetch('/api/upload/clothing', {
        method: 'POST',
        headers: {
          'x-user-id': user?.id || '',
        },
        body: uploadData,
      });

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          'Upload failed:',
          response.status,
          response.statusText,
          errorText
        );
        throw new Error(
          `Upload failed: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('Invalid response format:', contentType, responseText);
        throw new Error(`Invalid response format: ${responseText}`);
      }

      const result = await response.json();

      if (result.success) {
        setUploadStatus({
          uploading: false,
          progress: 100,
          error: null,
          success: true,
        });

        // Reset form
        setFormData({
          name: '',
          category: 'shirts_tops',
          image: null,
          metadata: {
            color: '',
            brand: '',
            size: '',
            notes: '',
          },
        });

        // Call success callback
        onUploadComplete?.(result.data);

        // Reload tier status
        await loadTierStatus();
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      setUploadStatus({
        uploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed',
        success: false,
      });

      onUploadError?.(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  /**
   * Remove selected image
   */
  const removeImage = () => {
    setFormData((prev) => ({ ...prev, image: null }));
    setErrors((prev) => ({ ...prev, image: '' }));
  };

  // Note: getCategoryDisplayName function removed as it's not currently used
  // Will be re-implemented when category display functionality is needed

  return (
    <Card className={`mx-auto w-full max-w-2xl ${className}`}>
      <CardHeader>
        <CardTitle>Upload Clothing Item</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tier Status Alert */}
          {tierStatus && !tierStatus.limits.clothing_items.allowed && (
            <Alert variant="destructive">
              <strong>Upload Limit Reached</strong>
              <p>{tierStatus.limits.clothing_items.reason}</p>
              {tierStatus.upgradeAvailable && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => window.open('/upgrade', '_blank')}
                >
                  Upgrade to Premium
                </Button>
              )}
            </Alert>
          )}

          {/* Item Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Item Name *
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="e.g., Blue Cotton Shirt"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Category Selection */}
          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium">
              Category *
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) =>
                handleFieldChange(
                  'category',
                  e.target.value as ClothingCategory
                )
              }
              className={`bg-background h-10 w-full rounded-md border px-3 py-2 ${
                errors.category ? 'border-red-500' : 'border-input'
              }`}
            >
              <option value="shirts_tops">Shirts & Tops</option>
              <option value="pants_bottoms">Pants & Bottoms</option>
              <option value="shoes">Shoes</option>
            </select>
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category}</p>
            )}
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Image *</label>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-gray-400'
              } ${errors.image ? 'border-red-500' : ''}`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
              />

              {formData.image ? (
                <div className="space-y-2">
                  <div className="relative mx-auto max-h-48 w-full overflow-hidden rounded-lg">
                    <Image
                      src={URL.createObjectURL(formData.image)}
                      alt="Preview"
                      width={200}
                      height={200}
                      className="mx-auto rounded-lg"
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    {formData.image.name} (
                    {(formData.image.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={removeImage}
                  >
                    Remove Image
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-4xl text-gray-400">📷</div>
                  <p className="text-sm text-gray-600">
                    {isDragActive
                      ? 'Drop the image here...'
                      : 'Drag & drop an image here, or click to select'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Max size: {maxFileSize}MB. Supported: JPEG, PNG, WebP
                  </p>
                </div>
              )}
            </div>

            {errors.image && (
              <p className="text-sm text-red-500">{errors.image}</p>
            )}
          </div>

          {/* Metadata Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="color" className="text-sm font-medium">
                Color
              </label>
              <Input
                id="color"
                type="text"
                value={formData.metadata.color}
                onChange={(e) => handleMetadataChange('color', e.target.value)}
                placeholder="e.g., Blue"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="brand" className="text-sm font-medium">
                Brand
              </label>
              <Input
                id="brand"
                type="text"
                value={formData.metadata.brand}
                onChange={(e) => handleMetadataChange('brand', e.target.value)}
                placeholder="e.g., Nike"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="size" className="text-sm font-medium">
                Size
              </label>
              <Input
                id="size"
                type="text"
                value={formData.metadata.size}
                onChange={(e) => handleMetadataChange('size', e.target.value)}
                placeholder="e.g., M, L, 10"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Notes
              </label>
              <Input
                id="notes"
                type="text"
                value={formData.metadata.notes}
                onChange={(e) => handleMetadataChange('notes', e.target.value)}
                placeholder="Additional details"
              />
            </div>
          </div>

          {/* Upload Status */}
          {uploadStatus.uploading && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm">Uploading...</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadStatus.progress}%` }}
                />
              </div>
            </div>
          )}

          {uploadStatus.error && (
            <Alert variant="destructive">
              <strong>Upload Failed</strong>
              <p>{uploadStatus.error}</p>
            </Alert>
          )}

          {uploadStatus.success && (
            <Alert>
              <strong>Upload Successful!</strong>
              <p>Your clothing item has been added to your closet.</p>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  name: '',
                  category: 'shirts_tops',
                  image: null,
                  metadata: {
                    color: '',
                    brand: '',
                    size: '',
                    notes: '',
                  },
                });
                setErrors({});
                setUploadStatus({
                  uploading: false,
                  progress: 0,
                  error: null,
                  success: false,
                });
              }}
            >
              Reset
            </Button>

            <Button
              type="submit"
              disabled={
                uploadStatus.uploading ||
                !formData.name ||
                !formData.image ||
                !!(
                  tierStatus &&
                  tierStatus.limits.clothing_items.allowed !== true
                )
              }
            >
              {uploadStatus.uploading ? 'Uploading...' : 'Upload Item'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default ClothingUploadForm;
