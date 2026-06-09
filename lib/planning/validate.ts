#!/usr/bin/env tsx
import { DEMO_PROJECTS } from '@/demo/projects';
import { DEMO_TRACES } from '@/demo/traces';
import { getProjectActions } from '@/lib/services/project-stats';
import { generateProjectPlanning } from '@/lib/planning';

let passed = 0;
let failed = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? `: ${detail}` : ''}`);
  }
}

const project = DEMO_PROJECTS[1]!;
const traces = DEMO_TRACES.filter((t) => t.projectId === project.id);
const actions = getProjectActions(project.id);
const planning = generateProjectPlanning(project, traces, actions);

console.log('Planning validatie\n');

assert('Activiteiten gegenereerd', planning.activiteiten.length >= 10, `${planning.activiteiten.length}`);
assert('Heeft milestones', planning.milestones.length >= 2);
assert('Start <= eind', planning.startDatum <= planning.eindDatum);
assert('Samenvatting', planning.samenvatting.length > 20);

for (const a of planning.activiteiten) {
  assert(`${a.id}: datums`, a.startDatum <= a.eindDatum);
  assert(`${a.id}: beschrijving`, a.beschrijving.length > 10);
}

const hddTrace = traces.find((t) => t.segmenten.some((s) => s.legtechniek === 'hdd'));
if (hddTrace) {
  assert('HDD boorengineering', planning.activiteiten.some((a) => a.id.includes('boorengineering')));
}

console.log(`\n${passed} geslaagd, ${failed} mislukt`);
process.exit(failed > 0 ? 1 : 0);
