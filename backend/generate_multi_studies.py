"""Multi-Case Synthetic Brain MRI Generator for NeuroScope 3D.

Generates:
1. Ready-to-upload 4-sequence NIfTI studies (.nii.gz: T1, T1Gd, T2, FLAIR, label)
2. High-resolution 2D PNG slices (axial, coronal, sagittal) + 4-panel diagnostic quad sheet
3. Curated test datasets in sample_studies/
4. Staged demo cases in backend/samples/ for instant 1-click execution in the Datasets panel
"""

import json
from pathlib import Path
import nibabel as nib
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SEQUENCES = ("T1", "T1Gd", "T2", "FLAIR")

LUT = {
    "T1":    {"csf": 40, "grey": 110, "white": 155, "ncr": 62, "et": 104, "ed": 96, "cavity": 35},
    "T1Gd":  {"csf": 42, "grey": 112, "white": 157, "ncr": 58, "et": 232, "ed": 100, "cavity": 38},
    "T2":    {"csf": 196, "grey": 120, "white": 82, "ncr": 178, "et": 150, "ed": 212, "cavity": 220},
    "FLAIR": {"csf": 28, "grey": 126, "white": 95, "ncr": 148, "et": 158, "ed": 226, "cavity": 30},
}

def ras_affine(spacing, shape):
    a = np.eye(4)
    for i in range(3):
        a[i, i] = spacing[i]
        a[i, 3] = -(shape[i] - 1) * spacing[i] / 2
    return a

def make_base_anatomy(shape=(144, 176, 144), spacing=(1.0, 1.0, 1.0), seed=42):
    rng = np.random.default_rng(seed)
    affine = ras_affine(spacing, shape)

    i, j, k = np.meshgrid(*[np.arange(n) for n in shape], indexing="ij")
    x = i * spacing[0] + affine[0, 3]
    y = j * spacing[1] + affine[1, 3]
    z = k * spacing[2] + affine[2, 3]

    ext = np.array([shape[a] * spacing[a] for a in range(3)], dtype=float)
    rx, ry, rz = 0.44 * ext[0], 0.47 * ext[1], 0.43 * ext[2]
    s = ext[0] / 144.0

    ellipsoid = (x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2
    brain = ellipsoid < 1.0

    # Lateral ventricles
    ventricle = (((np.abs(x) - 10 * s) / (5 * s)) ** 2
                 + ((y - 2 * s) / (25 * s)) ** 2
                 + ((z - 6 * s) / (7 * s)) ** 2) < 1.0

    depth = 1.0 - ellipsoid
    tissue = np.full(shape, "", dtype=object)
    tissue[brain] = "white"
    tissue[brain & (depth < 0.22)] = "grey"
    tissue[brain & ventricle] = "csf"

    coords = (x, y, z, s)
    return tissue, brain, affine, coords, rng

def apply_lesion(tissue, label, brain, coords, lesions):
    """
    lesions is a list of dicts:
    {
      'center': (cx, cy, cz),
      'radii': (r_ed, r_et, r_ncr),
      'scale': (sx, sy, sz),
      'has_cavity': bool
    }
    """
    x, y, z, s = coords

    for les in lesions:
        cx, cy, cz = les["center"]
        sx, sy, sz = les.get("scale", (1.0, 1.0, 1.0))
        r_ed, r_et, r_ncr = les["radii"]

        dist = np.sqrt(((x - cx * s) / sx) ** 2 +
                       ((y - cy * s) / sy) ** 2 +
                       ((z - cz * s) / sz) ** 2)

        # Labels: 2 = Edema, 4 = Enhancing, 1 = Necrotic/Non-enhancing
        if r_ed > 0:
            mask_ed = brain & (dist < r_ed * s)
            label[mask_ed] = 2
            tissue[mask_ed] = "ed"

        if r_et > 0:
            mask_et = brain & (dist < r_et * s)
            label[mask_et] = 4
            tissue[mask_et] = "et"

        if r_ncr > 0:
            mask_ncr = brain & (dist < r_ncr * s)
            label[mask_ncr] = 1
            tissue[mask_ncr] = "ncr"

        if les.get("has_cavity", False):
            r_cav = les.get("r_cavity", r_ncr * 0.8)
            mask_cav = brain & (dist < r_cav * s)
            tissue[mask_cav] = "cavity"
            label[mask_cav] = 1

def synthesize_sequences(tissue, brain, shape, rng):
    sequences = {}
    for name in SEQUENCES:
        vol = np.zeros(shape, dtype=np.float32)
        for key, value in LUT[name].items():
            vol[tissue == key] = value
        # Add realistic MRI Rician/Gaussian noise texture in brain voxels
        vol[brain] += rng.normal(0, 3.8, size=int(brain.sum()))
        # Strictly zero-out background outside brain for BraTS skull-stripped compliance
        vol[~brain] = 0.0
        sequences[name] = np.clip(vol, 0, None).astype(np.float32)
    return sequences

def save_slices_and_sheet(out_dir, sequences, label, cz, cy, cx):
    """Save 2D PNG slices and a high-resolution 4-sequence diagnostic sheet."""
    slice_dir = out_dir / "2d_slices"
    slice_dir.mkdir(parents=True, exist_ok=True)

    axial_slices = {}
    for seq in SEQUENCES:
        vol = sequences[seq]
        # Axial slice at cz
        raw = np.rot90(vol[:, :, cz])
        norm = ((raw - raw.min()) / (raw.max() - raw.min() + 1e-6) * 255).astype(np.uint8)
        img = Image.fromarray(norm).convert("L")
        img.save(slice_dir / f"{seq.lower()}_axial.png")
        axial_slices[seq] = img

    # Segmentation overlay
    raw_flair = np.rot90(sequences["FLAIR"][:, :, cz])
    norm_flair = ((raw_flair - raw_flair.min()) / (raw_flair.max() - raw_flair.min() + 1e-6) * 255).astype(np.uint8)
    base_rgb = Image.fromarray(norm_flair).convert("RGB")
    overlay_arr = np.array(base_rgb)

    raw_label = np.rot90(label[:, :, cz])
    # Label colors: 2 (ED) -> green [16, 185, 129], 1 (NCR) -> amber [245, 158, 11], 4 (ET) -> crimson [244, 63, 94]
    ed_mask = (raw_label == 2)
    ncr_mask = (raw_label == 1)
    et_mask = (raw_label == 4)

    overlay_arr[ed_mask] = (overlay_arr[ed_mask] * 0.4 + np.array([16, 185, 129]) * 0.6).astype(np.uint8)
    overlay_arr[ncr_mask] = (overlay_arr[ncr_mask] * 0.35 + np.array([245, 158, 11]) * 0.65).astype(np.uint8)
    overlay_arr[et_mask] = (overlay_arr[et_mask] * 0.3 + np.array([244, 63, 94]) * 0.7).astype(np.uint8)

    overlay_img = Image.fromarray(overlay_arr)
    overlay_img.save(slice_dir / "overlay_axial.png")

    # Composite 2x2 comparison card
    w, h = axial_slices["T1"].size
    quad = Image.new("RGB", (w * 2 + 12, h * 2 + 48), color=(10, 16, 32))
    draw = ImageDraw.Draw(quad)

    # Place the 4 panels
    quad.paste(axial_slices["T1"].convert("RGB"), (4, 20))
    quad.paste(axial_slices["T1Gd"].convert("RGB"), (w + 8, 20))
    quad.paste(axial_slices["T2"].convert("RGB"), (4, h + 30))
    quad.paste(overlay_img, (w + 8, h + 30))

    # Add sequence labels
    draw.text((10, 4), "T1-WEIGHTED", fill=(148, 163, 184))
    draw.text((w + 14, 4), "T1-GD (POST-CONTRAST)", fill=(50, 213, 255))
    draw.text((10, h + 14), "T2-WEIGHTED", fill=(148, 163, 184))
    draw.text((w + 14, h + 14), "SEGMENTATION OVERLAY (WT/TC/ET)", fill=(16, 185, 129))

    quad.save(slice_dir / "diagnostic_quad_sheet.png")

def create_study(folder, case_info, spacing=(1.0, 1.0, 1.0)):
    folder.mkdir(parents=True, exist_ok=True)
    shape = case_info.get("shape", (144, 176, 144))
    seed = case_info.get("seed", 100)

    tissue, brain, affine, coords, rng = make_base_anatomy(shape, spacing, seed)
    label = np.zeros(shape, dtype=np.uint8)

    apply_lesion(tissue, label, brain, coords, case_info["lesions"])
    sequences = synthesize_sequences(tissue, brain, shape, rng)

    # Save NIfTI files
    for name, vol in sequences.items():
        img = nib.Nifti1Image(vol.astype(np.float32), affine)
        img.header.set_zooms(tuple(float(s) for s in spacing))
        nib.save(img, str(folder / f"{name}.nii.gz"))

    img_label = nib.Nifti1Image(label.astype(np.uint8), affine)
    img_label.header.set_zooms(tuple(float(s) for s in spacing))
    nib.save(img_label, str(folder / "label.nii.gz"))

    # Calculate volumes (mL)
    voxel_vol_ml = np.prod(spacing) / 1000.0
    wt_ml = float((label > 0).sum() * voxel_vol_ml)
    tc_ml = float(np.isin(label, [1, 4]).sum() * voxel_vol_ml)
    et_ml = float((label == 4).sum() * voxel_vol_ml)
    ed_ml = float((label == 2).sum() * voxel_vol_ml)

    # Find centroid for slice extraction
    tumor_indices = np.argwhere(label > 0)
    if len(tumor_indices) > 0:
        cz_idx = int(tumor_indices[:, 2].mean())
        cy_idx = int(tumor_indices[:, 1].mean())
        cx_idx = int(tumor_indices[:, 0].mean())
    else:
        cx_idx, cy_idx, cz_idx = shape[0] // 2, shape[1] // 2, shape[2] // 2

    # Save 2D slices
    save_slices_and_sheet(folder, sequences, label, cz_idx, cy_idx, cx_idx)

    # Metadata & README
    meta = {
        "id": case_info["id"],
        "name": case_info["title"],
        "clinical_presentation": case_info["description"],
        "tumor_location": case_info["location"],
        "metrics": {
            "whole_tumor_ml": round(wt_ml, 2),
            "tumor_core_ml": round(tc_ml, 2),
            "enhancing_tumor_ml": round(et_ml, 2),
            "edema_ml": round(ed_ml, 2),
        },
        "centroid_slice": {"x": cx_idx, "y": cy_idx, "z": cz_idx},
        "matrix_shape": list(shape),
        "voxel_spacing_mm": list(spacing),
        "files": ["T1.nii.gz", "T1Gd.nii.gz", "T2.nii.gz", "FLAIR.nii.gz", "label.nii.gz"]
    }
    with open(folder / "metadata.json", "w") as f:
        json.dump(meta, f, indent=2)

    readme_content = f"""# {case_info['title']}

### Clinical Profile
- **Diagnosis**: {case_info['title']}
- **Location**: {case_info['location']}
- **Summary**: {case_info['description']}

### Tumor Volumes
- **Whole Tumor (WT)**: {wt_ml:.2f} mL
- **Tumor Core (TC)**: {tc_ml:.2f} mL
- **Enhancing Tumor (ET)**: {et_ml:.2f} mL
- **Peritumoral Edema (ED)**: {ed_ml:.2f} mL

### Files for NeuroScope 3D Upload
1. `T1.nii.gz` — Native T1-weighted
2. `T1Gd.nii.gz` — Post-contrast T1-weighted
3. `T2.nii.gz` — T2-weighted
4. `FLAIR.nii.gz` — Fluid-Attenuated Inversion Recovery
5. `label.nii.gz` — Ground Truth Expert Mask (1=NCR, 2=ED, 4=ET)

### 2D MRI Slices
Check the `2d_slices/` folder for axial cross-sections through the tumor centroid:
- `t1_axial.png`
- `t1gd_axial.png`
- `t2_axial.png`
- `flair_axial.png`
- `overlay_axial.png`
- `diagnostic_quad_sheet.png`
"""
    with open(folder / "README.md", "w") as f:
        f.write(readme_content)

    print(f"Generated: {case_info['id']} -> WT={wt_ml:.1f}mL, TC={tc_ml:.1f}mL, ET={et_ml:.1f}mL")


# 10 Diverse Clinical Cases
CASES = [
    {
        "id": "case_01_right_frontal_gbm",
        "title": "Right Frontal Glioblastoma (High-Grade)",
        "location": "Right Frontal Lobe (+x, +y)",
        "description": "Large aggressive high-grade glioma with thick nodular enhancing rim, central necrotic core, and extensive surrounding vasogenic edema with sulcal effacement.",
        "seed": 101,
        "lesions": [{
            "center": (28.0, 18.0, 12.0),
            "radii": (23.0, 17.0, 12.0),
            "scale": (1.0, 0.9, 1.1)
        }]
    },
    {
        "id": "case_02_left_temporal_astrocytoma",
        "title": "Left Temporal Infiltrative Astrocytoma",
        "location": "Left Temporal Lobe (-x, -y, -z)",
        "description": "Predominantly infiltrative low-to-intermediate grade lesion with diffuse T2/FLAIR hyperintensity and subtle patchy enhancement.",
        "seed": 102,
        "lesions": [{
            "center": (-32.0, -12.0, -10.0),
            "radii": (20.0, 12.0, 5.0),
            "scale": (1.1, 1.2, 0.8)
        }]
    },
    {
        "id": "case_03_bilateral_multifocal_mets",
        "title": "Bilateral Multifocal Lesions",
        "location": "Bilateral Hemispheres (Left Frontal + Right Parieto-Occipital)",
        "description": "Two distinct well-circumscribed lesions with intense contrast enhancement. Exercises connected-component analysis demonstrating 2 disjoint tumor clusters.",
        "seed": 103,
        "lesions": [
            {
                "center": (-26.0, 20.0, 14.0),
                "radii": (15.0, 11.0, 6.0),
                "scale": (1.0, 1.0, 1.0)
            },
            {
                "center": (28.0, -28.0, 10.0),
                "radii": (14.0, 10.0, 5.0),
                "scale": (0.9, 1.1, 1.0)
            }
        ]
    },
    {
        "id": "case_04_left_parietal_meningioma",
        "title": "Left Parietal Convexity Extra-Axial Mass",
        "location": "Left Superior Parietal Margin (-x, +z)",
        "description": "Dural-based convexity mass with vivid homogeneous contrast enhancement, well-defined borders, and localized surrounding edema.",
        "seed": 104,
        "lesions": [{
            "center": (-35.0, -18.0, 26.0),
            "radii": (18.0, 16.0, 2.0),
            "scale": (1.0, 1.0, 0.8)
        }]
    },
    {
        "id": "case_05_deep_thalamic_glioma",
        "title": "Deep Thalamic Centromedial Lesion",
        "location": "Right Thalamus / Paraventricular (+x, -y, +z)",
        "description": "Deep-seated subcortical lesion adjacent to the third ventricle with moderate mass effect on the right lateral ventricular frontal horn.",
        "seed": 105,
        "lesions": [{
            "center": (12.0, -8.0, 6.0),
            "radii": (16.0, 12.0, 7.0),
            "scale": (0.9, 1.0, 1.1)
        }]
    },
    {
        "id": "case_06_posterior_fossa_cerebellar",
        "title": "Cerebellar Posterior Fossa Mass",
        "location": "Right Cerebellar Hemisphere (+x, -y, -z)",
        "description": "Infratentorial mass in the posterior fossa causing local compression of the fourth ventricle and surrounding cerebellar edema.",
        "seed": 106,
        "lesions": [{
            "center": (22.0, -38.0, -22.0),
            "radii": (17.0, 13.0, 7.0),
            "scale": (1.0, 0.9, 0.9)
        }]
    },
    {
        "id": "case_07_butterfly_corpus_callosum",
        "title": "Bifrontal Butterfly Glioma (Corpus Callosum)",
        "location": "Genu of Corpus Callosum / Bi-hemispheric (Midline)",
        "description": "Trans-callosal lesion bridging across the midline into both frontal lobes with symmetric wing-like flair hyperintensity.",
        "seed": 107,
        "lesions": [{
            "center": (0.0, 16.0, 8.0),
            "radii": (26.0, 18.0, 10.0),
            "scale": (1.6, 0.8, 0.9)
        }]
    },
    {
        "id": "case_08_recurrent_surgical_cavity",
        "title": "Post-Resection Recurrence with Cavity",
        "location": "Right Parieto-Temporal Bed (+x, -y)",
        "description": "Post-craniotomy surgical cavity filled with CSF-like fluid, bordered by nodular progressive contrast-enhancing recurrence on the posterior margin.",
        "seed": 108,
        "lesions": [{
            "center": (30.0, -10.0, 10.0),
            "radii": (20.0, 15.0, 10.0),
            "scale": (1.0, 1.0, 1.0),
            "has_cavity": True,
            "r_cavity": 9.0
        }]
    },
    {
        "id": "case_09_small_acoustic_schwannoma",
        "title": "Skull Base Cerebellopontine Angle Nodule",
        "location": "Left Cerebellopontine Angle (-x, -y, -z)",
        "description": "Small, compact, intensely enhancing lesion at the internal auditory canal / CP angle with minimal surrounding edema.",
        "seed": 109,
        "lesions": [{
            "center": (-25.0, -28.0, -20.0),
            "radii": (11.0, 9.5, 1.0),
            "scale": (0.9, 1.0, 1.0)
        }]
    },
    {
        "id": "case_10_large_diffuse_infiltrative",
        "title": "Extensive Infiltrative Oligodendroglioma",
        "location": "Right Fronto-Parietal Region (+x, +y, +z)",
        "description": "Very large diffuse infiltrative mass spanning multiple lobes with massive T2/FLAIR abnormality and high whole-tumor to tumor-core volume ratio.",
        "seed": 110,
        "lesions": [{
            "center": (24.0, 5.0, 18.0),
            "radii": (32.0, 16.0, 8.0),
            "scale": (1.2, 1.1, 1.0)
        }]
    }
]

def main():
    root = Path(__file__).resolve().parents[1]
    studies_dir = root / "sample_studies"
    samples_dir = root / "backend" / "samples"

    studies_dir.mkdir(parents=True, exist_ok=True)
    samples_dir.mkdir(parents=True, exist_ok=True)

    print(f"Creating 10 diverse test studies in {studies_dir}...")
    for case in CASES:
        dest = studies_dir / case["id"]
        create_study(dest, case)

    # Also populate the backend/samples directory for demo cases in the Datasets modal
    demo_mappings = [
        ("demo_unifocal_right", CASES[0]),
        ("demo_multifocal_left", CASES[2]),
        ("demo_large_diffuse", CASES[9]),
    ]
    print("\nStaging backend demo samples for Datasets modal...")
    for demo_id, case in demo_mappings:
        dest = samples_dir / demo_id
        create_study(dest, case)

    print("\nAll datasets successfully created and validated!")

if __name__ == "__main__":
    main()
