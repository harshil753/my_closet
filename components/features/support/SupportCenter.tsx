/**
 * Support Center Component
 * Provides FAQ, help documentation, and contact options
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Search,
  HelpCircle,
  MessageSquare,
  Mail,
  Phone,
  Clock,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { FeedbackForm } from '@/components/forms/FeedbackForm';
import { useAnalytics } from '@/lib/hooks/useAnalytics';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface SupportOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: 'How do I upload my clothing items?',
    answer:
      'Go to the Upload page and drag & drop your clothing photos. Make sure the images are clear and show the clothing item well. You can upload up to 100 items on the free plan.',
    category: 'upload',
  },
  {
    id: '2',
    question: 'How does the virtual try-on work?',
    answer:
      'First, upload a base photo of yourself. Then select clothing items from your closet and our AI will generate an image of you wearing those items. The process usually takes 30-60 seconds.',
    category: 'try-on',
  },
  {
    id: '3',
    question: 'What types of clothing can I try on?',
    answer:
      'You can try on shirts, tops, pants, bottoms, and shoes. We support most clothing types and styles. The AI works best with clear, well-lit photos.',
    category: 'try-on',
  },
  {
    id: '4',
    question: 'How do I upgrade to Premium?',
    answer:
      'Go to your Profile page and click "Upgrade to Premium". Premium gives you 1000 clothing items, 1000 try-ons per month, and priority processing.',
    category: 'billing',
  },
  {
    id: '5',
    question: 'Why is my try-on taking so long?',
    answer:
      'AI processing can take 30-60 seconds depending on server load. If it takes longer than 2 minutes, please try again or contact support.',
    category: 'technical',
  },
  {
    id: '6',
    question: 'Can I delete my account?',
    answer:
      'Yes, you can delete your account from the Privacy settings page. This will permanently remove all your data including photos and try-on results.',
    category: 'privacy',
  },
];

const SUPPORT_OPTIONS: SupportOption[] = [
  {
    id: 'faq',
    title: 'Frequently Asked Questions',
    description: 'Find answers to common questions',
    icon: <HelpCircle className="h-5 w-5" />,
    action: () => {},
  },
  {
    id: 'feedback',
    title: 'Send Feedback',
    description: 'Share your thoughts and suggestions',
    icon: <MessageSquare className="h-5 w-5" />,
    action: () => {},
  },
  {
    id: 'email',
    title: 'Email Support',
    description: 'Get help via email',
    icon: <Mail className="h-5 w-5" />,
    action: () => window.open('mailto:support@mycloset.com'),
  },
];

export function SupportCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const { trackFeatureUsage } = useAnalytics();

  const categories = [
    'all',
    'upload',
    'try-on',
    'billing',
    'technical',
    'privacy',
  ];

  const filteredFAQ = FAQ_DATA.filter((item) => {
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFAQClick = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
    trackFeatureUsage('support', 'faq_view', { faqId });
  };

  const handleSupportOptionClick = (option: SupportOption) => {
    trackFeatureUsage('support', 'option_click', { optionId: option.id });
    option.action();
  };

  if (showFeedback) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setShowFeedback(false)}
            className="mb-4"
          >
            ← Back to Support
          </Button>
          <h2 className="text-2xl font-bold text-gray-900">Send Feedback</h2>
        </div>
        <FeedbackForm
          onSuccess={() => setShowFeedback(false)}
          defaultType="general"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">
          Support Center
        </h1>
        <p className="text-lg text-gray-600">
          Get help, find answers, and connect with our support team
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
        <Input
          type="text"
          placeholder="Search for help..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Support Options */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {SUPPORT_OPTIONS.map((option) => (
          <Card
            key={option.id}
            className="cursor-pointer p-6 transition-shadow hover:shadow-md"
            onClick={() => {
              if (option.id === 'feedback') {
                setShowFeedback(true);
              } else {
                handleSupportOptionClick(option);
              }
            }}
          >
            <div className="mb-3 flex items-center space-x-3">
              {option.icon}
              <h3 className="font-semibold text-gray-900">{option.title}</h3>
            </div>
            <p className="text-sm text-gray-600">{option.description}</p>
          </Card>
        ))}
      </div>

      {/* FAQ Section */}
      <div>
        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          Frequently Asked Questions
        </h2>

        {/* Category Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category === 'all'
                ? 'All'
                : category.charAt(0).toUpperCase() + category.slice(1)}
            </Button>
          ))}
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQ.map((item) => (
            <Card key={item.id} className="p-4">
              <button
                onClick={() => handleFAQClick(item.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <h3 className="font-semibold text-gray-900">{item.question}</h3>
                {expandedFAQ === item.id ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>

              {expandedFAQ === item.id && (
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <p className="text-gray-700">{item.answer}</p>
                </div>
              )}
            </Card>
          ))}
        </div>

        {filteredFAQ.length === 0 && (
          <div className="py-8 text-center">
            <HelpCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              No results found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search or category filter.
            </p>
          </div>
        )}
      </div>

      {/* Contact Information */}
      <Card className="bg-blue-50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Still need help?
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-center space-x-3">
            <Mail className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Email Support</p>
              <p className="text-sm text-gray-600">support@mycloset.com</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Response Time</p>
              <p className="text-sm text-gray-600">Within 24 hours</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
