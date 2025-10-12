/**
 * Help page with documentation and support
 */

import { HelpCenter, QuickHelpWidget } from '@/components/help/HelpCenter';

export default function HelpPage() {
  return (
    <div>
      <HelpCenter />
      <QuickHelpWidget />
    </div>
  );
}
