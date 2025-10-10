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
          ) : user ? (
            <div className="flex justify-center gap-4">
              <Link href="/closet">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  View My Closet
                </Button>
              </Link>
              <Link href="/upload">
                <Button size="lg" variant="outline">
                  Upload Items
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Get Started
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="mb-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          <Card className="text-center">
            <CardHeader>
              <div className="mb-4 text-4xl">📸</div>
              <CardTitle>Smart Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Upload photos of your clothing items with AI-powered detection
                and automatic categorization.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mb-4 text-4xl">👗</div>
              <CardTitle>Virtual Try-On</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                See how different outfits look on you with our advanced
                AI-powered virtual try-on technology.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mb-4 text-4xl">🎨</div>
              <CardTitle>Style Inspiration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Get personalized style recommendations and discover new ways to
                wear your existing clothes.
              </p>
            </CardContent>
          </Card>
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
              <h3 className="mb-2 font-semibold">AI Processing</h3>
              <p className="text-sm text-gray-600">
                Our AI automatically detects and categorizes your clothing
                items.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="mb-2 font-semibold">Virtual Try-On</h3>
              <p className="text-sm text-gray-600">
                See how different combinations look with our virtual try-on
                feature.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <span className="text-2xl font-bold text-blue-600">4</span>
              </div>
              <h3 className="mb-2 font-semibold">Style & Share</h3>
              <p className="text-sm text-gray-600">
                Get style recommendations and share your favorite looks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
