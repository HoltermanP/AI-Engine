import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: 'default' | 'wide' | 'full';
}

export function PageContainer({ children, className, size = 'default' }: PageContainerProps) {
  const sizes = {
    default: 'max-w-[1400px]',
    wide: 'max-w-[1600px]',
    full: 'max-w-none',
  };

  return (
    <div className={cn('mx-auto space-y-6 p-4 sm:p-6 lg:space-y-8 lg:p-8', sizes[size], className)}>
      {children}
    </div>
  );
}
