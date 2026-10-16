import { useState } from 'react'
import { COHORT_DATA, useWorkspaceStore } from '../../state/workspaceStore'

export default function ResearchLabWorkspace() {
  const selectedCohort = useWorkspaceStore((s) => s.selectedCohort)
  const setSelectedCohort = useWorkspaceStore((s) => s.setSelectedCohort)
  const experimentTta = useWorkspaceStore((s) => s.experimentTta)
  const setExperimentTta = useWorkspaceStore((s) => s.setExperimentTta)
  const experimentThreshold = useWorkspaceStore((s) => s.experimentThreshold)
  const setExperimentThreshold = useWorkspaceStore((s) => s.setExperimentThreshold)

  const setSelectedStudyId = useWorkspaceStore((s) => s.setSelectedStudyId)
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)

  const [activeMetric, setActiveMetric] = useState<'dice' | 'hd95' | 'volume'>('dice')
  const [sortField, setSortField] = useState<'caseId' | 'wtDice' | 'hd95Mm'>('wtDice')
  const [sortAsc, setSortAsc] = useState(false)
  const [exportNotice, setExportNotice] = useState<string | null>(null)

  // Filter cohort
  const filteredCases = COHORT_DATA.filter((c) => {
    if (selectedCohort === 'held_out') return c.split === 'held_out'
    if (selectedCohort === 'synthetic') return c.split === 'synthetic'
    return true // 'all_decathlon' includes held_out and train
  })

  // Sort cohort
  const sortedCases = [...filteredCases].sort((a, b) => {
    let diff = 0
    if (sortField === 'caseId') diff = a.caseId.localeCompare(b.caseId)
    else if (sortField === 'wtDice') diff = a.wtDice - b.wtDice
    else if (sortField === 'hd95Mm') diff = a.hd95Mm - b.hd95Mm
    return sortAsc ? diff : -diff
  })

  // Calculate cohort aggregates
  const meanWt = filteredCases.reduce((acc, c) => acc + c.wtDice, 0) / (filteredCases.length || 1)
  const meanTc = filteredCases.reduce((acc, c) => acc + c.tcDice, 0) / (filteredCases.length || 1)
  const meanEt = filteredCases.reduce((acc, c) => acc + c.etDice, 0) / (filteredCases.length || 1)
  const meanHd95 = filteredCases.reduce((acc, c) => acc + c.hd95Mm, 0) / (filteredCases.length || 1)

  // Find lowest scoring outlier
  const outlierCase = [...filteredCases].sort((a, b) => a.wtDice - b.wtDice)[0]

  const handleExportJson = () => {
    const payload = {
      experimentId: `EXP-TTA-${Date.now()}`,
      dataset: selectedCohort,
      configuration: {
        model: 'MONAI SegResNet (brats_mri_segmentation v0.5.4)',
        tta_passes: experimentTta ? 2 : 1,
        threshold: experimentThreshold,
        disclaimer: 'Research and teaching prototype only.'
      },
      summary: {
        caseCount: filteredCases.length,
        meanWtDice: Number(meanWt.toFixed(4)),
        meanTcDice: Number(meanTc.toFixed(4)),
        meanEtDice: Number(meanEt.toFixed(4)),
        meanHd95Mm: Number(meanHd95.toFixed(2))
      },
      cases: sortedCases
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `neuroscope_experiment_${selectedCohort}.json`
    a.click()
    setExportNotice('Exported experiment manifest JSON')
    setTimeout(() => setExportNotice(null), 2500)
  }

  const handleExportCsv = () => {
    const header = 'CaseID,Split,WTDice,TCDice,ETDice,HD95_mm,VolumeErrorPct,Disposition\n'
    const rows = sortedCases
      .map(
        (c) =>
          `${c.caseId},${c.split},${c.wtDice.toFixed(4)},${c.tcDice.toFixed(4)},${c.etDice.toFixed(
            4
          )},${c.hd95Mm.toFixed(2)},${c.volumeErrorPct},${c.disposition}`
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cohort_metrics_${selectedCohort}.csv`
    a.click()
    setExportNotice('Exported cohort metrics CSV')
    setTimeout(() => setExportNotice(null), 2500)
  }

  const drilldown = (caseId: string) => {
    setSelectedStudyId(caseId.toLowerCase())
    setActiveWorkspace('review')
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 space-y-4 bg-ink text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 rounded-lg border border-edge bg-panel/70 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-semibold text-slate-100">Research & Cohort Benchmarking Lab</h1>
            <span className="rounded bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] font-medium text-sky-300 border border-sky-500/20">
              Multi-Case Environment
            </span>
          </div>
          <p className="mt-1 text-[11.5px] text-slate-400">
            Ask research questions across cohorts, evaluate TTA ensembles, inspect metric distributions, and isolate boundary outliers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {exportNotice && (
            <span className="font-mono text-[10px] text-emerald-400">{exportNotice}</span>
          )}
          <button
            onClick={handleExportCsv}
            className="rounded border border-edge bg-panel-2 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            Export CSV
          </button>
          <button
            onClick={handleExportJson}
            className="rounded border border-sky-500/50 bg-sky-500/10 px-3 py-1.5 text-[11px] font-medium text-sky-200 transition hover:bg-sky-500/20"
          >
            Export JSON Manifest
          </button>
        </div>
      </div>

      {/* Critical Scientific Safeguard Callout */}
      <div className="rounded-md border border-amber-500/30 bg-amber-950/20 px-3.5 py-2.5 flex items-start gap-3">
        <span className="text-amber-400 text-[13px] font-bold">⚠</span>
        <div className="text-[11px] text-slate-300 leading-relaxed">
          <strong className="text-amber-200">Methodological Guardrail:</strong> Held-out evaluation cases
          (Decathlon Task01 held-out split) must never be used to tune inference thresholds or select models.
          Development and evaluation workflows remain strictly decoupled to preserve unbiased test reporting.
        </div>
      </div>

      {/* Experiment Configuration & Aggregates */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Experiment Builder Parameters */}
        <div className="rounded-lg border border-edge bg-panel/60 p-4 space-y-3 lg:col-span-1">
          <h2 className="text-[13px] font-semibold text-slate-100">Experiment Configuration</h2>

          <div className="space-y-1">
            <label className="text-[10.5px] text-slate-400">Target Cohort Split:</label>
            <select
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value as any)}
              className="w-full rounded border border-edge bg-panel-2 px-2.5 py-1.5 text-[11px] text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              <option value="held_out">Held-Out Test Cases (Patient Split)</option>
              <option value="all_decathlon">Full Decathlon Benchmark (10 Cases)</option>
              <option value="synthetic">Synthetic Geometry Cases (3 Cases)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10.5px] text-slate-400">Test-Time Augmentation (TTA):</label>
            <div className="flex gap-2">
              <button
                onClick={() => setExperimentTta(true)}
                className={`flex-1 rounded border px-2 py-1 text-[10.5px] font-mono transition ${
                  experimentTta
                    ? 'border-sky-500 bg-sky-500/20 text-sky-200 font-bold'
                    : 'border-edge bg-panel-2 text-slate-400'
                }`}
              >
                2-Pass Flip
              </button>
              <button
                onClick={() => setExperimentTta(false)}
                className={`flex-1 rounded border px-2 py-1 text-[10.5px] font-mono transition ${
                  !experimentTta
                    ? 'border-sky-500 bg-sky-500/20 text-sky-200 font-bold'
                    : 'border-edge bg-panel-2 text-slate-400'
                }`}
              >
                Single Pass
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10.5px]">
              <span className="text-slate-400">Sigmoid Threshold:</span>
              <span className="font-mono text-sky-300">{experimentThreshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="0.7"
              step="0.05"
              value={experimentThreshold}
              onChange={(e) => setExperimentThreshold(parseFloat(e.target.value))}
              className="w-full accent-sky-400"
            />
          </div>

          <div className="pt-2 border-t border-edge/60 text-[10px] text-slate-500 font-mono space-y-1">
            <div>Architecture: SegResNet</div>
            <div>Weights: MONAI Model Zoo</div>
            <div>Cases Evaluated: {filteredCases.length}</div>
          </div>
        </div>

        {/* Aggregates Summary Cards (3 Cols) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-3">
          <div className="rounded-lg border border-edge bg-panel-2/50 p-3.5 space-y-1">
            <div className="text-[11px] text-slate-400">Mean Whole Tumor (WT)</div>
            <div className="text-[20px] font-bold font-mono text-sky-300">{meanWt.toFixed(4)}</div>
            <div className="text-[10px] text-slate-500">Includes necrotic + edema + enhancing</div>
            <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-sky-400 rounded-full" style={{ width: `${meanWt * 100}%` }} />
            </div>
          </div>

          <div className="rounded-lg border border-edge bg-panel-2/50 p-3.5 space-y-1">
            <div className="text-[11px] text-slate-400">Mean Tumor Core (TC)</div>
            <div className="text-[20px] font-bold font-mono text-indigo-300">{meanTc.toFixed(4)}</div>
            <div className="text-[10px] text-slate-500">Solid tumor without peripheral edema</div>
            <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${meanTc * 100}%` }} />
            </div>
          </div>

          <div className="rounded-lg border border-edge bg-panel-2/50 p-3.5 space-y-1">
            <div className="text-[11px] text-slate-400">Mean 95% Hausdorff Distance</div>
            <div className="text-[20px] font-bold font-mono text-amber-300">{meanHd95.toFixed(2)} mm</div>
            <div className="text-[10px] text-slate-500">Spatial boundary distance in mm</div>
            <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full"
                style={{ width: `${Math.min(100, (meanHd95 / 6) * 100)}%` }}
              />
            </div>
          </div>

          {/* Outlier Alert Card */}
          {outlierCase && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 sm:col-span-3 flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold text-rose-300 uppercase">
                  Identified Cohort Outlier: {outlierCase.caseId}
                </span>
                <p className="text-[10.5px] text-slate-300">
                  Lowest WT Dice score in cohort ({outlierCase.wtDice.toFixed(3)}) · HD95: {outlierCase.hd95Mm.toFixed(1)} mm.
                  {outlierCase.notes && ` Note: ${outlierCase.notes}`}
                </p>
              </div>
              <button
                onClick={() => drilldown(outlierCase.caseId)}
                className="rounded bg-rose-500/20 border border-rose-500/40 px-2.5 py-1 text-[10.5px] font-mono text-rose-200 hover:bg-rose-500/30"
              >
                Inspect Case in Review →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Case-by-Case Breakdown Table */}
      <div className="rounded-lg border border-edge bg-panel/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[13px] font-semibold text-slate-100">Case-by-Case Metric Distributions</h2>
            <p className="text-[10px] text-slate-500">Click column header to sort · Click case to drill into review</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-slate-400">Sort by:</span>
            <button
              onClick={() => {
                setSortField('wtDice')
                setSortAsc(!sortAsc)
              }}
              className={`rounded px-2 py-0.5 font-mono text-[10px] border ${
                sortField === 'wtDice' ? 'border-sky-500/50 bg-sky-500/10 text-sky-300' : 'border-edge bg-panel-2 text-slate-400'
              }`}
            >
              Dice {sortField === 'wtDice' && (sortAsc ? '▲' : '▼')}
            </button>
            <button
              onClick={() => {
                setSortField('hd95Mm')
                setSortAsc(!sortAsc)
              }}
              className={`rounded px-2 py-0.5 font-mono text-[10px] border ${
                sortField === 'hd95Mm' ? 'border-sky-500/50 bg-sky-500/10 text-sky-300' : 'border-edge bg-panel-2 text-slate-400'
              }`}
            >
              HD95 {sortField === 'hd95Mm' && (sortAsc ? '▲' : '▼')}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded border border-edge/80">
          <table className="w-full text-left text-[11px] font-mono">
            <thead className="bg-panel-2 text-[10px] text-slate-400 uppercase border-b border-edge">
              <tr>
                <th className="px-3 py-2">Case ID</th>
                <th className="px-3 py-2">Cohort Split</th>
                <th className="px-3 py-2">WT Dice</th>
                <th className="px-3 py-2">TC Dice</th>
                <th className="px-3 py-2">ET Dice</th>
                <th className="px-3 py-2">HD95 (mm)</th>
                <th className="px-3 py-2">Vol Error %</th>
                <th className="px-3 py-2">QC Disposition</th>
                <th className="px-3 py-2 text-right">Drilldown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge/50">
              {sortedCases.map((c) => (
                <tr key={c.caseId} className="hover:bg-panel-2/30 transition-colors">
                  <td className="px-3 py-2 font-bold text-slate-200">{c.caseId}</td>
                  <td className="px-3 py-2 text-slate-400">{c.split}</td>
                  <td className="px-3 py-2 text-sky-300">{c.wtDice.toFixed(4)}</td>
                  <td className="px-3 py-2 text-indigo-300">{c.tcDice.toFixed(4)}</td>
                  <td className="px-3 py-2 text-amber-300">{c.etDice.toFixed(4)}</td>
                  <td className="px-3 py-2 text-slate-300">{c.hd95Mm.toFixed(2)}</td>
                  <td className="px-3 py-2 text-slate-400">{c.volumeErrorPct.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-sans">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                        c.disposition === 'accepted'
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : 'bg-amber-500/10 text-amber-300'
                      }`}
                    >
                      {c.disposition}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => drilldown(c.caseId)}
                      className="rounded bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 text-sky-300 hover:bg-sky-500/20"
                    >
                      Audit →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
