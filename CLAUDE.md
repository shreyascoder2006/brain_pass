# NeuroScope 3D — project context for Claude Code

Read this first in any new session. It's the orientation doc, not the detail — every claim here links to the doc that backs it.

## What this is

`DI-02` hackathon problem statement: a web platform that takes four MRI sequences (T1, T1Gd, T2, FLAIR), segments a suspected brain tumour (WT/TC/ET regions, BraTS convention), shows it in 3D + linked 2D slices, measures it, and — this is the actual differentiator, not a side feature — tells the user how far to trust the result. Research/teaching prototype only; see the Disclaimer in `README.md`. Full problem framing: [`docs/PROBLEM_AND_APPROACH.md`](docs/PROBLEM_AND_APPROACH.md).

**The thesis every design decision follows**: a 3D viewer alone isn't new (3D Slicer exists); a 3D viewer that visibly shows its own uncertainty, rejects bad input loudly, and explains every number is the whitespace nothing else in the landscape fills. Don't build features that only serve Layer 1 (viewing) or Layer 2 (raw segmentation) without this Layer 3 (trust) angle attached — that's the actual point of the project.

## Current state — read before assuming anything is missing or broken

- **Real model is live and verified**: MONAI `brats_mri_segmentation` (SegResNet, BraTS-2018, Apache-2.0), checkpoint sha256-pinned, loaded via `backend/setup_model.py`.
- **17/17 judges' own pipeline tests pass** with the real model — failure pack, volume calibration, reproducibility, anisotropic, both orientation tests. Reproduce: `cd backend && python run_judge_tests.py --data ./testdata --model bundle`. Full results: [`docs/VERIFICATION.md`](docs/VERIFICATION.md).
- **Flip-TTA uncertainty is live**: 2-pass flip ensemble, real measured per-voxel σ, shown as a toggleable heat-map in the UI with an honest caveat attached everywhere it appears (disagreement signal, not a calibrated probability).
- **Full-stack wiring is real**: React/Three.js frontend ↔ FastAPI server ↔ `neuroscope` pipeline library. Live upload → staged progress → 3D render, verified end to end, not mocked.
- **What's NOT yet true, stated plainly so nobody re-discovers this the hard way**: all accuracy numbers so far (Dice ~0.96/0.92/0.95) are from this project's own *synthetic* calibration case, not real BraTS/Decathlon data. No real held-out evaluation exists yet. Only one model architecture has been benchmarked. See [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for exactly what closes this and in what order.

## Repo map

```
backend/
  neuroscope/        pure-Python pipeline library — validate, infer (TTA), regions, provenance, limits
  server/             FastAPI app — job lifecycle, live stage-progress, the HTTP API
  predict.py          CLI entry point (what a judge's scorer calls)
  evaluate.py         Dice/sensitivity over a BraTS-style folder tree
  make_testcase.py    generates the synthetic judge test pack
  run_judge_tests.py  runs the judge pack, reports PASS/FAIL
  setup_model.py      downloads + sha256-verifies the MONAI checkpoint
src/
  components/         3D viewer, linked MPR grid, upload panel, metrics bar
  lib/                 meshing (Surface Nets), affine math, API client
  state/               Zustand stores
docs/                 all project documentation — see index below
reports/              earlier landscape/competitive research (grounds the whole trust-layer thesis)
```

## Doc index — read the relevant one before touching that area

| Doc | When to read it |
|---|---|
| [`README.md`](README.md) | Quickstart, feature overview, disclaimer |
| [`docs/PROBLEM_AND_APPROACH.md`](docs/PROBLEM_AND_APPROACH.md) | Before any product/UX decision — the problem framing and the three-layer thesis |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Before touching the pipeline, server, or model code |
| [`docs/FEATURES.md`](docs/FEATURES.md) | Full feature inventory — check before assuming something doesn't exist |
| [`docs/VERIFICATION.md`](docs/VERIFICATION.md) | Current measured test results, and the exact commands to reproduce them |
| [`docs/MODEL_CARD.md`](docs/MODEL_CARD.md) | Model provenance, known limitations |
| [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) | **The active work plan** — real data acquisition, multi-model benchmarking, hardening. Read this before starting new backend work. |
| [`docs/BACKEND_ROADMAP.md`](docs/BACKEND_ROADMAP.md) | Earlier phased hardening plan; some items already closed (checkpoint hashing, resource limits, live progress) — check status markers before re-doing them |
| [`docs/PRODUCT_GAPS_AND_IDEATION.md`](docs/PRODUCT_GAPS_AND_IDEATION.md) | Feature ideation, **and an explicit note on what's out of scope by the PS's own rules — read before adding anything diagnosis-adjacent** |
| [`reports/NeuroScope 3D landscape research.md`](<reports/NeuroScope 3D landscape research.md>) | The competitive/literature research the trust-layer thesis is grounded in |

## Hard rules, not suggestions

1. **No claim ships without a reproducible run behind it.** If a number can't be regenerated from a committed script against named, versioned data, it doesn't go in a report, a doc, or a demo. This is why `docs/VERIFICATION.md` explicitly separates "measured" from "not yet measured" — keep that discipline.
2. **Wording**: "suspected tumour region predicted by the model," "estimated volume" — never "detected," "diagnostic," or "replaces the radiologist." This is a PS rule, not a style preference, and it's load-bearing for scoring.
3. **A result is never partial.** Validation stays all-or-nothing — don't add a code path that produces a mesh/report/measurement for a study that failed validation.
4. **No diagnosis/prognosis/treatment-advice features**, even hedged. See `docs/PRODUCT_GAPS_AND_IDEATION.md`'s explicit section on this before building anything in that direction.
5. **Geometry is sacred.** Any change touching resampling, affines, or orientation must be re-checked against the orientation judge tests (`run_judge_tests.py`) before being considered done — this is a known, real failure class in neuroimaging software.

## Running it locally

```bash
# Frontend
npm install && npm run dev                 # http://localhost:5173

# Backend
cd backend && pip install -r requirements.txt
python setup_model.py                       # one-time: downloads + verifies the real checkpoint
uvicorn server.main:app --host 127.0.0.1 --port 8008

# Verify nothing's broken after a change
python make_testcase.py --out ./testdata     # only needed once, or after testdata/ is deleted
python run_judge_tests.py --data ./testdata --model bundle
```

Note: `backend/models/`, `backend/testdata/`, and `backend/.runtime/` are gitignored by design (weights, generated test data, live job artefacts) — if they're missing, that's expected, not a bug; regenerate with the commands above.

## Known environment quirks worth knowing before debugging them from scratch

- This has been developed in a sandboxed environment where the Bash tool's filesystem view and the native Windows filesystem (what PowerShell, VS Code, and locally-run `npm`/`node` processes see) can diverge for certain directories (notably `node_modules`). If `npm run dev` fails with a missing-binary error right after a Bash-run `npm install`, re-run `npm install` from the actual terminal/IDE you're using, not assume the install itself is broken.
- The backend server and frontend dev server are two separate processes (`uvicorn` on :8008, Vite on :5173) — both need to be running for live (non-demo) uploads to work. The UI always renders a procedural demo case with zero setup, so "nothing renders" on first load is not a sign the backend is required to be up.
