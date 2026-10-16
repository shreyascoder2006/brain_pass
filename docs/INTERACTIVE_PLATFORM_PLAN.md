# Interactive Platform Plan

The workstream that turns NeuroScope 3D from "a viewer that displays the trust
layer" into "a tool you can interrogate it with". Companion to
[`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md), which owns data and model
work; this one owns the product surface.

Written mid-build, so it records what already landed as precisely as what
hasn't — the most expensive mistake on resuming is re-doing finished work.

---

## 0. Landed and verified

Everything in this section is committed, type-checks clean, and was exercised
either in a browser or by a test with a known answer. Do not rebuild it.

### Real data — the headline change

The platform has measured accuracy on **real tumour data** for the first time.
Previously every Dice figure came from this project's own synthetic phantom.

| Region | Mean Dice | Mean sensitivity |
|---|---|---|
| WT | **0.9013** | 0.8677 |
| TC | **0.8989** | 0.8882 |
| ET | **0.8503** | 0.8207 |

Four real Medical Segmentation Decathlon cases (`BRATS_206`, `BRATS_306`,
`BRATS_449`, `BRATS_457`), real MONAI SegResNet checkpoint, reproducible:

```bash
cd backend
python evaluate.py --root data/decathlon --limit 4 --out data/real_sample_eval.json --model bundle
```

Full per-case output is committed at `backend/data/real_sample_eval.json`.

**How the data got here without a 7.6 GB download.** `tools/fetch_decathlon_sample.py`
walks the official tar's table of contents using HTTP Range requests against its
512-byte member headers, then fetches only the selected cases' payloads —
**37.7 MB instead of 7.6 GB**. `tools/convert_decathlon.py` then splits the 4D
volumes per modality and remaps Decathlon's label codes to BraTS 1/2/4.

### Backend

- `neuroscope/regions.py` — `geometry()` / `geometry_all()`: max 3D diameter
  (exact, via convex hull), boundary surface area, centroid, bounding box.
  Each number ships its own definition string.
- `neuroscope/regions.py` — `agreement()` / `agreement_all()`: TP / FP / FN
  voxel counts per region plus the centre and volume of the largest
  false-negative blob.
- `server/main.py` — both are in the job metadata as `geometry` and `agreement`.
- 27 pytest tests pass, including hand-computed geometry answers (a 10-voxel
  cube's diagonal and 600 mm² surface, anisotropic spacing at 1000 mm²).

### Frontend

- **Measure tool** — click two points on a view for a distance in mm from that
  scan's own spacing. Was a dead `onClick={() => {}}` stub.
- **Window / contrast** — drag to re-window (up/down centre, left/right width).
  Also a dead stub before. Defaults reproduce the previous fixed ramp exactly,
  so opening it changes nothing until touched.
- **Agreement overlay** — green where model and expert agree, amber where only
  the model says tumour, red where only the expert does.
- **"Largest miss → go"** in the metrics bar flies the crosshair to the biggest
  thing the model left out and switches to the agreement overlay.
- **Quality Check Centre** — the single PASS badge became a floating, itemized
  7-check report derived from real validator findings (a popover, so the 3D
  view never gets squeezed).
- **Shape measurements** — max diameter and surface area under each region's
  volume, each naming its definition on hover.
- **Keyboard shortcuts** — C/M/W/O/E/U/A/B/? and Esc, suppressed while a field
  has focus (`lib/useShortcuts.ts`).
- Help panel documents all of the above; its previous "these are stubs" note is
  gone because it is no longer true.

---

## 1. Next up, in order

### 1a. Finish the documentation sweep — *start here, it's the cheapest win*

The real numbers above exist in the repo but the docs still say the only
accuracy figures are synthetic. Until that's fixed the project under-claims
what it has actually proven.

- `docs/VERIFICATION.md` — add a real-data section with the table above and the
  reproduce command. Keep the existing synthetic calibration results; they test
  a different thing (pipeline integrity, not accuracy).
- `docs/MODEL_CARD.md` — replace "no real evaluation exists" with the measured
  figures plus the two caveats that must travel with them: four cases is a
  sample, not the ten held-out cases the PS asks for, and overlap with the
  checkpoint's BraTS-2018 training set cannot be ruled out from its public
  release.
- `README.md` — headline the real Dice numbers; add the new interactive
  features to the feature list; note the Range-request fetch trick, which is
  genuinely novel and worth showing off.
- `docs/FEATURES.md` — the six new interactive features.
- `CLAUDE.md` — update "current state" so the next session starts correctly.

### 1b. Close the one unmet mandatory requirement

The feature-plan audit found 13 of 14 mandatory DI-02 boxes already met. The
exception: **held-out Dice and sensitivity on at least 10 labelled cases.** We
have four.

Six more cases is one command, because the fetcher is case-selective:

```bash
cd backend
python tools/fetch_decathlon_sample.py --count 10 --out data/raw_sample \
  --index-cache data/raw_sample/index_cache.json   # cache makes the re-walk instant
python tools/convert_decathlon.py --root data/raw_sample/Task01_BrainTumour --out data
python evaluate.py --root data/decathlon --limit 10 --out data/real_sample_eval.json --model bundle
```

Budget ~90–110 s per case of CPU inference, so ~10 minutes of wall clock for
the new six. The index cache is already committed-adjacent on disk, so the slow
part (walking 796 tar headers) does not repeat.

### 1c. Wire the staged real cases into the Datasets panel properly

Four real cases are staged in `backend/samples/` and listed in its manifest,
but they have only been run through the pipeline once, by hand, via TestClient.
Run each one through the live server and confirm the Datasets panel renders
them, including the new geometry and agreement fields.

### 1d. Verify the new UI against a live backend

Everything in section 0 was verified against the procedural demo phantom, which
has no `geometry` or `agreement` metadata. The code paths that read those
fields are typed and guarded but have not been seen rendering real values.
Start the backend, run a real sample case, and confirm:

- region cards show max diameter and surface area
- "largest miss → go" appears and navigates correctly
- the Quality Centre reflects that study's real warnings

Note: ports 5173 and 8008 were held by an older orphaned session during this
build; a spare port (5174) was used instead. Check for stale listeners first.

---

## 2. Designed but not built

From the feature plan and the reference images, in rough value order. Nothing
here is started.

| Feature | What it adds | Notes |
|---|---|---|
| **Pre-inference preview** | Show all four scans, dimensions and orientation before committing to a ~70 s run | Pairs with the filename auto-routing already shipped: auto-sort → preview → confirm |
| **Interactive failure simulator** | Pick "missing FLAIR" / "mismatched shape" / "non-brain scan" from a menu and watch the real validator reject it live | Performs "engineered to fail safely" instead of asserting it. Must use synthetic inputs and never bypass validation on a real upload |
| **Session case log** | Every run recorded locally (timestamp, volumes, Dice) so a user can flip back without re-running | `localStorage`; job artefacts already expire server-side in 23 h |
| **Two-case compare** | Any two logged cases side by side with deltas | Precursor to full longitudinal comparison, useful today |
| **Review-priority badge** | Flag a case whose mean σ is an outlier against the session's own distribution | Already scoped as PS-safe: a statement about the model's output, never about the patient |
| **Modality-ablation toggle** | Re-run with one channel zeroed, highlight the voxels that disappear | Teaches which sequence carried the call. Only valid if the model supports missing modalities — do not present a zeroed input as equivalent |
| **Guided first-run tour** | Five-step walkthrough built on the Help panel primitives | Onboarding friction is the real adoption blocker |
| **Interactive case builder** | Expose `make_demo_gallery.py`'s lesion parameters as sliders, generate and segment live | Teaching-hospital use case; no new model work |
| **Atlas-relative localisation** | "Which lobe", not just "which side" | Affine-only alignment, disclosed as approximate |
| **DICOM ingestion** | Accept what a resident's worklist actually contains | Highest real-world-adoption leverage of anything on this list |
| **Five-workspace navigation** | Analyse / Compare / Research Lab / Learn / Reports | Worth revisiting now that Datasets and Help exist as panels |

Out of scope, restated: no diagnosis, grading, prognosis or treatment
suggestion, even hedged. See `PRODUCT_GAPS_AND_IDEATION.md`.

---

## 3. Design constraints for anything added here

The incumbent visual world is authority — dark clinical workstation, tokens in
`src/index.css` (`--color-ink`, `--color-panel`, `--color-edge`, region colours
WT teal / TC amber / ET rose), Inter plus a monospace reserved for data and
measurement. Extend it; don't replace it.

Checks that failed nothing this round and should keep passing: no nested cards,
no gradient text, no glass as decoration, no coloured border-left above 1 px, no
emoji standing in for icons, every browser surface themed. Run the detector over
changed files before calling UI work done:

```bash
.claude/skills/impeccable/scripts/impeccable detect --json <changed files>
```

The deeper rule, which no detector catches: the 3D view is the point of this
screen. Secondary information floats, collapses, or goes in a panel — it never
squeezes the twin.
