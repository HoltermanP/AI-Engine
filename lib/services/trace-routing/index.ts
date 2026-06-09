export type {
  TraceWaypoint,
  TraceRoutingInput,
  TraceRoutingResult,
  TraceRouteAlternative,
  RouteSegmentAnalysis,
  RouteCrossing,
  RoutingContext,
} from './types';

export { planAutomaticTrace, buildRoutingContext } from './plan';
export { refineTraceWithAi } from './ai-refine';
export { normReferentiesVoorDiscipline } from './context';
export {
  routingSegmentsToTraceSegmenten,
  alternativeToRoutingResult,
  routingResultToSavedMetadata,
} from './persist';
export type { SavedRoutingMetadata } from './persist';
