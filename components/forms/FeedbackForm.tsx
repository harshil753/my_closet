/**
 * Feedback Form Component
 * Allows users to submit feedback, bug reports, and feature requests
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Star,
  Bug,
  Lightbulb,
  MessageSquare,
  Send,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useAnalytics } from '@/lib/hooks/useAnalytics';

interface FeedbackFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  defaultType?: FeedbackType;
  defaultRating?: number;
}

type FeedbackType = 'bug' | 'feature' | 'general' | 'rating';

interface FeedbackData {
  type: FeedbackType;
  rating?: number;
  subject: string;
  message: string;
  email?: string;
  userAgent?: string;
  url?: string;
}

export function FeedbackForm({
  onSuccess,
  onError,
  defaultType = 'general',
  defaultRating = 5,
}: FeedbackFormProps) {
  const [formData, setFormData] = useState<FeedbackData>({
    type: defaultType,
    rating: defaultRating,
    subject: '',
    message: '',
    email: '',
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
    url: typeof window !== 'undefined' ? window.location.href : '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { trackFeatureUsage } = useAnalytics();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      // Track feedback submission
      trackFeatureUsage('feedback', 'submit', {
        type: formData.type,
        rating: formData.rating,
      });

      setIsSuccess(true);
      onSuccess?.();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to submit feedback';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingChange = (rating: number) => {
    setFormData((prev) => ({ ...prev, rating }));
  };

  const handleTypeChange = (type: FeedbackType) => {
    setFormData((prev) => ({ ...prev, type }));
  };

  if (isSuccess) {
    return (
      <Card className="p-6 text-center">
        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          Thank you for your feedback!
        </h3>
        <p className="mb-4 text-sm text-gray-600">
          We've received your message and will review it soon.
        </p>
        <Button
          onClick={() => {
            setIsSuccess(false);
            setFormData({
              type: defaultType,
              rating: defaultRating,
              subject: '',
              message: '',
              email: '',
              userAgent:
                typeof window !== 'undefined' ? navigator.userAgent : '',
              url: typeof window !== 'undefined' ? window.location.href : '',
            });
          }}
          variant="outline"
        >
          Submit Another
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          Share Your Feedback
        </h3>
        <p className="text-sm text-gray-600">
          Help us improve by sharing your thoughts, reporting bugs, or
          suggesting features.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Feedback Type */}
        <div>
          <label className="mb-3 block text-sm font-medium text-gray-700">
            What type of feedback is this?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleTypeChange('rating')}
              className={`flex items-center justify-center space-x-2 rounded-lg border p-3 transition-colors ${
                formData.type === 'rating'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Star className="h-4 w-4" />
              <span className="text-sm">Rating</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('bug')}
              className={`flex items-center justify-center space-x-2 rounded-lg border p-3 transition-colors ${
                formData.type === 'bug'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Bug className="h-4 w-4" />
              <span className="text-sm">Bug Report</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('feature')}
              className={`flex items-center justify-center space-x-2 rounded-lg border p-3 transition-colors ${
                formData.type === 'feature'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Lightbulb className="h-4 w-4" />
              <span className="text-sm">Feature Request</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('general')}
              className={`flex items-center justify-center space-x-2 rounded-lg border p-3 transition-colors ${
                formData.type === 'general'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">General</span>
            </button>
          </div>
        </div>

        {/* Rating (only for rating type) */}
        {formData.type === 'rating' && (
          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700">
              How would you rate your experience?
            </label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleRatingChange(rating)}
                  className={`rounded-lg p-2 transition-colors ${
                    rating <= (formData.rating || 0)
                      ? 'text-yellow-500'
                      : 'text-gray-300 hover:text-yellow-400'
                  }`}
                >
                  <Star className="h-6 w-6 fill-current" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Subject */}
        <div>
          <label
            htmlFor="subject"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Subject
          </label>
          <Input
            id="subject"
            type="text"
            value={formData.subject}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, subject: e.target.value }))
            }
            placeholder="Brief description of your feedback"
            required
          />
        </div>

        {/* Message */}
        <div>
          <label
            htmlFor="message"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Message
          </label>
          <textarea
            id="message"
            value={formData.message}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, message: e.target.value }))
            }
            placeholder="Please provide details about your feedback..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            rows={4}
            required
          />
        </div>

        {/* Email (optional) */}
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            Email (optional)
          </label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="your@email.com"
          />
          <p className="mt-1 text-xs text-gray-500">
            We'll only use this to follow up on your feedback if needed.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit Feedback
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
