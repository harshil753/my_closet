import { SupportCenter } from '@/components/features/support/SupportCenter';
import { PageHeader } from '@/components/layout/PageHeader';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Support Center"
        description="Get help, find answers, and connect with our support team"
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SupportCenter />
      </div>
    </div>
  );
}
