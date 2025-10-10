/**
 * Privacy Page
 * Privacy settings and data management
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

export default function PrivacyPage() {
  const [privacySettings, setPrivacySettings] = useState({
    dataCollection: true,
    analytics: true,
    marketing: false,
    dataSharing: false,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setLoading(true);
      setSuccess(null);

      // Here you would save privacy settings
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccess('Privacy settings updated successfully!');
    } catch (err) {
      console.error('Failed to save privacy settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDataExport = async () => {
    try {
      setLoading(true);
      // Here you would trigger data export
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setSuccess(
        'Data export initiated. You will receive an email when ready.'
      );
    } catch (err) {
      console.error('Failed to export data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDataDeletion = async () => {
    if (
      confirm(
        'Are you sure you want to delete all your data? This action cannot be undone.'
      )
    ) {
      try {
        setLoading(true);
        // Here you would handle data deletion
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setSuccess(
          'Data deletion initiated. Your account will be deleted within 24 hours.'
        );
      } catch (err) {
        console.error('Failed to delete data:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Privacy Settings</h1>
        <p className="text-gray-600">
          Manage your privacy and data preferences
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
          {success}
        </Alert>
      )}

      <div className="space-y-8">
        {/* Privacy Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Data Collection</h3>
                <p className="text-sm text-gray-600">
                  Allow collection of usage data to improve the service
                </p>
              </div>
              <input
                type="checkbox"
                checked={privacySettings.dataCollection}
                onChange={(e) =>
                  setPrivacySettings((prev) => ({
                    ...prev,
                    dataCollection: e.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Analytics</h3>
                <p className="text-sm text-gray-600">
                  Help us understand how you use the app
                </p>
              </div>
              <input
                type="checkbox"
                checked={privacySettings.analytics}
                onChange={(e) =>
                  setPrivacySettings((prev) => ({
                    ...prev,
                    analytics: e.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Marketing Communications</h3>
                <p className="text-sm text-gray-600">
                  Receive updates about new features and promotions
                </p>
              </div>
              <input
                type="checkbox"
                checked={privacySettings.marketing}
                onChange={(e) =>
                  setPrivacySettings((prev) => ({
                    ...prev,
                    marketing: e.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Data Sharing</h3>
                <p className="text-sm text-gray-600">
                  Allow sharing of anonymized data for research
                </p>
              </div>
              <input
                type="checkbox"
                checked={privacySettings.dataSharing}
                onChange={(e) =>
                  setPrivacySettings((prev) => ({
                    ...prev,
                    dataSharing: e.target.checked,
                  }))
                }
                className="h-4 w-4"
              />
            </div>

            <Button onClick={handleSave} disabled={loading} className="w-full">
              {loading ? 'Saving...' : 'Save Privacy Settings'}
            </Button>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="mb-2 font-medium">Export Your Data</h3>
              <p className="mb-4 text-sm text-gray-600">
                Download a copy of all your data including clothing items,
                preferences, and settings.
              </p>
              <Button
                variant="outline"
                onClick={handleDataExport}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Export Data'}
              </Button>
            </div>

            <div className="border-t pt-4">
              <h3 className="mb-2 font-medium text-red-600">
                Delete Your Data
              </h3>
              <p className="mb-4 text-sm text-gray-600">
                Permanently delete all your data and close your account. This
                action cannot be undone.
              </p>
              <Button
                variant="destructive"
                onClick={handleDataDeletion}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Delete All Data'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Policy */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                We are committed to protecting your privacy and personal data.
                Your clothing images and personal information are stored
                securely and are never shared without your explicit consent.
              </p>
              <div className="flex gap-4">
                <Button variant="outline" size="sm">
                  Privacy Policy
                </Button>
                <Button variant="outline" size="sm">
                  Terms of Service
                </Button>
                <Button variant="outline" size="sm">
                  Data Processing Agreement
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
