/**
 * Help Page
 * Support and documentation
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const faqCategories = [
    { id: 'getting-started', name: 'Getting Started', icon: '🚀' },
    { id: 'uploading', name: 'Uploading Items', icon: '📸' },
    { id: 'try-on', name: 'Virtual Try-On', icon: '👗' },
    { id: 'account', name: 'Account & Settings', icon: '⚙️' },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: '🔧' },
  ];

  const faqItems = [
    {
      category: 'getting-started',
      question: 'How do I get started with My Virtual Closet?',
      answer:
        'Start by creating an account and uploading photos of your clothing items. Our AI will automatically categorize them for you.',
    },
    {
      category: 'uploading',
      question: 'What types of photos work best for uploading?',
      answer:
        'Use clear, well-lit photos with a plain background. Make sure the clothing item is fully visible and not wrinkled.',
    },
    {
      category: 'uploading',
      question: 'How many items can I upload?',
      answer:
        'Free accounts can upload up to 100 items. Premium accounts have unlimited storage.',
    },
    {
      category: 'try-on',
      question: 'How does the virtual try-on feature work?',
      answer:
        'Upload a photo of yourself, then select clothing items from your closet to see how they would look on you.',
    },
    {
      category: 'account',
      question: 'How do I change my account settings?',
      answer:
        'Go to your profile page to update your display name, privacy settings, and account preferences.',
    },
    {
      category: 'troubleshooting',
      question: 'Why are my images not uploading?',
      answer:
        'Check that your images are in a supported format (JPG, PNG) and under 50MB in size.',
    },
  ];

  const filteredFaqs = faqItems
    .filter(
      (item) => selectedCategory === 'all' || item.category === selectedCategory
    )
    .filter(
      (item) =>
        searchQuery === '' ||
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-4 text-3xl font-bold text-gray-900">
          Help & Support
        </h1>
        <p className="text-gray-600">
          Find answers to common questions and get help with your virtual closet
        </p>
      </div>

      {/* Search */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button>Search</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Categories */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory('all')}
                >
                  All Topics
                </Button>
                {faqCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant={
                      selectedCategory === category.id ? 'default' : 'ghost'
                    }
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <span className="mr-2">{category.icon}</span>
                    {category.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                Frequently Asked Questions
                {selectedCategory !== 'all' && (
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    ({filteredFaqs.length} questions)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredFaqs.length === 0 ? (
                  <p className="py-8 text-center text-gray-500">
                    No questions found. Try adjusting your search or category
                    filter.
                  </p>
                ) : (
                  filteredFaqs.map((item, index) => (
                    <div key={index} className="border-b pb-4 last:border-b-0">
                      <h3 className="mb-2 font-medium text-gray-900">
                        {item.question}
                      </h3>
                      <p className="text-sm text-gray-600">{item.answer}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contact Support */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Still Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 font-medium">Contact Support</h3>
              <p className="mb-4 text-sm text-gray-600">
                Can't find what you're looking for? Our support team is here to
                help.
              </p>
              <Button>Contact Support</Button>
            </div>
            <div>
              <h3 className="mb-2 font-medium">Community</h3>
              <p className="mb-4 text-sm text-gray-600">
                Join our community to get tips, share outfits, and connect with
                other users.
              </p>
              <Button variant="outline">Join Community</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
