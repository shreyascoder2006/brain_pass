import { useLiveStudy } from '../../state/liveStudy'
import { COHORT_DATA, useWorkspaceStore } from '../../state/workspaceStore'

export default function CommandCentreWorkspace() {
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)
  const setSelectedStudyId = useWorkspaceStore((s) => s.setSelectedStudyId)
  const reviews = useWorkspaceStore((s) => s.reviews)
  const { runSample, reset } = useLiveStudy()

  const flaggedCases = COHORT_DATA.filter((c) => {
    const rev = reviews[c.caseId.toLowerCase()]
    return rev ? rev.disposition === 'flagged' : c.disposition === 'flagged'
  })

  const openStudy = (caseId: string, targetWorkspace: 'viewer' | 'review' | 'trust') => {
    setSelectedStudyId(caseId)
    setActiveWorkspace(targetWorkspace)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 space-y-4 bg-ink text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 rounded-lg border border-edge bg-panel/70 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-semibold text-slate-100">Research Command Centre</h1>
            <span className="rounded bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-sky-300 border border-sky-500/20">
              Active Session
            </span>
          </div>
          <p className="mt-1 text-[11.5px] text-slate-400">
            NeuroScope 3D Clinical & Translational Research Studio · Multi-Workspace Workflow Engine
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              reset()
              openStudy('demo_phantom', 'viewer')
            }}
            className="rounded border border-edge bg-panel-2 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            Reset to Demo Phantom
          </button>
          <button
            onClick={() => setActiveWorkspace('viewer')}
            className="flex items-center gap-1.5 rounded border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-[11px] font-medium text-sky-200 transition hover:bg-sky-500/20"
          >
            Launch 3D Studio →
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Model Card */}
        <div className="rounded-lg border border-edge bg-panel-2/50 p-3.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Primary Model</span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] text-emerald-300">
              SHA-256 Pinned
            </span>
          </div>
          <div className="mt-1.5 text-[15px] font-semibold text-slate-100">MONAI SegResNet</div>
          <div className="mt-1 text-[10.5px] font-mono text-slate-400">
            brats_mri_segmentation · BraTS-18
          </div>
          <div className="mt-3 border-t border-edge/60 pt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>2-pass Flip TTA</span>
            <span className="text-slate-300">Deterministic σ</span>
          </div>
        </div>

        {/* Real Data Dice */}
        <div className="rounded-lg border border-edge bg-panel-2/50 p-3.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Decathlon Benchmark</span>
            <span className="font-mono text-[9px] text-sky-400">10 Held-out/Eval</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[17px] font-bold text-sky-300 font-mono">0.901</span>
            <span className="text-[11px] text-slate-400">Mean WT Dice</span>
          </div>
          <div className="mt-1 text-[10.5px] font-mono text-slate-400">
            TC: 0.899 · ET: 0.850 · HD95: 3.1mm
          </div>
          <div className="mt-3 border-t border-edge/60 pt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Task01_BrainTumour</span>
            <span className="text-emerald-400">Real Scans</span>
          </div>
        </div>

        {/* Verification Matrix */}
        <div className="rounded-lg border border-edge bg-panel-2/50 p-3.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Judges' Verification</span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] text-emerald-300">
              Verified
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[17px] font-bold text-emerald-400 font-mono">17 / 17</span>
            <span className="text-[11px] text-slate-400">Pipeline Tests</span>
          </div>
          <div className="mt-1 text-[10.5px] text-slate-400">
            Failure pack, calibration, affine L/R
          </div>
          <div className="mt-3 border-t border-edge/60 pt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Cube 16.0 mL exact</span>
            <span className="text-slate-300">PASS</span>
          </div>
        </div>

        {/* Outstanding QC */}
        <div className="rounded-lg border border-edge bg-panel-2/50 p-3.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Quality Reviews</span>
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] text-amber-300">
              Active QC
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[17px] font-bold text-amber-300 font-mono">{flaggedCases.length}</span>
            <span className="text-[11px] text-slate-400">Flagged for Audit</span>
          </div>
          <div className="mt-1 text-[10.5px] text-slate-400">
            Boundary disagreement clusters
          </div>
          <div className="mt-3 border-t border-edge/60 pt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Audit Trail Enabled</span>
            <button
              onClick={() => setActiveWorkspace('review')}
              className="text-amber-400 hover:underline"
            >
              Resolve QC →
            </button>
          </div>
        </div>
      </div>

      {/* Main Split: Cohort Casebook + Flagged Tasks */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Casebook Table (2 Cols) */}
        <div className="rounded-lg border border-edge bg-panel/60 p-4 lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[13.5px] font-semibold text-slate-100">Study Cohort & Casebook</h2>
              <p className="text-[10.5px] text-slate-500">
                De-identified research MRI scans with verified model segmentation and ground truth
              </p>
            </div>
            <button
              onClick={() => setActiveWorkspace('research')}
              className="font-mono text-[10.5px] text-sky-400 hover:text-sky-300 hover:underline"
            >
              Open Cohort Lab →
            </button>
          </div>

          <div className="overflow-x-auto rounded border border-edge/80">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-panel-2/90 font-mono text-[10px] text-slate-400 uppercase border-b border-edge">
                <tr>
                  <th className="px-3 py-2">Case Identifier</th>
                  <th className="px-3 py-2">Split</th>
                  <th className="px-3 py-2">WT Dice</th>
                  <th className="px-3 py-2">TC Dice</th>
                  <th className="px-3 py-2">ET Dice</th>
                  <th className="px-3 py-2">HD95</th>
                  <th className="px-3 py-2">QC Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/50 font-mono">
                {COHORT_DATA.slice(0, 8).map((item) => {
                  const rev = reviews[item.caseId.toLowerCase()]
                  const disposition = rev ? rev.disposition : item.disposition
                  return (
                    <tr key={item.caseId} className="hover:bg-panel-2/30 transition-colors">
                      <td className="px-3 py-2 font-semibold text-slate-200">
                        {item.caseId}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] ${
                            item.split === 'held_out'
                              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                              : item.split === 'train'
                              ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                              : 'bg-slate-500/10 text-slate-400 border border-edge'
                          }`}
                        >
                          {item.split}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sky-300">{item.wtDice.toFixed(3)}</td>
                      <td className="px-3 py-2 text-indigo-300">{item.tcDice.toFixed(3)}</td>
                      <td className="px-3 py-2 text-amber-300">{item.etDice.toFixed(3)}</td>
                      <td className="px-3 py-2 text-slate-400">{item.hd95Mm.toFixed(1)} mm</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-sans font-medium ${
                            disposition === 'accepted'
                              ? 'bg-emerald-500/10 text-emerald-300'
                              : disposition === 'flagged'
                              ? 'bg-amber-500/10 text-amber-300'
                              : 'bg-slate-500/10 text-slate-400'
                          }`}
                        >
                          {disposition}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              const sampleId = item.caseId.toLowerCase()
                              if (sampleId.startsWith('brats') || sampleId.startsWith('demo')) {
                                runSample(sampleId)
                              }
                              openStudy(sampleId, 'viewer')
                            }}
                            className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[9.5px] font-sans text-sky-300 hover:bg-sky-500/20"
                            title="Open in 3D & MPR Studio"
                          >
                            Studio
                          </button>
                          <button
                            onClick={() => openStudy(item.caseId.toLowerCase(), 'review')}
                            className="rounded border border-edge bg-panel-2 px-2 py-0.5 text-[9.5px] font-sans text-slate-300 hover:text-slate-100"
                            title="Inspect in Segmentation Review"
                          >
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Flagged Review Tasks (1 Col) */}
        <div className="rounded-lg border border-edge bg-panel/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[13.5px] font-semibold text-slate-100">Flagged Review Tasks</h2>
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] text-amber-300">
              Action Required
            </span>
          </div>
          <p className="text-[10.5px] text-slate-500">
            Cases flagged due to boundary discrepancy or high uncertainty regions requiring second-reader sign-off.
          </p>

          <div className="space-y-2.5">
            {flaggedCases.map((c) => {
              const rev = reviews[c.caseId.toLowerCase()]
              return (
                <div
                  key={c.caseId}
                  className="rounded-md border border-edge bg-panel-2/60 p-3 space-y-2 hover:border-slate-500/80 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-slate-200">
                      {c.caseId}
                    </span>
                    <span className="rounded bg-rose-500/10 px-1.5 py-0.5 font-mono text-[9px] text-rose-300">
                      HD95: {c.hd95Mm.toFixed(1)} mm
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                    {rev?.notes || c.notes || 'Elevated boundary discrepancy noted in enhancing core.'}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-edge/60">
                    <span className="font-mono text-[9px] text-slate-500">
                      Category: {rev?.errorCategory || 'infiltrative_boundary'}
                    </span>
                    <button
                      onClick={() => openStudy(c.caseId.toLowerCase(), 'review')}
                      className="rounded bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 font-mono text-[9.5px] text-sky-300 hover:bg-sky-500/20"
                    >
                      Audit Error →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Guided Tour / Teaching Callout */}
          <div className="rounded-md border border-sky-500/30 bg-sky-950/20 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-sky-300 text-[11px] font-medium">
              <span>★ NeuroLearn Curriculum Available</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              New to BraTS label definitions or MRI tissue contrast? Explore our 4 interactive guided labs.
            </p>
            <button
              onClick={() => setActiveWorkspace('learn')}
              className="mt-1 text-[10.5px] font-mono text-sky-400 hover:underline"
            >
              Start Guided Lab →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
