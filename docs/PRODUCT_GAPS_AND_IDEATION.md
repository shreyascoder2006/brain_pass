# Product gaps and ideation

This builds on `docs/BACKEND_ROADMAP.md`, the competitive landscape research
in `reports/`, and the gap analysis in "What doctors and radiology trainees
see today" (supplied separately). That document's framing is the most
precise statement of the problem we have, and it reframes what we're
actually building — not "the first tool to show a tumour in 3D" (3D Slicer
and others already do that), but **the first lightweight tool that connects
3D exploration to reproducible measurement and explicit evidence about
whether the AI prediction can be trusted.** Everything below is organised
around that reframing.

## The three-layer gap, and where this project sits today

The source document separates three things the PS deliberately bundles
together:

| Layer | What it is | Where this project stands |
|---|---|---|
| 1. Image interpretation | Navigate the scan, understand where the abnormal region is | **Done.** Linked axial/coronal/sagittal + 3D, shared crosshair, voxel+world coordinates. |
| 2. AI segmentation | Predict which voxels belong to WT/TC/ET | **Done and verified real** — real MONAI SegResNet checkpoint downloaded, hash-pinned, ~37s/case on CPU, real Dice 0.92–0.96 on a synthetic case, all 17 judge pipeline tests pass. |
| 3. Verification and trust | Explain size/location, measure agreement with expert labels, disclose limitations | **Partially done.** Volume math is shown with formula; Dice/sensitivity vs an uploaded expert mask is shown. What's *not* yet shown: voxel-level uncertainty, held-out accuracy against real BraTS data (not just our synthetic test case), and a few of the explicit fail-safe signals discussed below. |

The source document's own conclusion is the thesis for this whole roadmap:
position this as the Layer 3 tool, not a Layer 1 tool with a tumour overlay
bolted on. A tool that only does Layers 1–2 is replicating 3D Slicer with
worse software maturity; a tool that does all three, cheaply, live, in a
browser, is the thing nothing in the landscape research found.

## Gaps, specifically, from a "does this solve the actual problem" lens

These are gaps the PS test matrix doesn't directly score but the source
document's framing makes clearly necessary for the tool to be *useful*, not
just *compliant*:

1. **A plausible-looking mask is not evidence of accuracy** — the document's
   sharpest point. Today, if no expert mask is uploaded (the common case —
   a real user doesn't have one), the UI shows volumes with no accuracy
   signal at all next to them. That's exactly the "two-dimensional cross-
   section of a three-dimensional prediction" trust gap the document
   describes, just at the whole-study level instead of the per-slice level.
   **This is the single highest-value gap to close**, and it's what Phase 3
   of the backend roadmap (uncertainty) exists to fix — a confidence signal
   that doesn't depend on having ground truth.

2. **"Whether the model has missed tissue on slices you haven't inspected"**
   — the document names this directly as unresolved by a 2D overlay. The 3D
   mesh view already answers this better than any 2D-only tool, but there's
   no *summary* signal for it yet (e.g., "WT is one connected region" vs
   "WT is three disconnected fragments, inspect each" — a cheap connected-
   components check, not a new model).

3. **Evaluation is currently self-referential.** Dice/sensitivity only
   appear when the *user's own* expert mask is uploaded. The PS requires
   accuracy on ≥10 *held-out* cases the team evaluated separately — that
   number needs to live somewhere in the product (the report, a static
   "model card" panel), not only in a CLI output judges never see unless
   they ask.

4. **No anatomical localisation.** The document's story opens with "which
   side is it on" as one of the three questions a trainee has to answer
   manually. Side (L/R) is already visible from the crosshair and mesh, but
   there's no equivalent for *which lobe* / proximity to major structures —
   a cheap, defensible addition (see "atlas-relative localisation" below),
   distinct from diagnosis.

## Making the backend genuinely demo-proof

This was the most concrete ask this round, so it's already implemented,
not just planned:

- **Real model, not just the pipeline smoke test.** `setup_model.py` now
  downloads and sha256-pins the actual MONAI `brats_mri_segmentation`
  checkpoint (18.8 MB, Apache-2.0). Measured on this machine, CPU-only:
  **~37 seconds per case**, comfortably inside the PS's 2-minute T4 budget
  even without a GPU. Real Dice on a synthetic test case: WT 0.960, TC
  0.920, ET 0.953. All 17 judge pipeline tests pass with the real model.
- **Live stage progress, not a silent spinner.** The backend now reports
  pipeline stage transitions (`validating → resampling → segmenting →
  measuring → meshing → reporting → done`) through a pollable
  `/api/jobs/{id}/status` endpoint, and the upload panel shows them live
  with a stage bar. During a demo, the judges watch it actually move through
  "Running 3D segmentation — this is the slow step…" for the ~30 seconds
  that take real work, rather than staring at an ambiguous spinner that
  could be doing nothing. This is a presentation-reliability feature as much
  as a UX one: a visible multi-second pipeline reads as "doing real
  compute," which is the honest and the persuasive framing at once.
- **Still open before a live slot**: the two things in Phase 1 of the
  backend roadmap that need a GPU or real patient-adjacent data to close —
  an actual T4 timing run, and real accuracy on ≥10 held-out BraTS cases
  (today's 0.92–0.96 Dice is on our own synthetic calibration case, not
  real tumour data, and must not be presented as if it were).

## Ideation: extra input for a cleaner output

In rough order of value-per-effort:

- **A seed point / region-of-interest click.** Instead of only an optional
  *expert mask*, let the user click a point in the MPR view before running
  inference ("the tumour is roughly here"). This doesn't need a new model —
  it can crop the inference ROI around the click, which both speeds up
  inference and reduces false positives elsewhere in the volume on noisy or
  atypical inputs. This is a genuinely useful "extra input for cleaner
  output" feature and is a few hours of work (a click handler + an ROI crop
  in `neuroscope.infer`), not a new model to train.
- **Patient age, as metadata only.** BraTS-trained models are adult-glioma
  specific; nothing in the pipeline today warns if a paediatric or clearly
  atypical-age scan is uploaded. A single optional age field lets the
  report add a specific, honest limitation note ("this model was trained
  and validated on adult glioma cases only") instead of a generic
  disclaimer — small effort, real trust value, zero clinical-claim risk.
  Must stay metadata-only: it must never influence the segmentation itself
  without evidence that doing so is valid.
  **Second, prior-scan upload** (same patient, different date) is already
  PS extra credit (longitudinal comparison) and is the natural second
  "extra input" — reuses the whole pipeline per-scan, then diffs volumes.
- **Scanner field strength / sequence TR-TE, read from the NIfTI/DICOM
  header rather than asked as a new input** — already available for free in
  most real files; surfacing it in the provenance report (not using it in
  the model) costs nothing and adds a real data-quality signal a radiologist
  would actually look for.

## Ideation: "what else solves the actual problem" (beyond extra credit)

- **Atlas-relative localisation, not diagnosis.** Register the predicted WT
  mask against a public, non-clinical brain atlas (e.g. a coarse
  lobe/hemisphere parcellation shipped with a library like `nilearn` or a
  bundled MNI-space atlas) and report something like *"predicted WT overlaps
  the right temporal lobe (62%) and right parietal lobe (14%)"*. This
  directly answers "which side is it on" and "where, anatomically" — the
  document's own framing of what trainees struggle with — without making
  any claim about what the tumour *is* or what to *do about it*. This is
  squarely inside Layer 1/2 (location, not interpretation) and costs one
  registration step plus a lookup table.
- **Connected-component summary**, from the gap list above: "WT is 1
  connected region" vs "WT is 3 regions, largest is 91% of total volume" —
  directly answers the document's "is it one mass or two?" question, which
  the PS's own story opens with, and is a few lines of `scipy.ndimage.label`
  on top of infrastructure that already exists.
- **A genuinely useful provenance/report page as the product's actual
  differentiator**, per the document's "measuring vs validating" distinction
  — this is already Phase 3 of the backend roadmap (uncertainty + HD95 +
  agreement maps + "second reader" framing) and doesn't need new ideation
  here; the gap analysis above just confirms it's the right priority, not a
  nice-to-have.

## On "a rough diagnosis suggesting what to do"

This needs to be said plainly rather than quietly built around: **the PS
explicitly forbids this**, and it isn't a grey area.

> *Out of scope: diagnosis, grading, genetic prediction, prognosis or
> treatment advice...* and *Wording: say "suspected tumour region predicted
> by the model" and "estimated volume". Never say "tumour detected",
> "diagnostic system" or "replaces the radiologist".*

A "rough diagnosis" or "suggested next step" feature — even hedged,
even labelled "not medical advice" — is very likely to read as exactly the
prohibited behaviour to a judge scoring against that rubric, and the
downside (disqualification or a hard credibility hit on the one axis this
competition cares about most) outsizes any upside. I'd recommend not
building this, and I haven't.

What the same underlying impulse — "give the user something actionable,
not just a number" — can become *without* crossing that line:

- **"Suggested review priority," framed as a research-workflow action, not
  a clinical one**: e.g. "ET volume exceeds the WT:ET ratio seen in typical
  cases in this dev set — flag for expert review" is a statement about the
  *model's own output relative to its training distribution*, not about the
  patient. This is defensible as the "second reader" framing the trust
  research recommends, as long as it's phrased as "review this model
  output," never "this indicates."
- **Explicit model-confidence routing**: "this case's prediction falls
  outside the uncertainty range seen on held-out validation cases — treat
  this result with lower confidence than the reported Dice would suggest."
  This is the uncertainty/OOD work from Phase 3 of the backend roadmap,
  stated as an action about *trusting the tool*, not about the patient's
  condition — which is the distinction the PS is actually drawing.

Both of those produce the feeling of "the tool told me what to do," the
thing I think the original ask was really reaching for, while staying
entirely on the Layer 3 (verification) side of the line the PS draws, never
the Layer 1/2 (clinical interpretation) side.
