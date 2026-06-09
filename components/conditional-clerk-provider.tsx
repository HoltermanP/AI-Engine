'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { isClerkConfiguredClient } from '@/lib/auth';

interface ClerkProviderProps {
  children: ReactNode;
}

export function ConditionalClerkProvider({ children }: ClerkProviderProps) {
  const [ClerkProvider, setClerkProvider] = useState<React.ComponentType<ClerkProviderProps> | null>(null);

  useEffect(() => {
    if (!isClerkConfiguredClient()) return;

    void import('@clerk/nextjs').then((mod) => {
      setClerkProvider(() => mod.ClerkProvider);
    });
  }, []);

  if (!isClerkConfiguredClient() || !ClerkProvider) {
    return children;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
