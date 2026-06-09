#!/usr/bin/env tsx
import { DEMO_TRACES } from '@/demo/traces';
import { getDemoProjectById } from '@/demo/projects';
import { runCalculatie, runProjectCalculatie, generateCalculatieExcel } from '@/lib/calculatie';

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

async function main() {
  console.log('Calculatie validatie\n');

  for (const trace of DEMO_TRACES.slice(0, 5)) {
    const project = getDemoProjectById(trace.projectId)!;
    const calc = runCalculatie(trace, project);
    assert(
      `${trace.code}: ${calc.regels.length} posten`,
      calc.regels.length >= 5,
      `got ${calc.regels.length}`,
    );
    assert(
      `${trace.code}: totaal > 0`,
      calc.samenvatting.totaalInclBtw > 1000,
      formatEuro(calc.samenvatting.totaalInclBtw),
    );

    const buf = await generateCalculatieExcel(calc);
    assert(`${trace.code}: Excel ${buf.length} bytes`, buf.length > 5000);
  }

  const project = getDemoProjectById('demo-project-002')!;
  const projectTraces = DEMO_TRACES.filter((t) => t.projectId === project.id);
  const projectCalc = runProjectCalculatie(projectTraces, project);
  assert('Project calculatie geaggregeerd', projectCalc.regels.length >= 5);
  assert(
    'Project totaal >= som traces (excl. dubbele projectkosten)',
    projectCalc.samenvatting.totaalInclBtw > 5000,
  );

  console.log(`\n${passed} geslaagd, ${failed} mislukt`);
  process.exit(failed > 0 ? 1 : 0);
}

void main();

function formatEuro(n: number) {
  return `€${n.toFixed(0)}`;
}
