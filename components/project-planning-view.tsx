'use client';

import { useEffect, useState, useTransition } from 'react';
import type { ProjectPlanning } from '@/lib/planning/types';
import { generateProjectPlanningAction } from '@/lib/actions/planning';
import { PlanningGanttChart } from '@/components/planning-gantt-chart';
import { PlanningActiviteiten } from '@/components/planning-activiteiten';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarRange, Loader2, RefreshCw, GanttChart, ListTree } from 'lucide-react';
import { formatDatumNl } from '@/lib/planning/dates';

interface ProjectPlanningViewProps {
  projectId: string;
}

export function ProjectPlanningView({ projectId }: ProjectPlanningViewProps) {
  const [planning, setPlanning] = useState<ProjectPlanning | null>(null);
  const [traceFilter, setTraceFilter] = useState<string>('all');
  const [isPending, startTransition] = useTransition();

  function load() {
    startTransition(async () => {
      const result = await generateProjectPlanningAction(projectId);
      setPlanning(result);
    });
  }

  useEffect(() => {
    load();
  }, [projectId]);

  const traceCodes = planning
    ? [...new Set(planning.activiteiten.map((a) => a.traceCode).filter(Boolean) as string[])].sort()
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-[#2D6FE8]" />
          <div>
            <p className="text-sm font-medium text-foreground">Projectplanning</p>
            {planning && (
              <p className="text-xs text-muted-foreground">{planning.samenvatting}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {traceCodes.length > 1 && (
            <Select value={traceFilter} onValueChange={(v) => setTraceFilter(v ?? 'all')}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="Tracé" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle tracés</SelectItem>
                {traceCodes.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" variant="outline" onClick={load} disabled={isPending}>
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {planning && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground">Start</p>
                <p className="text-sm font-semibold">{formatDatumNl(planning.startDatum)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground">Eind (plan)</p>
                <p className="text-sm font-semibold">{formatDatumNl(planning.eindDatum)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground">Duur</p>
                <p className="text-sm font-semibold">{planning.duurDagen} dagen</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground">Milestones</p>
                <p className="text-sm font-semibold">{planning.milestones.length}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="gantt">
            <TabsList>
              <TabsTrigger value="gantt" className="gap-1 text-xs">
                <GanttChart className="h-3 w-3" /> Gantt-chart
              </TabsTrigger>
              <TabsTrigger value="activiteiten" className="gap-1 text-xs">
                <ListTree className="h-3 w-3" /> Activiteiten
              </TabsTrigger>
            </TabsList>
            <TabsContent value="gantt" className="mt-4">
              <PlanningGanttChart
                planning={planning}
                traceFilter={traceFilter === 'all' ? null : traceFilter}
              />
            </TabsContent>
            <TabsContent value="activiteiten" className="mt-4">
              <PlanningActiviteiten planning={planning} />
            </TabsContent>
          </Tabs>
        </>
      )}

      {!planning && isPending && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Planning genereren…
        </div>
      )}
    </div>
  );
}
