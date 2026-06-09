import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackLinkProps {
  href: string;
  label: string;
  className?: string;
  variant?: 'default' | 'light';
}

export function BackLink({ href, label, className, variant = 'default' }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'mb-3 inline-flex items-center gap-1 text-xs font-medium transition-colors',
        variant === 'light'
          ? 'text-white/60 hover:text-white'
          : 'text-muted-foreground hover:text-[#2D6FE8]',
        className
      )}
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
