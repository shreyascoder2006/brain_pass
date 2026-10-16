# Model Card — NeuroScope 3D Segmentation Model

One-page model card, as required by the problem statement's deliverables.

## Model

| Field | Value |
|---|---|
| **Name** | MONAI `brats_mri_segmentation` |
| **Architecture** | SegResNet (3D convolutional encoder-decoder) |
| **Bundle version** | 0.5.4 |
| **Source** | [MONAI Model Zoo](https://huggingface.co/MONAI/brats_mri_segmentation) |
| **Licence** | Apache-2.0 |
| **Training data** | BraTS 2018 |
| **Fine-tuning performed by this project** | None — the pretrained checkpoint is used as-is |
| **Checkpoint integrity** | sha256-verified against a pinned `model-lock.json`, written by `backend/setup_model.py`, checked on every load by `neuroscope.infer.load_segmenter` |

## Input / output contract

| | |
|---|---|
| **Input** | 4 channels at 1mm isotropic resolution, in the order **T1Gd → T1 → T2 → FLAIR** (not alphabetical) |
| **Preprocessing** | Reorient to closest-canonical RAS+; resample to isotropic 1mm; per-channel z-score normalisation over non-zero (in-brain) voxels |
| **Inference** | 128³ sliding window, Gaussian blending, overlap 0.5; flip-based TTA, 2 passes by default |
| **Output** | 3 sigmoid channels (TC, WT, ET), thresholded at 0.5, nesting enforced (ET ⊆ TC ⊆ WT) |
| **Export** | Collapsed to BraTS label codes (1 NCR, 2 ED, 4 ET), written back onto the *original* input grid and affine via nearest-neighbour resampling |

## Performance

| Metric | Value | Context |
|---|---|---|
| Dice — WT / TC / ET (synthetic) | 0.961 / 0.921 / 0.952 | This project's synthetic calibration/test-pack case — a **pipeline-integrity check**, not a clinical accuracy result |
| **Dice — WT / TC / ET (real data)** | **0.9013 / 0.8989 / 0.8503** | **4 real Medical Segmentation Decathlon cases** (`BRATS_206/306/449/457`), no fine-tuning — see [`docs/VERIFICATION.md`](VERIFICATION.md#real-data-accuracy-medical-segmentation-decathlon) |
| Sensitivity — WT / TC / ET (real data) | 0.8677 / 0.8882 / 0.8207 | Same 4 cases |
| Reproducibility | Dice ≥ 0.99 between repeated runs | Measured: 1.00000 (flip-TTA is deterministic, no randomness involved) |
| Inference time | ~37s single pass, ~60–75s with 2-pass TTA | CPU-only, this development machine; PS budget is 120s on a T4 GPU |

**Two caveats on the real-data figures:** (1) four cases is a sample, not the ≥10 held-out cases the PS asks for — expansion in progress, see `docs/IMPLEMENTATION_PLAN.md` Phase 1b; (2) pretraining overlap with these specific case IDs is not verifiable from the checkpoint's public BraTS-2018 release — disclosed, not assumed clean. Reproduce: `backend/data/real_sample_eval.json` has the full per-case breakdown; the command is in `docs/VERIFICATION.md`.

## Uncertainty estimation

A flip-based test-time-augmentation ensemble, not a single forward pass: the volume is segmented once unflipped and once per additional flip axis (2 passes total by default), each prediction is un-flipped back to the original orientation, and:

- the **per-voxel mean** probability across passes becomes the final (slightly more robust) prediction,
- the **per-voxel standard deviation** across passes is reported as the uncertainty signal (σ).

This is a measured disagreement signal, not a calibrated probability of correctness. Published findings show naive uncertainty signals in medical segmentation can correlate only weakly with true boundary error — this caveat is surfaced in the product UI itself, not only here.

## Known limitations

- Trained on BraTS 2018; if evaluated against a different BraTS year's cases, unknown pretraining overlap must be disclosed separately (not yet measured for this project's held-out evaluation, since that evaluation has not yet been run on real data).
- The 128³ sliding-window inference size is smaller than some published full-resolution configurations, chosen here for a faster, lighter prototype footprint — this trades some potential accuracy for speed and lower memory use.
- Skull-strip and anatomical-plausibility checks upstream of the model are heuristics (foreground fraction, edge-occupancy, field-of-view bounds, centroid/shape checks), not a trained, validated classifier — they can in principle accept an unusual phantom or reject an unusual genuine image.
- No modality-dropout robustness has been measured — all four sequences are currently required; a missing-sequence degraded mode is on the roadmap, not implemented.
- Uncertainty is TTA-based disagreement, not epistemic/aleatoric-decomposed uncertainty from a Bayesian or ensemble-of-models method; it is cheaper and faster, at the cost of a less theoretically grounded confidence interpretation.

## Intended use

Research and teaching only — exploring glioma segmentation on public, de-identified research data, in a classroom, lab, or demonstration setting. **Not intended, validated, or cleared for any clinical, diagnostic, treatment-planning, or patient-facing use.** See the repository [README's Disclaimer section](../README.md#disclaimer) for the full scope statement.

## Provenance, per run

Every run of this pipeline (CLI or live server) records, alongside the result: model name/version/licence, checkpoint sha256, TTA pass count, per-input-file sha256, the code commit hash, a timestamp, and total runtime — so any reported number can be traced back to exactly the code and weights that produced it.
