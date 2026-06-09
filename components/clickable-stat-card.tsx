'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface ClickableStatCardProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

function useCardNavigation(href: string) {
  const router = useRouter();

  const navigate = (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
    if ('key' in event && event.key !== 'Enter' && event.key !== ' ') return;
    if ('key' in event) event.preventDefault();

    const target = event.target as HTMLElement;
    if (target.closest('a, button, input, select, textarea')) return;

    router.push(href);
  };

  return navigate;
}

export function ClickableStatCard({ href, children, className, ariaLabel }: ClickableStatCardProps) {
  const navigate = useCardNavigation(href);

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={navigate}
      onKeyDown={navigate}
      className={cn(
        'block cursor-pointer rounded-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] hover:ring-2 hover:ring-[#2D6FE8]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6FE8] active:translate-y-0',
        className
      )}
    >
      {children}
    </div>
  );
}

interface ClickableBarProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function ClickableBar({ href, children, className, ariaLabel }: ClickableBarProps) {
  const navigate = useCardNavigation(href);

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={navigate}
      onKeyDown={navigate}
      className={cn(
        'block cursor-pointer rounded-lg transition-all duration-200 hover:bg-white/80 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6FE8]',
        className
      )}
    >
      {children}
    </div>
  );
}
