/**
 * Consent Management System
 * Handles GDPR-compliant consent collection and management
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  Download,
  Trash2,
} from 'lucide-react';

interface ConsentPreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  aiProcessing: boolean;
  dataRetention: boolean;
}

interface ConsentManagerProps {
  onConsentChange?: (consent: ConsentPreferences) => void;
  showDataActions?: boolean;
  className?: string;
}

export default function ConsentManager({
  onConsentChange,
  showDataActions = false,
  className = '',
}: ConsentManagerProps) {
  const [consent, setConsent] = useState<ConsentPreferences>({
    essential: true, // Always required
    analytics: false,
    marketing: false,
    aiProcessing: false,
    dataRetention: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadConsentPreferences();
  }, []);

  const loadConsentPreferences = async () => {
    try {
      const response = await fetch('/api/user/consent-preferences');
      if (response.ok) {
        const data = await response.json();
        setConsent(data.consent);
      }
    } catch (error) {
      console.error('Error loading consent preferences:', error);
    }
  };

  const updateConsent = async (newConsent: Partial<ConsentPreferences>) => {
    const updatedConsent = { ...consent, ...newConsent };
    setConsent(updatedConsent);

    setLoading(true);
    try {
      const response = await fetch('/api/user/consent-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: updatedConsent }),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Consent preferences updated successfully',
        });
        onConsentChange?.(updatedConsent);
      } else {
        setMessage({
          type: 'error',
          text: 'Failed to update consent preferences',
        });
        // Revert on error
        setConsent(consent);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating consent preferences' });
      setConsent(consent);
    } finally {
      setLoading(false);
    }
  };

  const acceptAll = () => {
    updateConsent({
      essential: true,
      analytics: true,
      marketing: true,
      aiProcessing: true,
      dataRetention: true,
    });
  };

  const rejectAll = () => {
    updateConsent({
      essential: true,
      analytics: false,
      marketing: false,
      aiProcessing: false,
      dataRetention: false,
    });
  };

  const getConsentStatus = () => {
    const total = Object.keys(consent).length;
    const accepted = Object.values(consent).filter(Boolean).length;
    return { accepted, total };
  };

  const { accepted, total } = getConsentStatus();

  return (
    <div className={`space-y-4 ${className}`}>
      {message && (
        <Alert
          className={`${
            message.type === 'success'
              ? 'border-green-200 bg-green-50'
              : message.type === 'error'
                ? 'border-red-200 bg-red-50'
                : 'border-blue-200 bg-blue-50'
          }`}
        >
          <AlertDescription
            className={
              message.type === 'success'
                ? 'text-green-800'
                : message.type === 'error'
                  ? 'text-red-800'
                  : 'text-blue-800'
            }
          >
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Consent Preferences
          </CardTitle>
          <CardDescription>
            Manage your privacy preferences and control how your data is used.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Consent Overview */}
          <div className="bg-muted flex items-center justify-between rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium">Consent Status</span>
            </div>
            <Badge variant={accepted === total ? 'default' : 'secondary'}>
              {accepted}/{total} Accepted
            </Badge>
          </div>

          {/* Essential Cookies (Always Required) */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="essential" className="font-medium">
                Essential Cookies
              </Label>
              <p className="text-muted-foreground text-sm">
                Required for basic website functionality and security
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="essential"
                checked={consent.essential}
                disabled={true} // Always required
              />
              <span className="text-muted-foreground text-sm">Required</span>
            </div>
          </div>

          <Separator />

          {/* Analytics Cookies */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="analytics" className="font-medium">
                Analytics & Performance
              </Label>
              <p className="text-muted-foreground text-sm">
                Help us understand how you use our service to improve it
              </p>
            </div>
            <Switch
              id="analytics"
              checked={consent.analytics}
              onCheckedChange={(checked) =>
                updateConsent({ analytics: checked })
              }
              disabled={loading}
            />
          </div>

          <Separator />

          {/* Marketing Cookies */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing" className="font-medium">
                Marketing & Communications
              </Label>
              <p className="text-muted-foreground text-sm">
                Allow us to send you relevant updates and promotional content
              </p>
            </div>
            <Switch
              id="marketing"
              checked={consent.marketing}
              onCheckedChange={(checked) =>
                updateConsent({ marketing: checked })
              }
              disabled={loading}
            />
          </div>

          <Separator />

          {/* AI Processing */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-processing" className="font-medium">
                AI Processing
              </Label>
              <p className="text-muted-foreground text-sm">
                Allow AI processing of your images for virtual try-on features
              </p>
            </div>
            <Switch
              id="ai-processing"
              checked={consent.aiProcessing}
              onCheckedChange={(checked) =>
                updateConsent({ aiProcessing: checked })
              }
              disabled={loading}
            />
          </div>

          <Separator />

          {/* Data Retention */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="data-retention" className="font-medium">
                Extended Data Retention
              </Label>
              <p className="text-muted-foreground text-sm">
                Keep your data longer for improved service personalization
              </p>
            </div>
            <Switch
              id="data-retention"
              checked={consent.dataRetention}
              onCheckedChange={(checked) =>
                updateConsent({ dataRetention: checked })
              }
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button onClick={acceptAll} disabled={loading} className="flex-1">
              Accept All
            </Button>
            <Button
              onClick={rejectAll}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              Reject All
            </Button>
            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="ghost"
              className="flex-1"
            >
              {showDetails ? (
                <EyeOff className="mr-2 h-4 w-4" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          </div>

          {/* Detailed Information */}
          {showDetails && (
            <div className="mt-6 space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Your Rights:</strong> You can withdraw consent at any
                  time. Withdrawing consent will not affect the lawfulness of
                  processing based on consent before its withdrawal.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 text-sm">
                <div>
                  <h4 className="mb-2 font-medium">Essential Cookies</h4>
                  <p className="text-muted-foreground">
                    These cookies are necessary for the website to function and
                    cannot be switched off. They include authentication,
                    security, and basic functionality cookies.
                  </p>
                </div>

                <div>
                  <h4 className="mb-2 font-medium">Analytics Cookies</h4>
                  <p className="text-muted-foreground">
                    These cookies help us understand how visitors interact with
                    our website by collecting and reporting information
                    anonymously. We use this data to improve our service and
                    user experience.
                  </p>
                </div>

                <div>
                  <h4 className="mb-2 font-medium">Marketing Cookies</h4>
                  <p className="text-muted-foreground">
                    These cookies are used to track visitors across websites to
                    display relevant advertisements and measure the
                    effectiveness of our marketing campaigns.
                  </p>
                </div>

                <div>
                  <h4 className="mb-2 font-medium">AI Processing</h4>
                  <p className="text-muted-foreground">
                    This allows us to process your images using artificial
                    intelligence to provide virtual try-on features. Your images
                    are processed securely and not shared with third parties.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Data Actions */}
          {showDataActions && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Data Management</h4>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('/dashboard/privacy', '_blank')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('/dashboard/privacy', '_blank')}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
