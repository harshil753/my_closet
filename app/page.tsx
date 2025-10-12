/**
 * Home Page - Landing page for My Closet Virtual Try-On App
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth/auth-context';

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="mb-16 text-center">
          <h1 className="mb-6 text-5xl font-bold text-gray-900">My Closet</h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-600">
            Transform your wardrobe with AI-powered virtual try-on technology.
            Upload your clothes and see how they look before you buy.
          </p>

          {loading ? (
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            </div>
          ) : !user ? (
            <div className="flex justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Login To Get Started
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline">
                  Sign Up
                </Button>
              </Link>
            </div>
          ) : null}
        </div>

        {/* Features Section */}
        <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          <Link href="/closet">
            <Card className="cursor-pointer text-center transition-all hover:scale-105 hover:shadow-lg">
              <CardHeader>
                <div className="mb-4 text-4xl">👕</div>
                <CardTitle>View Your Closet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Browse and organize your clothing collection. See all your
                  items categorized and ready for virtual try-on.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/try-on">
            <Card className="cursor-pointer text-center transition-all hover:scale-105 hover:shadow-lg">
              <CardHeader>
                <div className="mb-4 text-4xl">👗</div>
                <CardTitle>Try On Clothes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  See how different outfits look on you with our advanced
                  AI-powered virtual try-on technology.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/upload">
            <Card className="cursor-pointer text-center transition-all hover:scale-105 hover:shadow-lg">
              <CardHeader>
                <div className="mb-4 text-4xl">📸</div>
                <CardTitle>Upload New Clothes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Add new clothing items to your closet with AI-powered
                  detection and automatic categorization.
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* How It Works */}
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-8 text-center text-3xl font-bold">How It Works</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="mb-2 font-semibold">Upload Photos</h3>
              <p className="text-sm text-gray-600">
                Take photos of your clothing items and upload them to your
                virtual closet.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="mb-2 font-semibold">Browse Your Closet</h3>
              <p className="text-sm text-gray-600">
                Browse through your clothes in your virtual closet and see all
                your items organized by category.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="mb-2 font-semibold">AI Virtual Try-On</h3>
              <p className="text-sm text-gray-600">
                Use the magic of AI to virtually try on new outfits and see how
                you'd look before you buy.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <span className="text-2xl font-bold text-blue-600">4</span>
              </div>
              <h3 className="mb-2 font-semibold">Save & Organize</h3>
              <p className="text-sm text-gray-600">
                Save your favorite looks and organize your virtual closet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
