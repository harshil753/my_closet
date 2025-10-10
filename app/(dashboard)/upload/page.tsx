/**
 * Upload Page
 *
 * This page provides the main interface for users to upload clothing items
 * to their virtual closet. It includes the upload form, tier limit information,
 * and helpful tips for successful uploads.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { ClothingUploadForm } from '@/components/forms/ClothingUploadForm';
import { useAuth } from '@/lib/auth/auth-context';

// Upload tips data
const UPLOAD_TIPS = [
  {
    title: 'Good Lighting',
    description:
      'Take photos in natural light or well-lit areas for best results.',
    icon: '💡',
  },
  {
    title: 'Clear Background',
    description: 'Use a plain background to help AI identify clothing items.',
    icon: '🖼️',
  },
  {
    title: 'Full Item Visible',
    description: 'Make sure the entire clothing item is visible in the photo.',
    icon: '👕',
  },
  {
    title: 'High Quality',
    description: 'Use high-resolution photos for better AI processing.',
    icon: '📸',
  },
];

// Upload guidelines
const UPLOAD_GUIDELINES = [
  'Supported formats: JPEG, PNG, WebP',
  'Maximum file size: 50MB per image',
  'Minimum resolution: 512x512 pixels',
  'Recommended resolution: 1024x1024 or higher',
  'One item per photo for best results',
];

/**
 * Main upload page component
 */
export default function UploadPage() {
  // Authentication and navigation
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // State management
  const [tierStatus, setTierStatus] = useState<{
    tier: string;
    usage: { clothing_items_used: number };
    limits: { clothing_items: { limit: number; percentage: number } };
  } | null>(null);
  const [tierLoading, setTierLoading] = useState(true);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showTips, setShowTips] = useState(false);

  // Load tier status on component mount
  useEffect(() => {
    if (user?.id) {
      loadTierStatus();
    }
  }, [user?.id]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  /**
   * Load user's tier status and limits
   */
  const loadTierStatus = async () => {
    try {
      setTierLoading(true);
      const response = await fetch('/api/user/tier-status');
      if (response.ok) {
        const result = await response.json();
        setTierStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to load tier status:', error);
    } finally {
      setTierLoading(false);
    }
  };

  /**
   * Handle successful upload
   */
  const handleUploadSuccess = () => {
    setUploadSuccess(true);
    // Reload tier status to update limits
    loadTierStatus();

    // Show success message for a few seconds
    setTimeout(() => {
      setUploadSuccess(false);
    }, 5000);
  };

  /**
   * Handle upload error
   */
  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    // Error handling is done in the form component
  };

  /**
   * Navigate to closet after upload
   */
  const goToCloset = () => {
    router.push('/closet');
  };

  // Loading state
  if (authLoading || tierLoading) {
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

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Upload Clothing Items
        </h1>
        <p className="text-gray-600">
          Add items to your virtual closet to start creating amazing outfits
        </p>
      </div>

      {/* Success Message */}
      {uploadSuccess && (
        <Alert className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <strong>Upload Successful!</strong>
              <p>Your clothing item has been added to your closet.</p>
            </div>
            <Button onClick={goToCloset} size="sm">
              View Closet
            </Button>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Upload Form */}
        <div className="lg:col-span-2">
          <ClothingUploadForm
            onUploadComplete={handleUploadSuccess}
            onUploadError={handleUploadError}
            maxFileSize={50}
            allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tier Status */}
          {tierStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Current Plan</span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        tierStatus.tier === 'premium'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {tierStatus.tier === 'premium' ? 'Premium' : 'Free'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Clothing Items</span>
                      <span>
                        {tierStatus.usage.clothing_items_used} /{' '}
                        {tierStatus.limits.clothing_items.limit}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className={`h-2 rounded-full ${
                          tierStatus.limits.clothing_items.percentage > 80
                            ? 'bg-red-500'
                            : tierStatus.limits.clothing_items.percentage > 60
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{
                          width: `${tierStatus.limits.clothing_items.percentage}%`,
                        }}
                      />
                    </div>
                  </div>

                  {tierStatus.limits.clothing_items.percentage > 80 && (
                    <Alert variant="destructive">
                      <strong>Storage Almost Full</strong>
                      <p className="mt-1 text-sm">
                        You're using{' '}
                        {tierStatus.limits.clothing_items.percentage}% of your
                        storage.
                        {tierStatus.tier === 'free' &&
                          ' Consider upgrading to Premium for more space.'}
                      </p>
                    </Alert>
                  )}

                  {tierStatus.tier === 'free' && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open('/upgrade', '_blank')}
                    >
                      Upgrade to Premium
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {UPLOAD_TIPS.map((tip, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <span className="text-2xl">{tip.icon}</span>
                    <div>
                      <h4 className="text-sm font-medium">{tip.title}</h4>
                      <p className="text-xs text-gray-600">{tip.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upload Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                {UPLOAD_GUIDELINES.map((guideline, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2 text-green-500">✓</span>
                    {guideline}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/closet')}
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  View My Closet
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => router.push('/try-on')}
                >
                  <svg
                    className="mr-2 h-4 w-4"
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
                  Start Try-On
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowTips(!showTips)}
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {showTips ? 'Hide' : 'Show'} Tips
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Expanded Tips Section */}
      {showTips && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Detailed Upload Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 font-medium">Photo Quality</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Use good lighting - natural light is best</li>
                  <li>• Avoid shadows and harsh lighting</li>
                  <li>• Keep the camera steady</li>
                  <li>• Take photos from multiple angles if needed</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3 font-medium">Item Presentation</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Lay items flat or hang them properly</li>
                  <li>• Remove wrinkles and creases</li>
                  <li>• Show the full item in the frame</li>
                  <li>• Use a plain, contrasting background</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3 font-medium">File Requirements</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Use high-resolution images (1024x1024+)</li>
                  <li>• Save in JPEG or PNG format</li>
                  <li>• Keep file sizes under 50MB</li>
                  <li>• One item per photo for best results</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-3 font-medium">AI Processing</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Clear, well-lit photos work best</li>
                  <li>• Avoid busy backgrounds</li>
                  <li>• Show the item clearly without obstructions</li>
                  <li>• Include the entire item in the frame</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
