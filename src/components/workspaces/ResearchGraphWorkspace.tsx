import { useState } from 'react'
import { useWorkspaceStore, type WorkspaceKey } from '../../state/workspaceStore'

interface GraphNode {
  id: string
  label: string
  type: 'study' | 'run' | 'review' | 'experiment' | 'report'
  subtitle: string
  x: number
  y: number
  targetWorkspace: WorkspaceKey
  studyId?: string
  metadata: Record<string, string>
}

interface GraphEdge {
  from: string
  to: string
  label?: string
}

export default function ResearchGraphWorkspace() {
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)
  const setSelectedStudyId = useWorkspaceStore((s) => s.setSelectedStudyId)

  const [selectedNodeId, setSelectedNodeId] = useState<string>('study-206')

  const nodes: GraphNode[] = [
    // Studies
    {
      id: 'study-206',
      label: 'Study: Decathlon BRATS_206',
      type: 'study',
      subtitle: 'Real MRI (T1, T1Gd, T2, FLAIR)',
      x: 80,
      y: 90,
      targetWorkspace: 'viewer',
      studyId: 'brats_206',
      metadata: {
        'Modality Count': '4 Sequences',
        'Acquisition': 'Task01_BrainTumour',
        'Spacing': '1.00 × 1.00 × 1.00 mm',
        'Status': 'Valid NIfTI'
      }
    },
    {
      id: 'study-306',
      label: 'Study: Decathlon BRATS_306',
      type: 'study',
      subtitle: 'Real MRI (Held-out case)',
      x: 80,
      y: 290,
      targetWorkspace: 'viewer',
      studyId: 'brats_306',
      metadata: {
        'Modality Count': '4 Sequences',
        'Acquisition': 'Task01_BrainTumour',
        'Spacing': '1.00 × 1.00 × 1.00 mm',
        'Status': 'Valid NIfTI'
      }
    },
    // Model Runs
    {
      id: 'run-206-tta',
      label: 'Run #482: SegResNet 2-Pass TTA',
      type: 'run',
      subtitle: 'MONAI bundle v0.5.4 (Flip σ)',
      x: 320,
      y: 70,
      targetWorkspace: 'trust',
      studyId: 'brats_206',
      metadata: {
        'Model': 'SegResNet (BraTS-2018)',
        'Check-hash': '7a8b...pinned',
        'Runtime': '73.6s (CPU)',
        'TTA Passes': '2 (unflipped + axis 1)',
        'WT Volume': '41.2 mL'
      }
    },
    {
      id: 'run-306-tta',
      label: 'Run #483: SegResNet 2-Pass TTA',
      type: 'run',
      subtitle: 'MONAI bundle v0.5.4 (Flip σ)',
      x: 320,
      y: 270,
      targetWorkspace: 'trust',
      studyId: 'brats_306',
      metadata: {
        'Model': 'SegResNet (BraTS-2018)',
        'Check-hash': '7a8b...pinned',
        'Runtime': '69.1s (CPU)',
        'TTA Passes': '2 (unflipped + axis 1)',
        'WT Volume': '38.6 mL'
      }
    },
    // Reviews
    {
      id: 'rev-206',
      label: 'QC Review: BRATS_206 Disagreement',
      type: 'review',
      subtitle: 'Disposition: FLAGGED (Boundary)',
      x: 560,
      y: 70,
      targetWorkspace: 'review',
      studyId: 'brats_206',
      metadata: {
        'Disposition': 'Flagged',
        'Category': 'Infiltrative Boundary Bleed',
        'Error Cluster': '1.57 mL Medial FN',
        'Reviewer': 'RAD-INVESTIGATOR-01'
      }
    },
    {
      id: 'rev-306',
      label: 'QC Review: BRATS_306 Concordance',
      type: 'review',
      subtitle: 'Disposition: ACCEPTED',
      x: 560,
      y: 270,
      targetWorkspace: 'review',
      studyId: 'brats_306',
      metadata: {
        'Disposition': 'Accepted',
        'Category': 'None / Normal Variation',
        'WT Dice': '0.9082',
        'Reviewer': 'RAD-INVESTIGATOR-01'
      }
    },
    // Cohort Experiment
    {
      id: 'exp-decathlon-10',
      label: 'Experiment: 10-Case Decathlon Evaluation',
      type: 'experiment',
      subtitle: 'Cohort Benchmark (Held-out vs Train)',
      x: 780,
      y: 170,
      targetWorkspace: 'research',
      metadata: {
        'Cohort Count': '10 Cases',
        'Mean WT Dice': '0.9013',
        'Mean TC Dice': '0.8989',
        'Mean ET Dice': '0.8503',
        'Mean HD95': '3.12 mm'
      }
    },
    // Reports
    {
      id: 'rep-audit',
      label: 'Report: Provenance Ledger & Audit',
      type: 'report',
      subtitle: 'Cryptographic PDF & JSON Export',
      x: 1000,
      y: 170,
      targetWorkspace: 'trust',
      metadata: {
        'Format': 'HTML / PDF / JSON',
        'Compliance': 'DI-02 Research Standard',
        'Model License': 'Apache-2.0',
        'Integrity': 'SHA-256 Tamper-Evident'
      }
    }
  ]

  const edges: GraphEdge[] = [
    { from: 'study-206', to: 'run-206-tta', label: 'Inference' },
    { from: 'study-306', to: 'run-306-tta', label: 'Inference' },
    { from: 'run-206-tta', to: 'rev-206', label: 'Audit' },
    { from: 'run-306-tta', to: 'rev-306', label: 'Audit' },
    { from: 'rev-206', to: 'exp-decathlon-10', label: 'Aggregate' },
    { from: 'rev-306', to: 'exp-decathlon-10', label: 'Aggregate' },
    { from: 'exp-decathlon-10', to: 'rep-audit', label: 'Sign-off' }
  ]

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0]

  const navigateToNode = (node: GraphNode) => {
    if (node.studyId) {
      setSelectedStudyId(node.studyId)
    }
    setActiveWorkspace(node.targetWorkspace)
  }

  const getNodeColor = (type: GraphNode['type']) => {
    switch (type) {
      case 'study':
        return { bg: '#0369a1', border: '#38bdf8', text: '#e0f2fe' }
      case 'run':
        return { bg: '#4338ca', border: '#818cf8', text: '#e0e7ff' }
      case 'review':
        return { bg: '#b45309', border: '#fbbf24', text: '#fef3c7' }
      case 'experiment':
        return { bg: '#047857', border: '#34d399', text: '#d1fae5' }
      case 'report':
        return { bg: '#9333ea', border: '#c084fc', text: '#f3e8ff' }
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-ink text-slate-200">
      {/* Top Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-edge/80 bg-panel px-4 py-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold text-slate-100">NeuroScope Research Graph</h1>
            <span className="rounded bg-sky-500/10 px-1.5 py-0.5 font-mono text-[9.5px] text-sky-300 border border-sky-500/20">
              Interactive Provenance DAG
            </span>
          </div>
          <p className="text-[10.5px] text-slate-400">
            Navigable map tracing studies → model runs → clinical reviews → cohort experiments → reports.
          </p>
        </div>

        <button
          onClick={() => navigateToNode(selectedNode)}
          className="rounded border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-[11px] font-medium text-sky-200 transition hover:bg-sky-500/20"
        >
          Open Selected {selectedNode.type.toUpperCase()} in Workspace →
        </button>
      </div>

      {/* Main Canvas + Right Metadata Drawer */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Interactive SVG Canvas */}
        <div className="relative flex-1 overflow-auto bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] p-8">
          <svg className="min-w-[1150px] min-h-[450px] w-full h-full">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
              </marker>
            </defs>

            {/* Connecting Edges */}
            {edges.map((edge) => {
              const src = nodes.find((n) => n.id === edge.from)!
              const dst = nodes.find((n) => n.id === edge.to)!
              return (
                <g key={`${edge.from}-${edge.to}`}>
                  <line
                    x1={src.x + 90}
                    y1={src.y + 25}
                    x2={dst.x + 90}
                    y2={dst.y + 25}
                    stroke="#334155"
                    strokeWidth="1.8"
                    markerEnd="url(#arrow)"
                  />
                  {edge.label && (
                    <text
                      x={(src.x + dst.x) / 2 + 90}
                      y={(src.y + dst.y) / 2 + 18}
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id
              const colors = getNodeColor(node.type)
              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className="cursor-pointer transition-transform hover:scale-105"
                  transform={`translate(${node.x}, ${node.y})`}
                >
                  <rect
                    width="180"
                    height="50"
                    rx="8"
                    fill="#0f172a"
                    stroke={isSelected ? colors.border : '#334155'}
                    strokeWidth={isSelected ? 2.5 : 1}
                  />
                  <rect
                    x="4"
                    y="4"
                    width="6"
                    height="42"
                    rx="3"
                    fill={colors.bg}
                  />
                  <text x="16" y="20" fill={colors.text} fontSize="10.5" fontWeight="600">
                    {node.label.length > 22 ? `${node.label.slice(0, 20)}…` : node.label}
                  </text>
                  <text x="16" y="36" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                    {node.subtitle.length > 24 ? `${node.subtitle.slice(0, 22)}…` : node.subtitle}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Selected Node Details Drawer */}
        <div className="flex w-80 shrink-0 flex-col border-l border-edge bg-panel/90 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-edge/80 pb-2">
            <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
              Entity Inspector
            </span>
            <span className="rounded bg-sky-500/10 px-2 py-0.5 font-mono text-[9px] text-sky-300 uppercase">
              {selectedNode.type}
            </span>
          </div>

          <div>
            <h2 className="text-[13px] font-bold text-slate-100">{selectedNode.label}</h2>
            <p className="mt-0.5 text-[10.5px] text-slate-400">{selectedNode.subtitle}</p>
          </div>

          <div className="space-y-2 border-t border-edge/60 pt-3">
            <span className="font-mono text-[10px] text-slate-400 uppercase">Metadata Attributes</span>
            <div className="space-y-1.5 font-mono text-[10.5px]">
              {Object.entries(selectedNode.metadata).map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-edge/30 pb-1">
                  <span className="text-slate-500">{k}:</span>
                  <span className="text-slate-200">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto border-t border-edge/80 pt-3 space-y-2">
            <button
              onClick={() => navigateToNode(selectedNode)}
              className="w-full rounded border border-sky-500/50 bg-sky-500/10 py-1.5 font-mono text-[11px] font-medium text-sky-200 hover:bg-sky-500/20"
            >
              Open in {selectedNode.targetWorkspace.toUpperCase()} Workspace
            </button>
            <p className="text-[9.5px] text-slate-500 text-center font-sans">
              Clicking navigates with active study context preserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
