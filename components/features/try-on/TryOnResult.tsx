'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TryOnResultProps {
  title?: string;
  resultUrl?: string | null;
  fallbackUrl?: string;
  onOpenNewTab?: () => void;
  onRetry?: () => void;
}

export function TryOnResult({
  title = 'Your AI-Generated Try-On Result',
  resultUrl,
  fallbackUrl = 'https://via.placeholder.com/400x600/cccccc/666666?text=AI+Try-On+Result',
  onOpenNewTab,
  onRetry,
}: TryOnResultProps) {
  const src = resultUrl || fallbackUrl;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-gray-50 p-4">
          <img
            src={src}
            alt="AI-generated try-on result"
            className="mx-auto w-full max-w-md rounded-lg shadow-md"
            onError={(e) => {
              e.currentTarget.src = fallbackUrl;
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (onOpenNewTab) {
                onOpenNewTab();
                return;
              }
              window.open(src, '_blank');
            }}
          >
            Open in New Tab
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const res = await fetch(src, { cache: 'no-store' });
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'try-on-result.jpg';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
              } catch {}
            }}
          >
            Download
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                if ((navigator as any).share) {
                  await (navigator as any).share({
                    title: 'My Try-On Result',
                    text: 'Check out this virtual try-on!',
                    url: src,
                  });
                } else {
                  window.open(src, '_blank');
                }
              } catch {}
            }}
          >
            Share
          </Button>
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default TryOnResult;
