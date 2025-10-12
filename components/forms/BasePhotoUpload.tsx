/**
 * BasePhotoUpload Component
 * Handles uploading and managing user base photos for virtual try-on
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { useAuth } from '@/lib/auth/auth-context';

interface BasePhoto {
  id: string;
  image_url: string;
  thumbnail_url?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

interface BasePhotoUploadProps {
  onUpload?: (photo: BasePhoto) => void;
  onDelete?: (photoId: string) => void;
  onSetPrimary?: (photoId: string) => void;
  className?: string;
}

export default function BasePhotoUpload({
  onUpload,
  onDelete,
  onSetPrimary,
  className = '',
}: BasePhotoUploadProps) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<BasePhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing base photos
  const loadPhotos = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/user/base-photos');
      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.code === 'TABLE_NOT_EXISTS') {
          setError(
            'Base photos feature is not available yet. Please contact support.'
          );
          return;
        }
        throw new Error(errorData.error || 'Failed to load base photos');
      }

      const data = await response.json();
      setPhotos(data.photos || []);
    } catch (err) {
      console.error('Error loading base photos:', err);
      // If it's a network error or JSON parsing error, show a more helpful message
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else if (err instanceof SyntaxError) {
        setError('Server error. Please try again later.');
      } else {
        setError(
          err instanceof Error ? err.message : 'Failed to load base photos'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load photos on mount
  React.useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // File validation
  const validateFile = (file: File): string | null => {
    if (!file) {
      return 'No file provided';
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!file.type || !allowedTypes.includes(file.type)) {
      return 'Please upload a JPEG, PNG, or WebP image';
    }

    if (!file.size || file.size > maxSize) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  // Handle file selection (both drag-drop and click)
  const handleFileSelection = useCallback(
    async (files: File[]) => {
      if (!user?.id) {
        setError('You must be logged in to upload photos');
        return;
      }

      if (!files || files.length === 0) {
        setError('No file selected');
        return;
      }

      // Only process the first file
      const file = files[0];
      if (!file) {
        setError('Invalid file selected');
        return;
      }

      const validationError = validateFile(file);

      if (validationError) {
        setError(validationError);
        return;
      }

      try {
        setUploading(true);
        setError(null);
        setSuccess(null);

        const formData = new FormData();
        formData.append('image', file);
        formData.append('userId', user.id);

        const response = await fetch('/api/user/base-photos', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.code === 'TABLE_NOT_EXISTS') {
            throw new Error(
              'Base photos feature is not available yet. Please contact support.'
            );
          }
          throw new Error(errorData.error || 'Upload failed');
        }

        const data = await response.json();
        const newPhoto = data.photo;

        setPhotos((prev) => [...prev, newPhoto]);
        setSuccess('Base photo uploaded successfully!');

        if (onUpload) {
          onUpload(newPhoto);
        }
      } catch (err) {
        console.error('Upload error:', err);
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [user?.id, onUpload]
  );

  // Handle file upload (for dropzone)
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      handleFileSelection(acceptedFiles);
    },
    [handleFileSelection]
  );

  // Handle click to open file dialog (fallback)
  const handleAreaClick = useCallback(() => {
    if (fileInputRef.current && !uploading && !loading) {
      console.log('Clicking file input');
      fileInputRef.current.click();
    }
  }, [uploading, loading]);

  // Handle manual file input change
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        console.log('File selected via input:', files[0].name);
        const fileArray = Array.from(files);
        handleFileSelection(fileArray);
      }
    },
    [handleFileSelection]
  );

  // Handle photo deletion
  const handleDelete = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this base photo?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/user/base-photos/${photoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete photo');
      }

      setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
      setSuccess('Base photo deleted successfully!');

      if (onDelete) {
        onDelete(photoId);
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete photo');
    } finally {
      setLoading(false);
    }
  };

  // Handle setting primary photo
  const handleSetPrimary = async (photoId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/user/base-photos/${photoId}/primary`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Failed to set primary photo');
      }

      setPhotos((prev) =>
        prev.map((photo) => ({
          ...photo,
          is_primary: photo.id === photoId,
        }))
      );
      setSuccess('Primary photo updated successfully!');

      if (onSetPrimary) {
        onSetPrimary(photoId);
      }
    } catch (err) {
      console.error('Set primary error:', err);
      setError('Failed to set primary photo');
    } finally {
      setLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    multiple: false,
    maxFiles: 1,
    noClick: false,
    noKeyboard: false,
    disabled: uploading || loading,
    onDropRejected: (fileRejections) => {
      console.log('Files rejected:', fileRejections);
      if (fileRejections.length > 0) {
        const error = fileRejections[0].errors[0];
        if (error.code === 'too-many-files') {
          setError('Please select only one file at a time');
        } else {
          setError(error.message);
        }
      }
    },
    onError: (error) => {
      console.error('Dropzone error:', error);
      setError('File selection error. Please try again.');
    },
    onDragEnter: () => {
      console.log('Drag enter');
    },
    onDragLeave: () => {
      console.log('Drag leave');
    },
    onDragOver: () => {
      console.log('Drag over');
    },
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Base Photos</h3>
        <p className="text-sm text-gray-600">
          Upload photos of yourself to use as base images for virtual try-on.
          These photos should show your body type and will be used to generate
          realistic try-on results.
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          {success}
        </Alert>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Base Photo</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            } ${uploading || loading ? 'cursor-not-allowed opacity-50' : ''} `}
          >
            <input
              {...getInputProps()}
              ref={fileInputRef}
              onChange={handleFileInputChange}
            />

            {uploading ? (
              <div className="space-y-2">
                <LoadingSpinner size="md" />
                <p className="text-sm text-gray-600">Uploading...</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">
                  {isDragActive
                    ? 'Drop the image here...'
                    : 'Drag & drop an image here, or click to select'}
                </p>
                <p className="text-xs text-gray-500">
                  JPEG, PNG, or WebP up to 10MB
                </p>
                <button
                  type="button"
                  onClick={handleAreaClick}
                  className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={uploading || loading}
                >
                  Choose File
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Photo Gallery */}
      {photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Base Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative">
                  <div className="aspect-square overflow-hidden rounded-lg border">
                    <Image
                      src={photo.thumbnail_url || photo.image_url}
                      alt="Base photo"
                      width={300}
                      height={300}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Primary Badge */}
                  {photo.is_primary && (
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white">
                        Primary
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="bg-opacity-0 group-hover:bg-opacity-50 absolute inset-0 flex items-center justify-center rounded-lg bg-black opacity-0 transition-all duration-200 group-hover:opacity-100">
                    <div className="flex gap-2">
                      {!photo.is_primary && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSetPrimary(photo.id)}
                          disabled={loading}
                        >
                          Set Primary
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(photo.id)}
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card>
        <CardContent className="pt-6">
          <h4 className="mb-2 font-medium text-gray-900">Photo Tips</h4>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>• Use clear, well-lit photos with good contrast</li>
            <li>• Include your full body or at least torso and shoulders</li>
            <li>• Avoid busy backgrounds or patterns</li>
            <li>• Make sure you're the main subject of the photo</li>
            <li>• Higher resolution photos produce better results</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
