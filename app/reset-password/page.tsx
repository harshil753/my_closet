/**
 * Password Reset Page
 * Handles password reset via magic link
 */

import { Suspense } from 'react';
import { ResetPasswordForm } from './ResetPasswordForm';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
