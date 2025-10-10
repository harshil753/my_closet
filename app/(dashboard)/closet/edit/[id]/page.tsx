/**
 * Edit Clothing Item Page
 *
 * This page allows users to edit their clothing items including
 * name, category, metadata, and image.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { useAuth } from '@/lib/auth/auth-context';
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

/**
 * Edit clothing item page component
 */
export default function EditClothingItemPage() {
  // Navigation and params
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;

  // Authentication
  const { user, loading: authLoading } = useAuth();

  // State management
  const [item, setItem] = useState<ClothingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'shirts_tops' as ClothingCategory,
    color: '',
    brand: '',
    size: '',
    notes: '',
  });

  // Load item data on component mount
  useEffect(() => {
    if (user?.id && itemId) {
      loadItem();
    }
  }, [user?.id, itemId, loadItem]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  /**
   * Load clothing item data
   */
  const loadItem = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/clothing-items/${itemId}?user_id=${user?.id}`
      );
      const result = await response.json();

      if (result.success && result.data) {
        const itemData = result.data;
        setItem(itemData);
        setFormData({
          name: itemData.name || '',
          category: itemData.category || 'shirts_tops',
          color: itemData.metadata?.color || '',
          brand: itemData.metadata?.brand || '',
          size: itemData.metadata?.size || '',
          notes: itemData.metadata?.notes || '',
        });
      } else {
        throw new Error(result.error || 'Item not found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle form input changes
   */
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(
        `/api/clothing-items/${itemId}?user_id=${user?.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            category: formData.category,
            metadata: {
              color: formData.color,
              brand: formData.brand,
              size: formData.size,
              notes: formData.notes,
            },
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        // Redirect back to closet
        router.push('/closet');
      } else {
        throw new Error(result.error || 'Failed to update item');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    router.push('/closet');
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null; // Will redirect
  }

  // Item not found
  if (!item) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Alert variant="destructive">
          <strong>Item Not Found</strong>
          <p>
            The clothing item you're trying to edit doesn't exist or you don't
            have permission to edit it.
          </p>
          <Button onClick={() => router.push('/closet')} className="mt-2">
            Back to Closet
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Edit Clothing Item
            </h1>
            <p className="text-gray-600">Update your clothing item details</p>
          </div>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <strong>Error</strong>
          <p>{error}</p>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Item Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Item Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
              {item.image_url ? (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  No Image
                </div>
              )}
            </div>
            <div className="mt-4">
              <h3 className="font-medium">{formData.name || 'Untitled'}</h3>
              <p className="text-sm text-gray-600 capitalize">
                {formData.category.replace('_', ' ')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter item name"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    handleInputChange('category', e.target.value)
                  }
                  className="bg-background h-10 w-full rounded-md border px-3 py-2"
                >
                  <option value="shirts_tops">Shirts & Tops</option>
                  <option value="pants_bottoms">Pants & Bottoms</option>
                  <option value="shoes">Shoes</option>
                </select>
              </div>

              {/* Color */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <Input
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="e.g., Blue, Red, Black"
                />
              </div>

              {/* Brand */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Brand</label>
                <Input
                  value={formData.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  placeholder="e.g., Nike, Adidas, Zara"
                />
              </div>

              {/* Size */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Size</label>
                <Input
                  value={formData.size}
                  onChange={(e) => handleInputChange('size', e.target.value)}
                  placeholder="e.g., M, L, XL, 10, 12"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about this item..."
                  className="bg-background min-h-[100px] w-full rounded-md border px-3 py-2"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
