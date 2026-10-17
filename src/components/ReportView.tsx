import type { Findings } from '../lib/findings'
import { REGIONS } from '../lib/regions'
import type { StudyBundle } from '../state/study'

export interface ReportImages {
  three: string | null
  axial: string | null
  coronal: string | null
  sagittal: string | null
}

const DISCLAIMER =
  'Research and teaching prototype only. Never use model output as a diagnosis.'

function field(label: string, value: string) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</div>
      <div className="break-words text-[12.5px] text-slate-900">{value || '— not provided —'}</div>
    </div>
  )
}

function SlicePanel({ title, src, caption }: { title: string; src: string | null; caption: string }) {
  return (
    <div className="flex flex-col overflow-hidden rounded border border-slate-300">
      <div className="border-b border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
        {title}
      </div>
      <div className="flex aspect-square items-center justify-center bg-black">
        {src
          ? <img src={src} alt={title} className="h-full w-full object-contain" />
          : <span className="text-[10px] text-slate-500">Image unavailable</span>}
      </div>
      <div className="px-2 py-1 text-[9px] leading-snug text-slate-500">{caption}</div>
    </div>
  )
}

export default function ReportView({
  bundle, images, findings, reportId, generatedAt,
}: {
  bundle: StudyBundle
  images: ReportImages
  findings: Findings
  reportId: string
  generatedAt: string
}) {
  const { study, report, sha256, builtAt } = bundle
  const persona = study.persona

  return (
    <div className="mx-auto w-full max-w-[880px] bg-white font-sans text-slate-900 print:max-w-none">
      {/* Letterhead */}
      <div className="flex items-start justify-between gap-6 border-b-[3px] border-slate-900 pb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 to-indigo-800">
            <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2} className="h-6 w-6">
              <path d="M12 4a4 4 0 00-4 4 3 3 0 00-1 5.8V16a3 3 0 003 3h4a3 3 0 003-3v-2.2A3 3 0 0016 8a4 4 0 00-4-4z"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <div className="text-[22px] font-extrabold leading-none tracking-tight text-slate-900">
              NEUROSCOPE <span className="align-super text-[12px] font-bold text-sky-700">3D</span>
            </div>
            <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
              Neuro-Oncology Imaging — Automated Segmentation Report
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[11px] text-slate-600">Report ID: {reportId}</div>
          <div className="font-mono text-[11px] text-slate-600">Generated: {generatedAt}</div>
          <div className="mt-1 inline-block rounded border border-amber-600 bg-amber-50 px-2 py-[2px] text-[10px] font-bold uppercase tracking-wide text-amber-800">
            Preliminary · Research Use Only
          </div>
        </div>
      </div>

      <div className="mt-3 rounded border border-amber-500 bg-amber-50 px-3 py-2 text-center text-[11px] font-bold text-amber-900">
        DISCLAIMER: {DISCLAIMER}
      </div>

      {/* Patient / case info */}
      <section className="mt-4">
        <h2 className="border-b border-slate-300 pb-1 text-[12px] font-bold uppercase tracking-wide text-slate-700">
          Patient &amp; Case Information
        </h2>
        <p className="mt-1.5 text-[10px] italic text-rose-700">
          This case is a synthetic teaching persona generated for this prototype. It does not describe a real person.
        </p>
        <div className="mt-2 grid grid-cols-4 gap-x-4 gap-y-2.5">
          {field('Patient name', persona?.name ?? '')}
          {field('Patient ID / MRN', persona?.mrn ?? study.caseId)}
          {field('Age', persona ? `${persona.age}` : '')}
          {field('Sex', persona?.gender ?? '')}
          {field('Study date', generatedAt.slice(0, 10))}
          {field('Primary symptom', persona?.primarySymptom ?? '')}
          {field('Modality', 'MRI — T1, T1Gd, T2, FLAIR')}
          {field('Institution', 'NeuroScope Research Lab (demo)')}
        </div>
      </section>

      {/* Clinical vignette — explicitly teaching-authored, not model output */}
      {persona?.clinicalVignette && (
        <section className="mt-4 break-inside-avoid">
          <h2 className="border-b border-slate-300 pb-1 text-[12px] font-bold uppercase tracking-wide text-slate-700">
            Clinical Vignette <span className="font-normal normal-case text-slate-400">(teaching narrative)</span>
          </h2>
          <p className="mt-2 text-[12px] italic leading-relaxed text-slate-700">{persona.clinicalVignette}</p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
            {field('Authored anatomical location', persona.anatomicalLocation)}
            {field('Lesion type', persona.lesionType)}
            {field('WHO grade', persona.whoGrade)}
            {field('Reference whole-tumour volume', `${persona.estimatedVolumeMl.toFixed(1)} mL`)}
          </div>
          <p className="mt-2 text-[9.5px] text-slate-500">
            These fields are written by the teaching case's author to set clinical context. They are not
            derived from the scan and are not what the segmentation pipeline measured — see Automated
            Analysis below for that.
          </p>
        </section>
      )}

      {/* Automated findings */}
      <section className="mt-4 break-inside-avoid">
        <h2 className="border-b border-slate-300 pb-1 text-[12px] font-bold uppercase tracking-wide text-slate-700">
          Automated Analysis
        </h2>
        <p className="mt-2 text-[12px] leading-relaxed text-slate-800">{findings.summary}</p>
        {findings.hasLesion && <p className="mt-2 text-[12px] leading-relaxed text-slate-800">{findings.pattern}</p>}
        {findings.volumeAgreement && (
          <p className="mt-2 text-[11px] text-slate-600">{findings.volumeAgreement}</p>
        )}
        <p className="mt-2 text-[10px] italic text-slate-500">
          Automated, segmentation-derived description. Not a radiological or clinical interpretation,
          and not a diagnosis, grading, or treatment recommendation.
        </p>
      </section>

      {/* 3D render */}
      <section className="mt-4 break-inside-avoid">
        <h2 className="border-b border-slate-300 pb-1 text-[12px] font-bold uppercase tracking-wide text-slate-700">
          3D Digital Twin
        </h2>
        <div className="mt-2 overflow-hidden rounded border border-slate-300">
          <div className="flex items-center justify-center bg-[#05070d]" style={{ aspectRatio: '16/10' }}>
            {images.three
              ? <img src={images.three} alt="3D render" className="h-full w-full object-contain" />
              : <span className="text-[10px] text-slate-400">Render unavailable</span>}
          </div>
        </div>
        <div className="mt-1.5 flex gap-4 text-[10px] text-slate-600">
          {REGIONS.map((r) => (
            <span key={r.key} className="flex items-center gap-1">
              <i className="inline-block h-2 w-2 rounded-sm" style={{ background: r.colour }} />
              {r.label}
            </span>
          ))}
          <span>Surface: brain parenchyma</span>
        </div>
      </section>

      {/* Slices */}
      <section className="mt-4 break-inside-avoid">
        <h2 className="border-b border-slate-300 pb-1 text-[12px] font-bold uppercase tracking-wide text-slate-700">
          Representative Slices — centred on whole-tumour region
        </h2>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <SlicePanel
            title="Axial"
            src={images.axial}
            caption={`Z = ${findings.location.voxel[2].toFixed(0)} · world ${findings.location.worldMm[2].toFixed(1)} mm`}
          />
          <SlicePanel
            title="Coronal"
            src={images.coronal}
            caption={`Y = ${findings.location.voxel[1].toFixed(0)} · world ${findings.location.worldMm[1].toFixed(1)} mm`}
          />
          <SlicePanel
            title="Sagittal"
            src={images.sagittal}
            caption={`X = ${findings.location.voxel[0].toFixed(0)} · world ${findings.location.worldMm[0].toFixed(1)} mm`}
          />
        </div>
      </section>

      {/* Laterality cross-check */}
      {findings.hasLesion && persona && (
        <section className="mt-4 break-inside-avoid">
          <h2 className="border-b border-slate-300 pb-1 text-[12px] font-bold uppercase tracking-wide text-slate-700">
            Automated Laterality Check
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-4 text-[11px]">
            <div className="rounded border border-slate-300 p-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Authored location</div>
              <div className="mt-0.5 text-slate-900">{persona.anatomicalLocation}</div>
            </div>
            <div className="rounded border border-slate-300 p-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                Computed from mask centroid
              </div>
              <div className="mt-0.5 text-slate-900 capitalize">
                {findings.location.hemisphere}
                {findings.location.anteroposterior !== 'central' && `, ${findings.location.anteroposterior}`}
                {findings.location.superoinferior !== 'mid' && `, ${findings.location.superoinferior}`}
              </div>
            </div>
          </div>
          <p className="mt-1.5 text-[9.5px] text-slate-500">
            Computed independently from the segmentation mask's geometry, via the study affine — not read
            from the authored location string. Agreement here is a sanity check on the pipeline's
            orientation handling, not a clinical finding.
          </p>
        </section>
      )}

      {/* Volumetrics */}
      <section className="mt-4 break-inside-avoid">
        <h2 className="border-b border-slate-300 pb-1 text-[12px] font-bold uppercase tracking-wide text-slate-700">
          Volumetrics &amp; Accuracy
        </h2>
        <table className="mt-2 w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b-2 border-slate-800 text-left">
              <th className="py-1 pr-2 font-semibold">Region</th>
              <th className="py-1 pr-2 font-semibold">Predicted (mL)</th>
              <th className="py-1 pr-2 font-semibold">Expert (mL)</th>
              <th className="py-1 pr-2 font-semibold">Dice</th>
              <th className="py-1 pr-2 font-semibold">Sensitivity</th>
            </tr>
          </thead>
          <tbody>
            {REGIONS.map((def) => {
              const r = report[def.key]
              return (
                <tr key={def.key} className="border-b border-slate-200">
                  <td className="py-1.5 pr-2">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: def.colour }} />
                    {def.label}
                  </td>
                  <td className="py-1.5 pr-2 font-mono">{r.predML.toFixed(2)}</td>
                  <td className="py-1.5 pr-2 font-mono">{r.expertML.toFixed(2)}</td>
                  <td className="py-1.5 pr-2 font-mono">{r.metric.dice.toFixed(3)}</td>
                  <td className="py-1.5 pr-2 font-mono">{r.metric.sensitivity.toFixed(3)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="mt-1.5 text-[9.5px] text-slate-500">
          Volume = voxel count × (dx × dy × dz) / 1000, from the study's voxel spacing
          ({study.spacing.map((s) => s.toFixed(2)).join(' × ')} mm). Dice and sensitivity are computed
          against this persona's expert annotation.
        </p>
      </section>

      {/* Provenance */}
      <section className="mt-4 break-inside-avoid">
        <h2 className="border-b border-slate-300 pb-1 text-[12px] font-bold uppercase tracking-wide text-slate-700">
          Processing Provenance
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
          {field('Segmentation source', 'Deterministic synthetic demonstration case (persona-seeded phantom)')}
          {field('Reproducibility', 'Regenerating this persona always yields identical volumes and masks')}
          {field('Case / persona ID', study.caseId)}
          {field('Generator seed', persona ? String(persona.seed) : '')}
          {field('Grid', `${study.dims.join(' × ')} voxels, ${study.spacing.map((s) => s.toFixed(2)).join(' × ')} mm`)}
          {field('Volume digest (SHA-256)', sha256)}
          {field('Volumes built', new Date(builtAt).toLocaleString())}
          {field('Report generated', generatedAt)}
        </div>
      </section>

      {/* Limitations */}
      <section className="mt-4 break-inside-avoid">
        <h2 className="border-b border-slate-300 pb-1 text-[12px] font-bold uppercase tracking-wide text-slate-700">
          Limitations &amp; Disclosures
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] leading-relaxed text-slate-800">
          <li>Research and teaching prototype only. Not a medical device and not clinically validated.</li>
          <li>This case is a synthetic teaching persona, not a real patient scan.</li>
          <li>The clinical vignette, lesion type and WHO grade are author-written teaching context, not
            model output.</li>
          <li>Automated-analysis output has not been reviewed by a licensed radiologist.</li>
          <li>Volumes are computed geometrically from the segmentation mask and are not a substitute
            for expert measurement.</li>
          <li>Segmentation is not a diagnosis, grading, genetic prediction, prognosis, or treatment
            recommendation, and must not be used for surgical or radiotherapy planning.</li>
        </ul>
      </section>

      {/* Signature block */}
      <section className="mt-5 break-inside-avoid border-t border-slate-300 pt-3">
        <div className="grid grid-cols-2 gap-6 text-[11px]">
          <div>
            <div className="text-slate-500">Prepared by</div>
            <div className="font-medium text-slate-900">Automated pipeline — no human review</div>
          </div>
          <div>
            <div className="text-slate-500">Reviewed by</div>
            <div className="mt-3 border-b border-slate-400" />
            <div className="mt-1 text-[9.5px] text-slate-500">Signature · date</div>
          </div>
        </div>
      </section>

      <div className="no-print mt-4 border-t border-slate-200 pt-2 text-center text-[10px] text-slate-400">
        End of report
      </div>
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 hidden border-t border-slate-300 bg-white px-4 py-1.5 text-center text-[8.5px] text-slate-500 print:block">
        {DISCLAIMER} · NeuroScope 3D · Report {reportId}
      </div>
    </div>
  )
}
