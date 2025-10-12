/**
 * Clothing Item Detail Modal Component
 *
 * This component provides a detailed view of individual clothing items
 * with comprehensive information, actions, and related features.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { ClothingCategory } from '@/lib/types/common';
import { ClothingDetectionUtils } from '@/lib/ai/clothingDetection';

// Clothing item interface
interface ClothingItem {
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

// Component props
interface ClothingItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ClothingItem | null;
  onEdit?: (item: ClothingItem) => void;
  onDelete?: (item: ClothingItem) => void;
  onAddToTryOn?: (item: ClothingItem) => void;
  className?: string;
}

/**
 * Main clothing item detail modal component
 */
export function ClothingItemDetailModal({
  isOpen,
  onClose,
  item,
  onEdit,
  onDelete,
  onAddToTryOn,
  className = '',
}: ClothingItemDetailModalProps) {
  // State management
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setImageLoaded(false);
      setImageError(false);
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  /**
   * Handle image load success
   */
  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  /**
   * Handle image load error
   */
  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  /**
   * Handle edit button click
   */
  const handleEdit = () => {
    if (item && onEdit) {
      onEdit(item);
      onClose();
    }
  };

  /**
   * Handle delete button click
   */
  const handleDelete = async () => {
    if (!item || !onDelete) return;

    setDeleting(true);
    try {
      await onDelete(item);
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Handle add to try-on button click
   */
  const handleAddToTryOn = () => {
    if (item && onAddToTryOn) {
      onAddToTryOn(item);
      onClose();
    }
  };

  /**
   * Get category display name
   */
  const getCategoryDisplayName = (category: ClothingCategory): string => {
    return ClothingDetectionUtils.getCategoryDisplayName(category);
  };

  /**
   * Get category color for badge
   */
  const getCategoryColor = (category: ClothingCategory): string => {
    const colors = {
      shirts_tops: 'bg-blue-100 text-blue-800',
      pants_bottoms: 'bg-green-100 text-green-800',
      shoes: 'bg-purple-100 text-purple-800',
    };
    return colors[category];
  };

  /**
   * Format upload date
   */
  const formatUploadDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get relative time
   */
  const getRelativeTime = (dateString: string): string => {
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
  };

  if (!item) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className={className}>
      <ModalHeader title="Clothing Item Details">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{item.name}</h2>
            <p className="text-sm text-gray-600">
              Added {getRelativeTime(item.uploaded_at)}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Badge
              variant="secondary"
              className={`text-xs ${getCategoryColor(item.category)}`}
            >
              {getCategoryDisplayName(item.category)}
            </Badge>

            {!item.is_active && (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            )}
          </div>
        </div>
      </ModalHeader>

      <ModalContent>
        <div className="space-y-6">
          {/* Image Display */}
          <div className="relative">
            <div className="mx-auto aspect-square max-w-lg overflow-hidden rounded-lg bg-gray-100">
              {!imageError ? (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  width={512}
                  height={512}
                  className={`h-full w-full object-cover transition-opacity duration-200 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-200">
                  <div className="text-center text-gray-500">
                    <svg
                      className="mx-auto mb-4 h-16 w-16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-sm">Image not available</p>
                  </div>
                </div>
              )}

              {/* Loading spinner */}
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <LoadingSpinner size="lg" />
                </div>
              )}
            </div>
          </div>

          {/* Item Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Item Details</h3>

            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Name
                </label>
                <p className="text-sm">{item.name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Category
                </label>
                <p className="text-sm">
                  {getCategoryDisplayName(item.category)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Status
                </label>
                <p className="text-sm">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                      item.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {item.is_active ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">
                  Uploaded
                </label>
                <p className="text-sm">{formatUploadDate(item.uploaded_at)}</p>
              </div>
            </div>

            {/* Metadata */}
            {Object.keys(item.metadata).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Additional Information</h4>

                <div className="grid grid-cols-2 gap-4">
                  {item.metadata.brand && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Brand
                      </label>
                      <p className="text-sm">{item.metadata.brand}</p>
                    </div>
                  )}

                  {item.metadata.color && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Color
                      </label>
                      <p className="text-sm">{item.metadata.color}</p>
                    </div>
                  )}

                  {item.metadata.size && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">
                        Size
                      </label>
                      <p className="text-sm">{item.metadata.size}</p>
                    </div>
                  )}

                  {item.metadata.notes && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-600">
                        Notes
                      </label>
                      <p className="text-sm">{item.metadata.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <h4 className="font-medium">Quick Actions</h4>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleAddToTryOn}
                className="flex items-center justify-center space-x-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <span>Add to Try-On</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleEdit}
                className="flex items-center justify-center space-x-2"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <span>Edit Item</span>
              </Button>
            </div>
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <Alert variant="destructive">
              <strong>Confirm Deletion</strong>
              <p className="mt-2">
                Are you sure you want to delete &quot;{item.name}&quot;? This
                action cannot be undone.
              </p>
              <div className="mt-3 flex space-x-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </Alert>
          )}
        </div>
      </ModalContent>

      <ModalFooter>
        <div className="flex w-full justify-between">
          <div>
            {onDelete && !showDeleteConfirm && (
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700"
              >
                Delete Item
              </Button>
            )}
          </div>

          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>

            {onAddToTryOn && (
              <Button onClick={handleAddToTryOn}>Add to Try-On</Button>
            )}
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
}

export default ClothingItemDetailModal;
