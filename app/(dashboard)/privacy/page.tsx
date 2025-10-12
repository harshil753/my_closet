/**
 * Privacy Settings Page
 * Allows users to manage their privacy preferences and data
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Download,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface PrivacySettings {
  dataCollection: boolean;
  analytics: boolean;
  marketing: boolean;
  aiProcessing: boolean;
  dataRetention: number; // days
}

interface DataRequest {
  id: string;
  type: 'export' | 'deletion';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_at: string;
  completed_at?: string;
  download_url?: string;
}

export default function PrivacyPage() {
  const [settings, setSettings] = useState<PrivacySettings>({
    dataCollection: true,
    analytics: true,
    marketing: false,
    aiProcessing: true,
    dataRetention: 365,
  });
  const [dataRequests, setDataRequests] = useState<DataRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [deletionText, setDeletionText] = useState('');
  const [showDeletionForm, setShowDeletionForm] = useState(false);

  useEffect(() => {
    loadPrivacySettings();
    loadDataRequests();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const response = await fetch('/api/user/privacy-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  const loadDataRequests = async () => {
    try {
      const [exportResponse, deletionResponse] = await Promise.all([
        fetch('/api/user/data-export'),
        fetch('/api/user/data-deletion'),
      ]);

      const exportData = exportResponse.ok
        ? await exportResponse.json()
        : { requests: [] };
      const deletionData = deletionResponse.ok
        ? await deletionResponse.json()
        : { requests: [] };

      setDataRequests([
        ...exportData.requests.map((req: Omit<DataRequest, 'type'>) => ({
          ...req,
          type: 'export' as const,
        })),
        ...deletionData.requests.map((req: Omit<DataRequest, 'type'>) => ({
          ...req,
          type: 'deletion' as const,
        })),
      ]);
    } catch (error) {
      console.error('Error loading data requests:', error);
    }
  };

  const updatePrivacySettings = async (
    newSettings: Partial<PrivacySettings>
  ) => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/privacy-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        setSettings((prev) => ({ ...prev, ...newSettings }));
        setMessage({
          type: 'success',
          text: 'Privacy settings updated successfully',
        });
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to update privacy settings',
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error updating privacy settings' });
    } finally {
      setLoading(false);
    }
  };

  const requestDataExport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/data-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'json' }),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Data export requested. You will receive an email when ready.',
        });
        loadDataRequests();
      } else {
        setMessage({ type: 'error', text: 'Failed to request data export' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error requesting data export' });
    } finally {
      setLoading(false);
    }
  };

  const requestDataDeletion = async () => {
    if (deletionText !== 'DELETE MY DATA') {
      setMessage({
        type: 'error',
        text: 'Please type "DELETE MY DATA" exactly to confirm',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/user/data-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationText: deletionText,
          reason: 'User requested data deletion via privacy settings',
        }),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Data deletion request submitted. Your account will be deleted within 24 hours.',
        });
        setShowDeletionForm(false);
        setDeletionText('');
        loadDataRequests();
      } else {
        setMessage({ type: 'error', text: 'Failed to request data deletion' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error requesting data deletion' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      processing: 'default',
      completed: 'default',
      failed: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Shield className="h-8 w-8" />
          Privacy Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your privacy preferences and control how your data is used.
        </p>
      </div>

      {message && (
        <Alert
          className={`mb-6 ${message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
        >
          <AlertDescription
            className={
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }
          >
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Privacy Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Privacy Preferences
            </CardTitle>
            <CardDescription>
              Control how your data is collected and used.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="data-collection">Data Collection</Label>
                <p className="text-muted-foreground text-sm">
                  Allow collection of usage data to improve the service
                </p>
              </div>
              <Switch
                id="data-collection"
                checked={settings.dataCollection}
                onCheckedChange={(checked: boolean) =>
                  updatePrivacySettings({ dataCollection: checked })
                }
                disabled={loading}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="analytics">Analytics</Label>
                <p className="text-muted-foreground text-sm">
                  Allow anonymous analytics to help improve the platform
                </p>
              </div>
              <Switch
                id="analytics"
                checked={settings.analytics}
                onCheckedChange={(checked: boolean) =>
                  updatePrivacySettings({ analytics: checked })
                }
                disabled={loading}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing">Marketing Communications</Label>
                <p className="text-muted-foreground text-sm">
                  Receive promotional emails and updates
                </p>
              </div>
              <Switch
                id="marketing"
                checked={settings.marketing}
                onCheckedChange={(checked: boolean) =>
                  updatePrivacySettings({ marketing: checked })
                }
                disabled={loading}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-processing">AI Processing</Label>
                <p className="text-muted-foreground text-sm">
                  Allow AI processing of your images for virtual try-on
                </p>
              </div>
              <Switch
                id="ai-processing"
                checked={settings.aiProcessing}
                onCheckedChange={(checked: boolean) =>
                  updatePrivacySettings({ aiProcessing: checked })
                }
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Data Management
            </CardTitle>
            <CardDescription>
              Export or delete your personal data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Export Your Data</h4>
                <p className="text-muted-foreground text-sm">
                  Download a copy of all your personal data
                </p>
              </div>
              <Button
                onClick={requestDataExport}
                disabled={loading}
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Request Export
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Delete Your Data</h4>
                <p className="text-muted-foreground text-sm">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <Button
                onClick={() => setShowDeletionForm(true)}
                disabled={loading}
                variant="destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </div>

            {showDeletionForm && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                <h4 className="mb-2 font-medium text-red-800">
                  Confirm Data Deletion
                </h4>
                <p className="mb-4 text-sm text-red-700">
                  This action cannot be undone. All your data will be
                  permanently deleted.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="deletion-confirmation">
                    Type &quot;DELETE MY DATA&quot; to confirm:
                  </Label>
                  <Input
                    id="deletion-confirmation"
                    value={deletionText}
                    onChange={(e) => setDeletionText(e.target.value)}
                    placeholder="DELETE MY DATA"
                    className="border-red-300"
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={requestDataDeletion}
                    disabled={loading || deletionText !== 'DELETE MY DATA'}
                    variant="destructive"
                    size="sm"
                  >
                    Confirm Deletion
                  </Button>
                  <Button
                    onClick={() => {
                      setShowDeletionForm(false);
                      setDeletionText('');
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Requests History */}
        {dataRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Data Requests History</CardTitle>
              <CardDescription>
                Track your data export and deletion requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dataRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(request.status)}
                      <div>
                        <div className="font-medium">
                          {request.type === 'export'
                            ? 'Data Export'
                            : 'Data Deletion'}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          Requested:{' '}
                          {new Date(request.requested_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(request.status)}
                      {request.download_url && (
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={request.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Download
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Retention Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Data Retention
            </CardTitle>
            <CardDescription>
              Information about how long we keep your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Account Data:</span>
                <span>Until account deletion</span>
              </div>
              <div className="flex justify-between">
                <span>Images:</span>
                <span>Until account deletion</span>
              </div>
              <div className="flex justify-between">
                <span>Usage Analytics:</span>
                <span>2 years (anonymized)</span>
              </div>
              <div className="flex justify-between">
                <span>Support Tickets:</span>
                <span>3 years</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
