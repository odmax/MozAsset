'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface BackButtonProps {
  defaultHref?: string;
  className?: string;
  showText?: boolean;
}

export function BackButton({ defaultHref = '/', className = '', showText = true }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(defaultHref);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`gap-2 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      {showText && 'Back'}
    </Button>
  );
}

export function BackLink({ href = '/', className = '', showText = true }: { href?: string; className?: string; showText?: boolean }) {
  return (
    <Link href={href} className={`text-sm text-muted-foreground hover:text-foreground ${className}`}>
      <ArrowLeft className="inline h-4 w-4 mr-1" />
      {showText && 'Back'}
    </Link>
  );
}