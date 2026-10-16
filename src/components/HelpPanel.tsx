import { useStore } from '../state/store'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-[11.5px] font-semibold uppercase tracking-wide text-sky-400/80">{title}</h3>
      <div className="space-y-1.5 text-[11.5px] leading-relaxed text-slate-300">{children}</div>
    </section>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-edge bg-panel-2 px-1.5 py-[1px] font-mono text-[10px] text-slate-300">
      {children}
    </span>
  )
}

export default function HelpPanel() {
  const open = useStore((s) => s.helpOpen)
  const setOpen = useStore((s) => s.setHelpOpen)
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border border-edge bg-panel p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13.5px] font-semibold text-slate-100">Help &amp; about</h2>
          <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-200">✕</button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
          <Section title="What this is">
            <p>
              A 3D tumour viewer alone isn't new — a viewer that also tells you <em>whether to trust</em> what
              it's showing is. NeuroScope 3D takes four MRI sequences, segments the suspected tumour with a real,
              checkpoint-verified MONAI model, and shows the 3D mesh, the linked 2D slices, the measured volume,
              and the model's own measured confidence — together, in one screen.
            </p>
            <p className="font-mono text-[10px] text-slate-500">
              Research and teaching prototype only. Suspected tumour regions predicted by the model. Estimated
              volumes only. Never a diagnosis, never a substitute for a radiologist.
            </p>
          </Section>

          <Section title="Where the model's score and accuracy are shown">
            <p>
              <strong className="text-slate-200">Dice / sensitivity</strong> — bottom metrics bar, "Accuracy vs
              expert mask" card. Only appears when an expert (ground-truth) mask is available: always for the
              demo phantom and synthetic samples, and for a live upload only if you attach an optional expert mask.
            </p>
            <p>
              <strong className="text-slate-200">Model confidence (flip-TTA σ)</strong> — a mean and
              boundary-max figure under each region card, and as a toggleable heat-map overlay (the confidence
              icon in the slice-view toolbar). This measures the model's disagreement with itself across two
              passes — <em>not</em> a calibrated probability of correctness.
            </p>
            <p>
              <strong className="text-slate-200">Shape measurements</strong> — maximum 3D diameter and boundary
              surface area sit under each region's volume. Both name their own definition on hover, because
              "diameter" and "surface area" each have several and the gap between them is wider than the
              measurement error.
            </p>
            <p>
              <strong className="text-slate-200">Full provenance</strong> — "Download report" in the top bar
              (live studies only) opens a printable report with checkpoint hash, input file hashes, code commit,
              every validation warning, and the complete metrics block.
            </p>
            <p className="text-slate-500">
              Measured so far: mean Dice 0.901 / 0.899 / 0.850 (WT / TC / ET) over four real Medical Segmentation
              Decathlon cases. Four cases is a sample, not a cohort — the problem statement asks for ten held-out
              cases, and overlap with the checkpoint's own BraTS-2018 training set can't be ruled out from its
              public release. Treat it as evidence the pipeline works end to end on real data, not as a clinical
              benchmark.
            </p>
          </Section>

          <Section title="Reading the regions">
            <p><strong className="text-slate-200">WT</strong> (Whole Tumour) — the full abnormal signal, including swelling.</p>
            <p><strong className="text-slate-200">TC</strong> (Tumour Core) — the solid mass, excluding oedema.</p>
            <p><strong className="text-slate-200">ET</strong> (Enhancing Tumour) — the actively growing, contrast-enhancing component.</p>
            <p>They nest: ET ⊆ TC ⊆ WT. Click a region card in the metrics bar to isolate it — the camera flies
              to it and the other shells drop to a wireframe lattice so nothing hides it.</p>
          </Section>

          <Section title="Workspace controls">
            <p><strong className="text-slate-200">3D view (left)</strong> — drag to orbit, scroll to zoom. Per-region visibility and
              opacity sliders; a lattice toggle for the outer brain shell so it gives spatial context without
              hiding anything inside it.</p>
            <p><strong className="text-slate-200">Slice views (right)</strong> — click anywhere on any of the four panels, including
              the 3D mesh, to move one shared crosshair everywhere at once. The position is shown as both a voxel
              index and a physical world-mm coordinate.</p>
            <p><strong className="text-slate-200">Measure</strong> — click two points on any one view for a
              straight-line distance in millimetres, computed from that scan's own voxel spacing. Press
              <Kbd>Esc</Kbd> to clear.</p>
            <p><strong className="text-slate-200">Window / contrast</strong> — drag on any view: up and down
              moves the window centre, left and right changes its width. This is a display setting; it never
              touches the prediction or any measurement.</p>
            <p><strong className="text-slate-200">Agreement</strong> — when an expert mask exists, colour every
              voxel by whether the two masks agree: green where both say tumour, amber where only the model
              does, red where only the expert does. "Largest miss → go" in the metrics bar flies the crosshair
              straight to the biggest thing the model left out.</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>the fourth panel compares an alternate sequence side-by-side without losing the shared crosshair</li>
              <li>clicking a region card isolates that region in 3D and drops the rest to wireframe</li>
            </ul>
          </Section>

          <Section title="Keyboard">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <p><Kbd>C</Kbd> crosshair tool</p>
              <p><Kbd>M</Kbd> measure tool</p>
              <p><Kbd>W</Kbd> window / contrast</p>
              <p><Kbd>O</Kbd> overlay on / off</p>
              <p><Kbd>E</Kbd> model ↔ expert mask</p>
              <p><Kbd>U</Kbd> uncertainty heat-map</p>
              <p><Kbd>A</Kbd> agreement overlay</p>
              <p><Kbd>B</Kbd> brain shell on / off</p>
              <p><Kbd>?</Kbd> this panel</p>
              <p><Kbd>Esc</Kbd> back to crosshair</p>
            </div>
          </Section>

          <Section title="Running a case">
            <p><strong className="text-slate-200">Upload case</strong> — drop in your own four NIfTI sequences
              (T1, T1Gd, T2, FLAIR) plus an optional expert mask, and watch the real pipeline stages run live.</p>
            <p><strong className="text-slate-200">Datasets</strong> — curated cases already staged on the
              server: synthetic phantoms with deliberately different tumour geometry (one mass vs. two, compact
              vs. diffuse) and, when fetched, a small number of real Decathlon cases — all one click, no file
              picker needed.</p>
          </Section>

          <Section title="Scope">
            <p>In scope: tumour region segmentation, volumetric measurement, model-confidence estimation, expert-mask
              comparison. Out of scope, by design: diagnosis, grading, genetic prediction, prognosis, treatment
              advice, surgical/radiotherapy planning, or any claim of clinical validation.</p>
          </Section>
        </div>
      </div>
    </div>
  )
}
