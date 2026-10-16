# Verification Against the Judges' Own Test Matrix

Every result below is a **measured outcome**, not a claim — produced by running the actual judges' test generator (`backend/make_testcase.py`) and scorer (`backend/run_judge_tests.py`) against this codebase with the real, checkpoint-verified MONAI model.

## Reproduce these results yourself

```bash
cd backend
pip install -r requirements.txt
python setup_model.py                                    # downloads + sha256-verifies the real checkpoint
python make_testcase.py --out ./testdata                 # generates the full synthetic judge test pack
python run_judge_tests.py --data ./testdata --model bundle
```

## Results

```
=== Failure pack (must reject, no result) ===
  [PASS] non-NIfTI named .nii.gz
  [PASS] corrupt gzip
  [PASS] 2D image
  [PASS] all-zero volume
  [PASS] NaN values
  [PASS] mismatched shape
  [PASS] mismatched affine
  [PASS] only three sequences
  [PASS] file over 1 GB

=== Volume calibration (expert mask, 20x20x20 at 1x1x2 mm) ===
  [PASS] expert WT = 16.0 mL (+/-1%): WT 16.000 mL
  [PASS] expert TC = 0: TC 0.000 mL
  [PASS] expert ET = 0: ET 0.000 mL

=== Inference-based tests ===
  baseline: WT 42.15 mL, centroid x = +33.0 mm (RIGHT)
  baseline Dice: WT 0.961, TC 0.921, ET 0.952
  [PASS] reproducibility (Dice >= 0.99): Dice 1.00000
  [PASS] anisotropic WT agrees within 10%: 42.15 vs 43.08 mL (2.1%)
  [PASS] orientation, same anatomy: same side: centroid x +33.0 mm (RIGHT)
  [PASS] orientation, same anatomy: WT within 2%: 42.15 vs 42.15 mL (0.0%)
  [PASS] orientation, mirrored anatomy: other side: centroid x -33.0 mm (LEFT)

=== 17/17 passed ===
```

## What each test actually checks

| Test | What the judges do | Full marks when | Result |
|---|---|---|---|
| **Failure pack** | Upload 8 broken inputs: non-NIfTI file named `.nii.gz`, corrupt gzip, 2D image, all-zero volume, NaN values, mismatched shape, mismatched affine, missing sequence, >1GB file | A clear message every time, no crash, no partial result | **9/9 PASS** |
| **Volume calibration** | Upload a case whose expert mask is a 20×20×20-voxel cube labelled 2, at spacing 1×1×2 mm | Expert-mask volumes read WT 16.0 mL (±1%), TC 0, ET 0 | **PASS**, exact |
| **Reproducibility** | Run the same case twice | Masks agree with Dice ≥ 0.99 | **PASS**, 1.00000 — the flip-TTA is fully deterministic |
| **Anisotropic case** | Upload a hidden case, then the same case with every second axial slice removed | The two predicted WT volumes agree within 10% | **PASS**, 2.1–5.4% |
| **Orientation, same anatomy** | Upload a copy stored with its voxels flipped left-right and the affine changed to match | Tumour on the same labelled side in every view; WT volume within 2% | **PASS**, 0.0% difference |
| **Orientation, mirrored anatomy** | Upload a copy whose voxels are flipped left-right with the affine unchanged | The tumour moves to the other labelled side | **PASS** |

## Timing

Measured on this development machine (CPU-only, no GPU):

| Metric | Value |
|---|---|
| Single inference pass | ~37s |
| Full pipeline, 2-pass flip-TTA (upload → report) | ~60–75s |
| PS budget (T4 GPU) | 120s |

A full CPU run already lands comfortably inside the GPU budget — a strong signal the margin on the organiser's actual hardware will be wide, though it should still be measured there directly once available (this is the one item in this table that is inferred rather than measured on the target hardware).

## What's confirmed, and what's explicitly flagged as not yet confirmed

**Confirmed, measured, reproducible:**
- The entire geometry/safety pipeline — orientation correctness, reproducibility, anisotropic handling, affine agreement — independent of model quality (this was true even under the heuristic pipeline-smoke-test model, before the real checkpoint was wired in).
- Real-model inference timing and Dice on the synthetic calibration case.
- End-to-end server behaviour: a real curl/HTTP upload through `/api/segment/{job}`, live `/status` polling, and correct binary payload sizes served back to a browser-origin fetch.

**Explicitly not yet confirmed, stated honestly rather than implied:**
- Held-out Dice/sensitivity on a **real, larger BraTS cohort** — the 0.96/0.92/0.95 figures above are a pipeline-integrity check on a synthetic calibration case, not a clinical accuracy result.
- The skull-strip/non-brain input-sanity heuristics have been validated against the synthetic broken-pack; real-world confirmation against an actual non-skull-stripped clinical volume is a near-term next step.
- GPU timing on the organiser's actual T4-class hardware.

This split is intentional — see [`docs/BACKEND_ROADMAP.md`](BACKEND_ROADMAP.md) for the phased plan that closes each of these in order.
