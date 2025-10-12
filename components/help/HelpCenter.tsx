/**
 * Help center and documentation component
 * FAQ, tutorials, and support resources
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  image?: string;
  video?: string;
}

export function HelpCenter() {
  const [activeTab, setActiveTab] = useState<'faq' | 'tutorials' | 'contact'>(
    'faq'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const faqItems: FAQItem[] = [
    {
      id: 'upload-clothes',
      question: 'How do I upload clothing items?',
      answer:
        'To upload clothing items, go to the Upload page and drag and drop your photos or click to select files. Our AI will automatically detect and categorize your clothing.',
      category: 'Getting Started',
    },
    {
      id: 'virtual-try-on',
      question: 'How does virtual try-on work?',
      answer:
        'Virtual try-on uses AI to generate realistic images of you wearing selected clothing items. Upload your base photos first, then select clothing items to try on.',
      category: 'Virtual Try-On',
    },
    {
      id: 'base-photos',
      question: 'What are base photos and why do I need them?',
      answer:
        'Base photos are reference images of yourself that help the AI generate more accurate virtual try-on results. Upload front, side, and full-body photos for best results.',
      category: 'Virtual Try-On',
    },
    {
      id: 'clothing-categories',
      question: 'What clothing categories are supported?',
      answer:
        'We support shirts/tops, pants/bottoms, and shoes. Each category is automatically detected by our AI when you upload photos.',
      category: 'Clothing',
    },
    {
      id: 'file-formats',
      question: 'What file formats are supported for uploads?',
      answer:
        'We support JPEG, PNG, and WebP image formats. Files should be under 50MB in size for optimal performance.',
      category: 'Technical',
    },
    {
      id: 'privacy',
      question: 'Is my data private and secure?',
      answer:
        'Yes, we take privacy seriously. Your photos are encrypted and stored securely. We never share your personal data with third parties.',
      category: 'Privacy & Security',
    },
    {
      id: 'tier-limits',
      question: 'What are the limits for free vs premium accounts?',
      answer:
        'Free accounts can upload up to 100 clothing items and perform 100 virtual try-ons per month. Premium accounts get 1000 items and 1000 try-ons per month.',
      category: 'Account',
    },
    {
      id: 'delete-account',
      question: 'How do I delete my account?',
      answer:
        'You can delete your account from the Privacy settings page. This will permanently remove all your data including photos and try-on results.',
      category: 'Account',
    },
  ];

  const tutorials: TutorialStep[] = [
    {
      id: 'getting-started',
      title: 'Getting Started with My Closet',
      description:
        'Learn the basics of uploading and organizing your virtual wardrobe.',
      image: '/images/tutorials/getting-started.jpg',
    },
    {
      id: 'virtual-try-on',
      title: 'Virtual Try-On Tutorial',
      description:
        'Step-by-step guide to using our AI-powered virtual try-on feature.',
      image: '/images/tutorials/virtual-try-on.jpg',
    },
    {
      id: 'organizing-closet',
      title: 'Organizing Your Closet',
      description:
        'Tips and tricks for keeping your virtual closet organized and searchable.',
      image: '/images/tutorials/organizing.jpg',
    },
    {
      id: 'base-photos',
      title: 'Taking Great Base Photos',
      description:
        'Learn how to take the best base photos for accurate virtual try-on results.',
      image: '/images/tutorials/base-photos.jpg',
    },
  ];

  const filteredFAQ = faqItems.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [...new Set(faqItems.map((item) => item.category))];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">Help Center</h1>
        <p className="text-gray-600">
          Find answers to common questions, learn how to use features, and get
          support.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search help articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'faq', label: 'FAQ', count: faqItems.length },
            { id: 'tutorials', label: 'Tutorials', count: tutorials.length },
            { id: 'contact', label: 'Contact Support', count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`border-b-2 px-1 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label} {tab.count && `(${tab.count})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'faq' && (
          <div className="space-y-4">
            {/* Category Filter */}
            <div className="mb-6 flex flex-wrap gap-2">
              <Button
                variant={searchQuery === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSearchQuery('')}
              >
                All Categories
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery(category)}
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* FAQ Items */}
            {filteredFAQ.map((item) => (
              <Card key={item.id} className="p-4">
                <div
                  className="cursor-pointer"
                  onClick={() =>
                    setExpandedFAQ(expandedFAQ === item.id ? null : item.id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">
                      {item.question}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {item.category}
                    </span>
                  </div>
                  {expandedFAQ === item.id && (
                    <div className="mt-3 border-t border-gray-200 pt-3">
                      <p className="text-gray-600">{item.answer}</p>
                    </div>
                  )}
                </div>
              </Card>
            ))}

            {filteredFAQ.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-gray-500">
                  No FAQ items found matching your search.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tutorials' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {tutorials.map((tutorial) => (
              <Card key={tutorial.id} className="p-6">
                {tutorial.image && (
                  <img
                    src={tutorial.image}
                    alt={tutorial.title}
                    className="mb-4 h-48 w-full rounded-lg object-cover"
                  />
                )}
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {tutorial.title}
                </h3>
                <p className="mb-4 text-gray-600">{tutorial.description}</p>
                <Button className="w-full">Start Tutorial</Button>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Contact Support
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Subject
                  </label>
                  <Input placeholder="What can we help you with?" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Message
                  </label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Describe your issue or question..."
                  />
                </div>
                <Button className="w-full">Send Message</Button>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card className="p-4">
                <h4 className="mb-2 font-medium text-gray-900">
                  Email Support
                </h4>
                <p className="mb-2 text-sm text-gray-600">
                  Get help via email within 24 hours
                </p>
                <a
                  href="mailto:support@mycloset.com"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  support@mycloset.com
                </a>
              </Card>

              <Card className="p-4">
                <h4 className="mb-2 font-medium text-gray-900">Live Chat</h4>
                <p className="mb-2 text-sm text-gray-600">
                  Chat with our support team in real-time
                </p>
                <Button size="sm" variant="outline">
                  Start Chat
                </Button>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Quick help widget
 */
export function QuickHelpWidget() {
  const [isOpen, setIsOpen] = useState(false);

  const quickHelpItems = [
    {
      title: 'How to upload clothes',
      href: '/help#upload-clothes',
    },
    {
      title: 'Virtual try-on guide',
      href: '/help#virtual-try-on',
    },
    {
      title: 'Setting up base photos',
      href: '/help#base-photos',
    },
    {
      title: 'Account settings',
      href: '/help#account',
    },
  ];

  return (
    <div className="fixed right-4 bottom-4 z-50">
      {isOpen && (
        <div className="absolute right-0 bottom-16 w-64 rounded-lg border bg-white p-4 shadow-lg">
          <h4 className="mb-3 font-medium text-gray-900">Quick Help</h4>
          <div className="space-y-2">
            {quickHelpItems.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className="block py-1 text-sm text-blue-600 hover:text-blue-700"
              >
                {item.title}
              </a>
            ))}
          </div>
          <div className="mt-3 border-t border-gray-200 pt-3">
            <a
              href="/help"
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              View all help articles →
            </a>
          </div>
        </div>
      )}

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
      >
        ?
      </Button>
    </div>
  );
}
