/**
 * Upgrade Page
 * Coming soon page for premium features
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function UpgradePage() {
  const features = [
    {
      icon: '🚀',
      title: 'Unlimited Storage',
      description: 'Upload as many clothing items as you want with no limits.',
    },
    {
      icon: '🎨',
      title: 'Advanced AI Features',
      description:
        'Get personalized style recommendations and outfit suggestions.',
    },
    {
      icon: '👗',
      title: 'Premium Try-On',
      description:
        'Access to the latest virtual try-on technology and effects.',
    },
    {
      icon: '📱',
      title: 'Mobile App',
      description: 'Full-featured mobile app for iOS and Android devices.',
    },
    {
      icon: '☁️',
      title: 'Cloud Sync',
      description: 'Sync your closet across all your devices seamlessly.',
    },
    {
      icon: '🎯',
      title: 'Style Analytics',
      description: 'Detailed insights about your style preferences and trends.',
    },
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        'Up to 100 clothing items',
        'Basic virtual try-on',
        'Standard AI categorization',
        'Community support',
      ],
      current: true,
    },
    {
      name: 'Premium',
      price: '$9.99',
      period: 'per month',
      features: [
        'Unlimited clothing items',
        'Advanced AI features',
        'Premium try-on effects',
        'Priority support',
        'Style recommendations',
        'Cloud sync',
      ],
      popular: true,
    },
    {
      name: 'Pro',
      price: '$19.99',
      period: 'per month',
      features: [
        'Everything in Premium',
        'Style analytics',
        'Custom AI training',
        'API access',
        'White-label options',
        'Dedicated support',
      ],
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">
          Upgrade Your Virtual Closet
        </h1>
        <p className="mb-8 text-xl text-gray-600">
          Unlock premium features and take your style game to the next level
        </p>
        <div className="inline-flex items-center rounded-full bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-800">
          🚧 Coming Soon - We're working hard to bring you amazing features!
        </div>
      </div>

      {/* Features Grid */}
      <div className="mb-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">
          Premium Features
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index} className="text-center">
              <CardContent className="pt-6">
                <div className="mb-4 text-4xl">{feature.icon}</div>
                <h3 className="mb-2 font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="mb-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">
          Choose Your Plan
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {pricingPlans.map((plan, index) => (
            <Card
              key={index}
              className={`relative ${plan.popular ? 'ring-2 ring-blue-500' : ''} ${plan.current ? 'bg-gray-50' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
                  <span className="rounded-full bg-blue-500 px-3 py-1 text-sm font-medium text-white">
                    Most Popular
                  </span>
                </div>
              )}
              {plan.current && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
                  <span className="rounded-full bg-gray-500 px-3 py-1 text-sm font-medium text-white">
                    Current Plan
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-center">
                  <div className="text-2xl font-bold">{plan.name}</div>
                  <div className="mt-2 text-3xl font-bold text-blue-600">
                    {plan.price}
                    <span className="text-sm font-normal text-gray-500">
                      /{plan.period}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="mb-6 space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <span className="mr-2 text-green-500">✓</span>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? 'default' : 'outline'}
                  disabled={plan.current}
                >
                  {plan.current
                    ? 'Current Plan'
                    : plan.popular
                      ? 'Get Premium'
                      : 'Choose Plan'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Coming Soon Notice */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="mb-4 text-4xl">🚀</div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">
              We're Building Something Amazing
            </h3>
            <p className="mb-6 text-gray-600">
              Our team is working hard to bring you the most advanced virtual
              closet experience. Stay tuned for updates and be the first to know
              when these features launch!
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button>Get Notified</Button>
              <Button variant="outline">Learn More</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
