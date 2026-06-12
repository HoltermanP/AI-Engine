'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getFirstTraceIdAction } from '@/lib/actions/data';
import { useProjectProcess } from '@/components/project-process-provider';
import {
  Settings,
  FolderKanban,
  Layers,
  ChevronRight,
  BarChart3,
  FileBarChart,
  ClipboardList,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  extractProjectIdFromPath,
  extractTraceIdFromPath,
  getProjectProcessStepHref,
  PROJECT_PROCESS_STEPS,
} from '@/lib/navigation/project-process';

interface NavItem {
  href: string;
  label: string;
  icon: typeof FolderKanban;
  description: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Portfolio',
    items: [
      {
        href: '/dashboard',
        label: 'Projecten',
        icon: FolderKanban,
        description: 'Overzicht & start',
      },
    ],
  },
  {
    title: 'Uitvoering',
    items: [
      {
        href: '/acties',
        label: 'Open acties',
        icon: ClipboardList,
        description: 'Taken & opvolging',
      },
    ],
  },
  {
    title: 'Inzicht',
    items: [
      {
        href: '/rapportage',
        label: 'Rapportage',
        icon: FileBarChart,
        description: 'Status & voortgang',
      },
      {
        href: '/beheer',
        label: 'Beheer',
        icon: BarChart3,
        description: 'KPI\'s & sturing',
      },
    ],
  },
  {
    title: 'Systeem',
    items: [
      {
        href: '/config',
        label: 'Configuratie',
        icon: Settings,
        description: 'Instellingen',
      },
    ],
  },
];

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname.startsWith('/project/');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const breadcrumbLabels: Record<string, string> = {
  dashboard: 'Projecten',
  rapportage: 'Rapportage',
  acties: 'Open acties',
  beheer: 'Beheer',
  project: 'Project',
  netontwerp: 'Netontwerp',
  dossier: 'Dossier',
  planning: 'Planning',
  config: 'Configuratie',
  traces: 'Tracés',
  trace: 'Tracé-engineering',
};

interface AppShellProps {
  children: React.ReactNode;
  userName?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function ProjectContextPanel({ projectId, pathname }: { projectId: string; pathname: string }) {
  const process = useProjectProcess();
  const [fetchedTraceId, setFetchedTraceId] = useState<string | null>(null);
  const isOnProject = pathname.startsWith('/project/') || pathname.startsWith('/rapportage/');

  const traceLinkId =
    process?.traceLinkId ??
    extractTraceIdFromPath(pathname) ??
    fetchedTraceId;

  useEffect(() => {
    if (process || extractTraceIdFromPath(pathname)) return;
    let cancelled = false;
    getFirstTraceIdAction(projectId).then((id) => {
      if (!cancelled) setFetchedTraceId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, pathname, process]);

  if (!isOnProject) return null;

  const itemClass = (active: boolean) =>
    cn(
      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors',
      active
        ? 'bg-[#2D6FE8]/15 text-white'
        : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
    );

  return (
    <div className="relative border-t border-white/[0.06] px-3 py-3">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        Werkruimte
      </p>
      <div className="space-y-0.5">
        {PROJECT_PROCESS_STEPS.map((step) => {
          const href = getProjectProcessStepHref(
            step.id,
            projectId,
            step.id === 'trace' ? traceLinkId : undefined
          );
          const active =
            (step.id === 'overzicht' && pathname === `/project/${projectId}`) ||
            (step.id === 'netontwerp' && pathname.includes('/netontwerp')) ||
            (step.id === 'trace' && pathname.includes('/trace/')) ||
            (step.id === 'planning' && pathname.includes('/planning')) ||
            (step.id === 'dossier' && pathname.includes('/dossier')) ||
            (step.id === 'rapportage' && pathname.startsWith(`/rapportage/${projectId}`));

          const Icon = step.icon;
          const isCurrentPage = pathname === href || (step.id === 'trace' && active);

          const inner = (
            <>
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="truncate font-medium">{step.titel}</span>
            </>
          );

          if (isCurrentPage) {
            return (
              <div key={step.id} className={itemClass(active)} aria-current="page">
                {inner}
              </div>
            );
          }

          return (
            <Link key={step.id} href={href} prefetch className={itemClass(active)}>
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  projectId,
  userName,
}: {
  pathname: string;
  projectId: string | null;
  userName: string;
}) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(45,111,232,0.14),transparent_55%)]" />

      <div className="relative border-b border-white/[0.06] px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2D6FE8] to-[#1a4fb8] shadow-lg shadow-[#2D6FE8]/30">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-[family-name:var(--font-space-grotesk)] text-base font-bold tracking-tight text-white">
              InfraEngine
            </p>
            <p className="text-[10px] text-slate-400">Ondergrondse infrastructuur</p>
          </div>
        </div>
      </div>

      <nav className="relative flex-1 overflow-y-auto p-3">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-4">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {group.title}
            </p>
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon, description }) => {
                const active = isNavActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
                      active
                        ? 'nav-pill-active text-white'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                        active
                          ? 'bg-[#2D6FE8]/30 text-[#93c5fd]'
                          : 'bg-white/[0.04] text-slate-400 group-hover:bg-white/[0.08] group-hover:text-white'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-tight">{label}</span>
                      <span className="block text-[10px] text-slate-500 group-hover:text-slate-400">
                        {description}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {projectId && <ProjectContextPanel projectId={projectId} pathname={pathname} />}
      </nav>

      <div className="relative border-t border-white/[0.06] p-4">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/[0.06]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2D6FE8] to-emerald-500 text-xs font-bold text-white">
            {getInitials(userName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{userName}</p>
            <p className="text-[10px] text-slate-400">Projectingenieur</p>
          </div>
        </div>
      </div>
    </>
  );
}

export function AppShell({ children, userName = 'Ingenieur' }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumb = segments.map((seg) => breadcrumbLabels[seg] ?? seg).join(' / ') || 'Home';
  const projectId = extractProjectIdFromPath(pathname);

  // Drawer sluiten bij navigatie en bij Escape
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="flex min-h-dvh bg-[var(--brand-navy)] text-foreground">
      {/* Vaste sidebar vanaf lg */}
      <aside className="relative hidden w-60 shrink-0 flex-col border-r border-white/[0.06] bg-[var(--brand-navy)] lg:flex">
        <SidebarContent pathname={pathname} projectId={projectId} userName={userName} />
      </aside>

      {/* Mobiel drawer-menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Menu sluiten"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-[var(--brand-navy)] shadow-2xl">
            <button
              type="button"
              aria-label="Menu sluiten"
              className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent pathname={pathname} projectId={projectId} userName={userName} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="glass-panel flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4 sm:px-6">
          <button
            type="button"
            aria-label="Menu openen"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-1.5 text-xs">
            <span className="hidden shrink-0 font-medium text-muted-foreground sm:inline">
              InfraEngine
            </span>
            <ChevronRight className="hidden h-3 w-3 shrink-0 text-muted-foreground/60 sm:block" />
            <span className="truncate font-medium text-foreground">{breadcrumb}</span>
          </div>
        </header>
        <main className="app-mesh-bg flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
