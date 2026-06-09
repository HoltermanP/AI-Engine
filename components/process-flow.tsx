'use client';

import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

type StapStatus = 'gereed' | 'open' | 'bezig' | 'blokkerend';

interface ProcessFlowProps {
  dataStatus: StapStatus;
  toetsStatus: StapStatus;
  calcStatus: StapStatus;
  tekenStatus: StapStatus;
  onderzoekStatus: StapStatus;
  aanvraagStatus: StapStatus;
  dossierStatus: StapStatus;
}

const STATUS_COLORS: Record<StapStatus, string> = {
  gereed: '#16a34a',
  open: '#94a3b8',
  bezig: '#2D6FE8',
  blokkerend: '#FF4D1C',
};

function nodeStyle(status: StapStatus) {
  return {
    background: '#ffffff',
    border: `2px solid ${STATUS_COLORS[status]}`,
    borderRadius: 8,
    padding: '8px 14px',
    color: '#0f172a',
    fontSize: 11,
    fontFamily: 'var(--font-space-grotesk), sans-serif',
    minWidth: 120,
    textAlign: 'center' as const,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  };
}

export function ProcessFlow({
  dataStatus,
  toetsStatus,
  calcStatus,
  tekenStatus,
  onderzoekStatus,
  aanvraagStatus,
  dossierStatus,
}: ProcessFlowProps) {
  const nodes: Node[] = useMemo(
    () => [
      { id: 'ontwerp', position: { x: 0, y: 100 }, data: { label: 'Ontwerp ✓' }, style: nodeStyle('gereed'), sourcePosition: Position.Right },
      { id: 'data', position: { x: 180, y: 100 }, data: { label: `Data verzamelen` }, style: nodeStyle(dataStatus), sourcePosition: Position.Right, targetPosition: Position.Left },
      { id: 'toets', position: { x: 380, y: 100 }, data: { label: 'Toets tracé' }, style: nodeStyle(toetsStatus), sourcePosition: Position.Right, targetPosition: Position.Left },
      { id: 'berekenen', position: { x: 580, y: 0 }, data: { label: 'Berekenen' }, style: nodeStyle(calcStatus), sourcePosition: Position.Right, targetPosition: Position.Left },
      { id: 'tekenen', position: { x: 580, y: 100 }, data: { label: 'Tekenen' }, style: nodeStyle(tekenStatus), sourcePosition: Position.Right, targetPosition: Position.Left },
      { id: 'onderzoek', position: { x: 580, y: 200 }, data: { label: 'Onderzoeken' }, style: nodeStyle(onderzoekStatus), sourcePosition: Position.Right, targetPosition: Position.Left },
      { id: 'aanvragen', position: { x: 780, y: 100 }, data: { label: 'Aanvragen' }, style: nodeStyle(aanvraagStatus), sourcePosition: Position.Right, targetPosition: Position.Left },
      { id: 'dossier', position: { x: 980, y: 100 }, data: { label: 'Dossier' }, style: nodeStyle(dossierStatus), targetPosition: Position.Left },
    ],
    [dataStatus, toetsStatus, calcStatus, tekenStatus, onderzoekStatus, aanvraagStatus, dossierStatus]
  );

  const edges: Edge[] = useMemo(
    () => [
      { id: 'e1', source: 'ontwerp', target: 'data', animated: dataStatus === 'bezig', style: { stroke: '#cbd5e1' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' } },
      { id: 'e2', source: 'data', target: 'toets', animated: toetsStatus === 'bezig', style: { stroke: '#cbd5e1' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' } },
      { id: 'e3', source: 'toets', target: 'berekenen', style: { stroke: '#cbd5e1' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' } },
      { id: 'e4', source: 'toets', target: 'tekenen', style: { stroke: '#cbd5e1' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' } },
      { id: 'e5', source: 'toets', target: 'onderzoek', style: { stroke: '#cbd5e1' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' } },
      { id: 'e6', source: 'berekenen', target: 'aanvragen', style: { stroke: '#cbd5e1' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' } },
      { id: 'e7', source: 'tekenen', target: 'aanvragen', style: { stroke: '#cbd5e1' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' } },
      { id: 'e8', source: 'onderzoek', target: 'aanvragen', style: { stroke: '#cbd5e1' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' } },
      { id: 'e9', source: 'aanvragen', target: 'dossier', style: { stroke: '#cbd5e1' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1' } },
    ],
    [dataStatus, toetsStatus]
  );

  return (
    <div className="h-[280px] w-full rounded-lg border border-border bg-muted/30">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#d8e0ec" gap={20} />
        <Controls showInteractive={false} className="!bg-card !border-border" />
      </ReactFlow>
    </div>
  );
}
