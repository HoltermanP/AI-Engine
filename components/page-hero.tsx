import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Goedemorgen';
  if (hour < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

interface PageHeroProps {
  title: string;
  subtitle: string;
  userName?: string;
  showGreeting?: boolean;
  eyebrow?: string;
  variant?: 'light' | 'dark';
  backLink?: { href: string; label: string };
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function PageHero({
  title,
  subtitle,
  userName,
  showGreeting = false,
  eyebrow,
  variant = 'light',
  backLink,
  actions,
  footer,
  className,
}: PageHeroProps) {
  const firstName = userName?.split(' ')[0];
  const isDark = variant === 'dark';

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl px-4 py-5 sm:px-8 sm:py-8',
        isDark
          ? 'border border-[#2D6FE8]/25 bg-gradient-to-br from-[#0D1428] via-[#152040] to-[#1e3a7a] text-white shadow-[var(--shadow-lift)]'
          : 'hero-banner border border-[#2D6FE8]/15',
        className
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl',
          isDark ? 'bg-[#2D6FE8]/25' : 'bg-[#2D6FE8]/20'
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full blur-3xl',
          isDark ? 'bg-emerald-400/10' : 'bg-emerald-400/15'
        )}
      />
      {!isDark && (
        <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA2KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" />
      )}

      <div className="relative flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 max-w-2xl space-y-2">
          {backLink && (
            <Link
              href={backLink.href}
              className={cn(
                'mb-1 inline-flex items-center gap-1 text-xs font-medium transition-colors',
                isDark ? 'text-white/60 hover:text-white' : 'text-muted-foreground hover:text-[#2D6FE8]'
              )}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {backLink.label}
            </Link>
          )}
          {eyebrow && (
            <p
              className={cn(
                'text-[10px] font-semibold uppercase tracking-[0.2em]',
                isDark ? 'text-white/50' : 'text-[#2D6FE8]'
              )}
            >
              {eyebrow}
            </p>
          )}
          {showGreeting && firstName && !eyebrow && (
            <p className={cn('text-sm font-medium', isDark ? 'text-[#93c5fd]' : 'text-[#2D6FE8]')}>
              {getGreeting()}, {firstName}
            </p>
          )}
          <h1
            className={cn(
              'font-[family-name:var(--font-space-grotesk)] text-2xl font-bold tracking-tight sm:text-3xl',
              isDark ? 'text-white' : 'text-[#0D1428]'
            )}
          >
            {title}
          </h1>
          <p
            className={cn(
              'text-sm leading-relaxed sm:text-base',
              isDark ? 'text-white/80' : 'text-slate-600'
            )}
          >
            {subtitle}
          </p>
          {footer && <div className="pt-2">{footer}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </section>
  );
}
