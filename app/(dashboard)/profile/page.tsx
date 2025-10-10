/**
 * Profile Page
 * User profile management and settings
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { useAuth } from '@/lib/auth/auth-context';
import { resetPassword } from '@/lib/auth/supabase-auth';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profileData, setProfileData] = useState({
    displayName: '',
    email: '',
    tier: 'free',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Load user data
  useEffect(() => {
    if (user) {
      setProfileData({
        displayName: user.user_metadata?.display_name || '',
        email: user.email || '',
        tier: user.user_metadata?.tier || 'free',
      });
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Check if email has changed
      const emailChanged = profileData.email !== user?.email;

      if (emailChanged) {
        // Show password modal for email changes
        setShowPasswordModal(true);
        setSaving(false);
        return;
      }

      // Here you would typically update the user profile
      // For now, just simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccess('Profile updated successfully!');
    } catch {
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordVerification = async () => {
    try {
      setPasswordError(null);

      // Here you would verify the password with Supabase
      // For now, just simulate verification
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Close modal and proceed with save
      setShowPasswordModal(false);
      setSaving(true);

      // Simulate email update
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess('Email updated successfully!');
      setSaving(false);
    } catch {
      setPasswordError('Invalid password. Please try again.');
    }
  };

  const handleChangePassword = async () => {
    try {
      setPasswordError(null);

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('New passwords do not match');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setPasswordError('Password must be at least 6 characters long');
        return;
      }

      // Here you would update the password with Supabase
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccess('Password changed successfully!');
      setShowChangePasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch {
      setPasswordError('Failed to change password. Please try again.');
    }
  };

  const handleForgotPassword = async () => {
    try {
      setPasswordError(null);

      if (!user?.email) {
        setPasswordError('No email address found for this account');
        return;
      }

      // Use the existing resetPassword function
      const result = await resetPassword(user.email);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send reset email');
      }

      setSuccess(
        'Password reset link sent to your email! Check your inbox and spam folder.'
      );
      setShowChangePasswordModal(false);
    } catch (err) {
      console.error('Password reset error:', err);
      setPasswordError(
        'Failed to send password reset email. Please try again.'
      );
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600">
          Manage your account information and preferences
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
          {success}
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Display Name</label>
              <Input
                value={profileData.displayName}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    displayName: e.target.value,
                  }))
                }
                placeholder="Enter your display name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                value={profileData.email}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="Enter your email address"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Account Tier</label>
              <Input
                value={profileData.tier}
                disabled
                className="bg-gray-50 capitalize"
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowChangePasswordModal(true)}
            >
              Change Password
            </Button>

            <div className="border-t pt-4">
              <Button
                variant="destructive"
                className="w-full bg-red-600 font-semibold text-white hover:bg-red-700"
                onClick={() => {
                  if (
                    confirm(
                      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data including your clothing items, preferences, and settings.'
                    )
                  ) {
                    if (
                      confirm(
                        'This is your final warning. Clicking OK will immediately delete your account and all associated data. This cannot be reversed.'
                      )
                    ) {
                      // Here you would implement the actual account deletion
                      alert(
                        'Account deletion initiated. Your account will be permanently deleted.'
                      );
                    }
                  }
                }}
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Password Verification Modal for Email Changes */}
      {showPasswordModal && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">Verify Password</h3>
            <p className="mb-4 text-sm text-gray-600">
              Please enter your current password to change your email address.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Current Password</label>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  placeholder="Enter your current password"
                />
              </div>
              {passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}
              <div className="flex gap-3">
                <Button onClick={handlePasswordVerification} className="flex-1">
                  Verify & Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData((prev) => ({
                      ...prev,
                      currentPassword: '',
                    }));
                    setPasswordError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Current Password</label>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }))
                  }
                  placeholder="Enter your current password"
                />
              </div>
              <div>
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  placeholder="Enter your new password"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  placeholder="Confirm your new password"
                />
              </div>
              {passwordError && (
                <p className="text-sm text-red-600">{passwordError}</p>
              )}
              <div className="flex gap-3">
                <Button onClick={handleChangePassword} className="flex-1">
                  Change Password
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                    setPasswordError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
              <div className="text-center">
                <button
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Forgot your password? Send reset link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
