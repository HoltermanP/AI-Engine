import { config } from 'dotenv';
import { getProjecten, getTraces, getTrace, getBestaandNet } from './store';

config({ path: '.env.local' });

async function verify() {
  const projects = await getProjecten();
  const traces = await getTraces('demo-project-001');
  const trace = await getTrace('trace-ls-001');
  const net = await getBestaandNet();
  console.log(`✓ ${projects.length} projecten`);
  console.log(`✓ ${traces.length} tracés in demo-project-001`);
  console.log(`✓ trace-ls-001: ${trace?.coordinates.length ?? 0} coördinaten`);
  console.log(`✓ ${net.length} bestaand net`);
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
