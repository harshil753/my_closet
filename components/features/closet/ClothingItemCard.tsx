/**
 * Clothing Item Card Component
 *
 * This component displays individual clothing items in the closet view.
 * It supports both grid and list view modes, selection functionality,
 * and provides actions for editing and deleting items.
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClothingCategory } from '@/lib/types/common';

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

// View mode type
type ViewMode = 'grid' | 'list';

// Component props
interface ClothingItemCardProps {
  item: ClothingItem;
  viewMode: ViewMode;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  className?: string;
}

/**
 * Main clothing item card component
 */
export function ClothingItemCard({
  item,
  viewMode,
  selectable = false,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  onView,
  className = '',
}: ClothingItemCardProps) {
  // State for image loading
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

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
   * Handle card click for selection or viewing
   */
  const handleCardClick = () => {
    if (selectable && onSelect) {
      onSelect();
    } else if (onView) {
      onView();
    }
  };

  /**
   * Handle edit button click
   */
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  /**
   * Handle delete button click
   */
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  /**
   * Get category display name
   */
  const getCategoryDisplayName = (category: ClothingCategory): string => {
    const names = {
      shirts_tops: 'Shirts & Tops',
      pants_bottoms: 'Pants & Bottoms',
      shoes: 'Shoes',
    };
    return names[category];
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

  /**
   * Get item status badge
   */
  const getStatusBadge = () => {
    if (!item.is_active) {
      return (
        <Badge variant="secondary" className="text-xs">
          Inactive
        </Badge>
      );
    }
    return null;
  };

  // Grid view layout
  if (viewMode === 'grid') {
    return (
      <Card
        className={`relative overflow-hidden transition-all duration-200 hover:shadow-md ${
          selectable ? 'cursor-pointer' : ''
        } ${selected ? 'ring-primary ring-2 ring-offset-2' : ''} ${className}`}
        onClick={handleCardClick}
      >
        {/* Selection indicator */}
        {selectable && (
          <div className="absolute top-2 left-2 z-10">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border-[3px] shadow-lg ${
                selected
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-600 bg-white/90 backdrop-blur-sm'
              }`}
            >
              {selected && (
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="absolute top-2 right-2 z-10 flex space-x-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditClick}
              className="h-8 w-8 bg-white/80 p-0 hover:bg-white"
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
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              className="h-8 w-8 bg-white/80 p-0 text-red-600 hover:bg-white hover:text-red-700"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </Button>
          )}
        </div>

        {/* Image */}
        <div className="relative aspect-square bg-gray-100">
          {!imageError ? (
            <Image
              src={item.thumbnail_url || item.image_url}
              alt={item.name}
              fill
              className={`object-cover transition-opacity duration-200 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-200">
              <div className="text-center text-gray-500">
                <svg
                  className="mx-auto mb-2 h-12 w-12"
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
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-4">
          <div className="space-y-2">
            {/* Name and status */}
            <div className="flex items-start justify-between">
              <h3 className="line-clamp-2 flex-1 text-sm font-medium">
                {item.name}
              </h3>
              {getStatusBadge()}
            </div>

            {/* Category badge */}
            <Badge
              variant="secondary"
              className={`text-xs ${getCategoryColor(item.category)}`}
            >
              {getCategoryDisplayName(item.category)}
            </Badge>

            {/* Metadata */}
            <div className="space-y-1 text-xs text-gray-600">
              {item.metadata.brand && (
                <p className="truncate">
                  <span className="font-medium">Brand:</span>{' '}
                  {item.metadata.brand}
                </p>
              )}
              {item.metadata.color && (
                <p className="truncate">
                  <span className="font-medium">Color:</span>{' '}
                  {item.metadata.color}
                </p>
              )}
              {item.metadata.size && (
                <p className="truncate">
                  <span className="font-medium">Size:</span>{' '}
                  {item.metadata.size}
                </p>
              )}
            </div>

            {/* Upload date */}
            <p className="text-xs text-gray-500">
              Added {formatUploadDate(item.uploaded_at)}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // List view layout
  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md ${
        selectable ? 'cursor-pointer' : ''
      } ${selected ? 'ring-primary ring-2 ring-offset-2' : ''} ${className}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Selection indicator */}
          {selectable && (
            <div
              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-[3px] shadow-lg ${
                selected
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-600 bg-white/90 backdrop-blur-sm'
              }`}
            >
              {selected && (
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          )}

          {/* Image */}
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
            {!imageError ? (
              <Image
                src={item.thumbnail_url || item.image_url}
                alt={item.name}
                fill
                className={`object-cover transition-opacity duration-200 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-200">
                <svg
                  className="h-6 w-6 text-gray-400"
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
              </div>
            )}

            {/* Loading spinner */}
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-primary h-4 w-4 animate-spin rounded-full border-b-2"></div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium">{item.name}</h3>
                <div className="mt-1 flex items-center space-x-2">
                  <Badge
                    variant="secondary"
                    className={`text-xs ${getCategoryColor(item.category)}`}
                  >
                    {getCategoryDisplayName(item.category)}
                  </Badge>
                  {getStatusBadge()}
                </div>
              </div>

              {/* Action buttons */}
              <div className="ml-4 flex items-center space-x-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditClick}
                    className="h-8 w-8 p-0"
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
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteClick}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </Button>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              {item.metadata.brand && (
                <p className="truncate">
                  <span className="font-medium">Brand:</span>{' '}
                  {item.metadata.brand}
                </p>
              )}
              {item.metadata.color && (
                <p className="truncate">
                  <span className="font-medium">Color:</span>{' '}
                  {item.metadata.color}
                </p>
              )}
              {item.metadata.size && (
                <p className="truncate">
                  <span className="font-medium">Size:</span>{' '}
                  {item.metadata.size}
                </p>
              )}
            </div>

            {/* Upload date */}
            <p className="mt-1 text-xs text-gray-500">
              Added {formatUploadDate(item.uploaded_at)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ClothingItemCard;
