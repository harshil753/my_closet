/**
 * User onboarding flow component
 * Guided tour and feature introduction
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  image?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  skipable?: boolean;
}

interface OnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to My Closet!',
      description:
        "Your personal virtual wardrobe and AI-powered try-on experience. Let's get you started with a quick tour.",
      image: '/images/onboarding/welcome.svg',
    },
    {
      id: 'upload',
      title: 'Upload Your Clothes',
      description:
        'Start by uploading photos of your clothing items. Our AI will automatically detect and categorize them for you.',
      image: '/images/onboarding/upload.svg',
      action: {
        label: 'Try Upload',
        onClick: () => {
          // Navigate to upload page
          window.location.href = '/upload';
        },
      },
    },
    {
      id: 'organize',
      title: 'Organize Your Closet',
      description:
        'View and organize your clothing by category. You can add tags, notes, and mark favorites.',
      image: '/images/onboarding/organize.svg',
      action: {
        label: 'View Closet',
        onClick: () => {
          // Navigate to closet page
          window.location.href = '/closet';
        },
      },
    },
    {
      id: 'try-on',
      title: 'Virtual Try-On',
      description:
        'Select clothing items and see how they look on you with our AI-powered virtual try-on technology.',
      image: '/images/onboarding/try-on.svg',
      action: {
        label: 'Start Try-On',
        onClick: () => {
          // Navigate to try-on page
          window.location.href = '/try-on';
        },
      },
    },
    {
      id: 'profile',
      title: 'Set Up Your Profile',
      description:
        'Upload your base photos for the most accurate virtual try-on results. You can add front, side, and full-body photos.',
      image: '/images/onboarding/profile.svg',
      action: {
        label: 'Set Up Profile',
        onClick: () => {
          // Navigate to profile page
          window.location.href = '/profile';
        },
      },
    },
    {
      id: 'complete',
      title: "You're All Set!",
      description:
        "You're ready to start using My Closet! Explore your virtual wardrobe and try on different outfits.",
      image: '/images/onboarding/complete.svg',
    },
  ];

  useEffect(() => {
    // Show onboarding if user is new
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setIsVisible(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setIsVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setIsVisible(false);
    onSkip();
  };

  if (!isVisible) return null;

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <div className="p-6">
          {/* Progress indicator */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Step {currentStep + 1} of {steps.length}
              </span>
              <button
                onClick={handleSkip}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Skip tour
              </button>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                style={{
                  width: `${((currentStep + 1) / steps.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Step content */}
          <div className="text-center">
            {currentStepData.image && (
              <div className="mb-6">
                <img
                  src={currentStepData.image}
                  alt={currentStepData.title}
                  className="mx-auto h-64 w-64 object-contain"
                />
              </div>
            )}

            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              {currentStepData.title}
            </h2>

            <p className="mb-6 text-lg text-gray-600">
              {currentStepData.description}
            </p>

            {currentStepData.action && (
              <div className="mb-6">
                <Button
                  onClick={currentStepData.action.onClick}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {currentStepData.action.label}
                </Button>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            <Button
              onClick={handlePrevious}
              disabled={isFirstStep}
              variant="outline"
            >
              Previous
            </Button>

            <div className="flex gap-2">
              {!isLastStep && (
                <Button onClick={handleSkip} variant="ghost">
                  Skip
                </Button>
              )}
              <Button
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLastStep ? 'Get Started' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * Onboarding checklist component
 */
export function OnboardingChecklist() {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const checklistItems = [
    {
      id: 'upload-photos',
      title: 'Upload your first clothing item',
      description: 'Add at least one clothing item to your closet',
      action: '/upload',
    },
    {
      id: 'setup-profile',
      title: 'Set up your profile photos',
      description: 'Upload base photos for virtual try-on',
      action: '/profile',
    },
    {
      id: 'try-on',
      title: 'Try your first virtual try-on',
      description: 'Select clothing items and see how they look on you',
      action: '/try-on',
    },
    {
      id: 'organize-closet',
      title: 'Organize your closet',
      description: 'Add tags and organize your clothing items',
      action: '/closet',
    },
  ];

  const handleComplete = (itemId: string) => {
    setCompletedSteps((prev) => [...prev, itemId]);
  };

  const isCompleted = (itemId: string) => completedSteps.includes(itemId);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Getting Started Checklist
      </h3>
      {checklistItems.map((item) => (
        <div
          key={item.id}
          className={`rounded-lg border p-4 ${
            isCompleted(item.id)
              ? 'border-green-200 bg-green-50'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div
                className={`mr-3 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                  isCompleted(item.id)
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-300'
                }`}
              >
                {isCompleted(item.id) && '✓'}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            </div>
            {!isCompleted(item.id) && (
              <Button
                size="sm"
                onClick={() => handleComplete(item.id)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Complete
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
