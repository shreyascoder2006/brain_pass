# NeuroScope 3D — Comprehensive Test Studies Library

This directory contains **10 diverse clinical multiparametric brain MRI test studies** generated for NeuroScope 3D.

Each study folder contains:
1. **Four standard multiparametric MRI sequences** in `.nii.gz` format:
   - `T1.nii.gz` — Native T1-weighted structural scan
   - `T1Gd.nii.gz` — Post-contrast T1-weighted (gadolinium-enhancing) scan
   - `T2.nii.gz` — T2-weighted structural scan
   - `FLAIR.nii.gz` — Fluid-Attenuated Inversion Recovery scan
2. **Ground Truth Expert Mask** (`label.nii.gz`):
   - Label 1: Necrotic & Non-Enhancing Core (NCR/NET)
   - Label 2: Peritumoral Vasogenic Edema (ED)
   - Label 4: Contrast-Enhancing Active Tumor (ET)
3. **High-Resolution 2D Cross-Sectional MRI Slices** (`2d_slices/`):
   - `t1_axial.png`
   - `t1gd_axial.png`
   - `t2_axial.png`
   - `flair_axial.png`
   - `overlay_axial.png` (Color-coded segmentation overlay)
   - `diagnostic_quad_sheet.png` (2x2 unified multi-sequence comparison sheet)
4. **Metadata & Clinical Profile** (`metadata.json`, `README.md`)

---

## Catalog of Generated Test Cases

| Case ID | Clinical Pathology | Anatomical Location | WT (mL) | TC (mL) | ET (mL) | Key Clinical Characteristics |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **`case_01_right_frontal_gbm`** | Glioblastoma Multiforme (GBM) | Right Frontal Lobe | **50.5** | **20.4** | **13.2** | Thick irregular enhancing rim, necrotic core, extensive vasogenic edema. |
| **`case_02_left_temporal_astrocytoma`** | Infiltrative Astrocytoma | Left Temporal Lobe | **35.4** | **7.7** | **7.1** | Diffuse T2/FLAIR hyperintensity with subtle patchy enhancement. |
| **`case_03_bilateral_multifocal_mets`** | Multifocal Metastatic Lesions | Left Frontal + Right Parieto-Occipital | **25.7** | **9.8** | **8.4** | Two distinct isolated masses; tests multi-cluster connectivity analysis. |
| **`case_04_left_parietal_meningioma`** | Dural-Based Convexity Mass | Left Parietal Margin | **19.5** | **13.7** | **13.7** | Homogeneous intense enhancement with sharp dural-based margin. |
| **`case_05_deep_thalamic_glioma`** | Deep Central Subcortical Mass | Right Thalamus / Ventricular Wall | **17.0** | **7.2** | **5.7** | Centromedial lesion with direct ventricular horn displacement. |
| **`case_06_posterior_fossa_cerebellar`** | Infratentorial Cerebellar Mass | Right Cerebellar Hemisphere | **16.7** | **7.5** | **6.3** | Posterior fossa location with IV ventricle proximity. |
| **`case_07_butterfly_corpus_callosum`** | Bifrontal Butterfly Glioma | Genu of Corpus Callosum (Midline) | **84.9** | **28.2** | **23.3** | Cross-midline bi-hemispheric bridging mass with massive edema. |
| **`case_08_recurrent_surgical_cavity`** | Post-Resection Recurrent Tumor | Right Parieto-Temporal Bed | **33.6** | **14.3** | **10.1** | Fluid-filled resection cavity with progressive nodular wall recurrence. |
| **`case_09_small_acoustic_schwannoma`** | Skull-Base CP Angle Nodule | Left Cerebellopontine Angle | **5.0** | **3.2** | **3.2** | Small compact nodule testing fine-detail detection sensitivity. |
| **`case_10_large_diffuse_infiltrative`** | Massive Infiltrative Gliomatosis | Right Fronto-Parietal Region | **179.0** | **22.6** | **19.8** | Massive multi-lobar edema with very high WT-to-TC ratio. |

---

## How to Upload and Test in NeuroScope 3D

### Method 1: Manual Drag-and-Drop Upload via Web UI
1. Navigate to the NeuroScope 3D interface at `http://localhost:5173/`.
2. Click **Upload Study** in the top navigation bar.
3. Open any case folder in File Explorer (e.g. [`sample_studies/case_01_right_frontal_gbm`](file:///c:/Users/Shreyas/Downloads/Kurukshetra_new/KurukShetra/sample_studies/case_01_right_frontal_gbm)).
4. Drag or browse the files into their respective sequence slots:
   - `T1.nii.gz` → **T1** slot
   - `T1Gd.nii.gz` → **T1Gd** slot
   - `T2.nii.gz` → **T2** slot
   - `FLAIR.nii.gz` → **FLAIR** slot
   - *(Optional)* `label.nii.gz` → **Expert Mask** slot
5. Click **Run 3D Segmentation** to execute the MONAI SegResNet pipeline with uncertainty estimation and 3D digital-twin rendering.

---

### Method 2: Instant 1-Click Execution via the Datasets Panel
The backend's built-in demo cases are pre-staged and active:
1. In the top bar or sidebar, click **Datasets**.
2. Click **Run this case** on any of the active staged cases:
   - **Unifocal — right frontal** (`case_01`)
   - **Multifocal — left hemisphere** (`case_03`)
   - **Large diffuse — extensive oedema** (`case_10`)
3. The system immediately loads, segments, and displays the case with zero manual file selection required.

---

### Method 3: Direct 2D Slice Viewing
If you want to view, inspect, or test individual 2D MRI slices directly as images (PNG), check:
- Local Folder: [`sample_studies/<case_id>/2d_slices/`](file:///c:/Users/Shreyas/Downloads/Kurukshetra_new/KurukShetra/sample_studies)
- Public Web Folder: [`public/samples/test_studies/<case_id>/`](file:///c:/Users/Shreyas/Downloads/Kurukshetra_new/KurukShetra/public/samples/test_studies)
- Each case includes `t1_axial.png`, `t1gd_axial.png`, `t2_axial.png`, `flair_axial.png`, `overlay_axial.png`, and `diagnostic_quad_sheet.png`.
