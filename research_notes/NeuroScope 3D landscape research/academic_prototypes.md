# Academic/Hackathon Prototypes Combining BraTS Segmentation + 3D Web Visualization

## Is there an existing project combining BraTS + NiiVue, Three.js, or general "3D web viewer" keywords?

### Takeaway
No GitHub repo was found that combines the BraTS dataset specifically with NiiVue. NiiVue itself (the library) is a strong generic candidate stack piece, but no BraTS-specific integration exists in public repos found. For Three.js, the closest hits are general 3D brain MRI viewers (not BraTS-trained) and one hackathon project, "Safe Mind"/"NeuroView," that explicitly lists tumor segmentation + marching cubes + Three.js among its pieces, though without confirmed metrics.

### Cited Findings
- NiiVue (github.com/niivue/niivue) is a general-purpose WebGL neuroimaging visualizer that can show voxels, meshes, tractography, and statistical maps, but no BraTS-specific loader or tumor-overlay example exists in its repo or wrapper ecosystem (niivue-vscode, R/Python/Julia wrappers) — [niivue/niivue](https://github.com/niivue/niivue)
- "Safe Mind" (hackathon project, Devpost) is described as "a free, open-source, web-based 3D brain MRI viewer" combining real-time collaboration with analysis tools; stack = Three.js (frontend rendering) + Python/FastAPI + WebSockets (backend) + scikit-image marching_cubes + NiBabel + NumPy for mesh generation; it explicitly lists "tumor segmentation and mesh creation" and "multi-resolution mesh generation for performance" among its data-processing steps — [devpost.com/software/safe-mind](https://devpost.com/software/safe-mind)
- A near-identical Devpost listing, "NeuroView," appears to be the same or a renamed/duplicate project: same stack (Three.js, FastAPI+WebSockets, scikit-image marching cubes), but adds a stated feature of "synchronized axial, sagittal, and coronal slice views" plus a hosted demo link (neuroview.onrender.com, confirmed dead/404 at time of research) — found via web search snippet, original Devpost page returned HTTP 403 to automated fetch
- Neither Safe Mind nor NeuroView's Devpost text states a working Dice score, sensitivity, or volumetric output number — this appears to be an unverified/aspirational feature list rather than a demonstrated, measured pipeline
- "Interactive Manipulation and Visualization of 3D Brain MRI for Surgical Training" (arXiv 2404.15293) is a browser app using Three.js with a 2D MRI viewer and a 3D viewer side by side, loading a NIfTI reader client-side; its 3D assets are pre-exported STL files for skull/segmented anatomical structures — it is NOT tied to BraTS or tumor segmentation, it's a general surgical-training visualization tool — [arxiv.org/pdf/2404.15293](https://arxiv.org/pdf/2404.15293)
- nii2mesh (github, via neurolabusc) is a standalone C tool that converts NIfTI segmentation masks to triangulated meshes via marching cubes — a reusable offline component, not an integrated web demo — [awesome.ecosyste.ms/projects/github.com%2Fneurolabusc%2Fnii2mesh](https://awesome.ecosyste.ms/projects/github.com%2Fneurolabusc%2Fnii2mesh)
- BrainBox (NITRC, Apache-2.0) is a collaborative web app for viewing/segmenting brain MRI; it can export segmentations as NIfTI or triangular meshes and accepts user-supplied NIfTI data by URL, but has no BraTS-specific dashboard and no confirmed direct file-upload UI — [nitrc.org/projects/brainbox](https://nitrc.org/projects/brainbox)

### Inferences
- The "BraTS + NiiVue/Three.js" combination as a complete, working, publicly-documented repo essentially does not exist; what exists are (a) generic neuroimaging viewer libraries with no tumor-segmentation integration, and (b) hackathon viewer projects that list tumor segmentation as a stated feature but do not demonstrate it with metrics in the text available.
- The Safe Mind/NeuroView project is the single closest "all pieces present" partial match for the 3D-mesh-plus-synchronized-slices requirement, but its segmentation functionality is unverified (described in a feature list, not demonstrated with output numbers), and its GitHub source could not be located (no repo link surfaced in search; Devpost page itself blocked automated fetch with HTTP 403).

### Gaps
- Could not access the full Safe Mind/NeuroView Devpost pages directly (403 Forbidden to automated fetch) or find their GitHub source repos — only secondary search-snippet descriptions are available, so the "tumor segmentation" claim is sourced only from the project's own feature list, not from inspected code.
- Could not confirm whether NeuroView's segmentation step uses a pretrained BraTS model or a from-scratch/toy model.
- The hosted NeuroView demo (neuroview.onrender.com) returned 404 at time of research, so the live app can no longer be verified.

## What do Hugging Face Spaces for brain tumor segmentation actually show (2D output image only vs. interactive 3D)?

### Takeaway
Every Hugging Face Space found is 2D-only (slice-in/slice-out or slider-based 2D viewing) or in an unverifiable/broken state; none show interactive 3D rendering, volumetrics, or Dice/sensitivity reporting in the live app.

### Cited Findings
- `katielink/brain_tumor_segmentation` — the most directly BraTS-focused Space (its examples folder contains BraTS-style `.nii.gz` sample volumes); however it currently shows a "Build error" status, so it does not run — [huggingface.co/spaces/katielink/brain_tumor_segmentation](https://huggingface.co/spaces/katielink/brain_tumor_segmentation/tree/main)
- `Ayan-12`'s "BraTS Interface" Space is listed as "Sleeping" (paused, not verified) — found via search snippet
- `hemants01/BrainTumorSegmentationDemo` — described as segmenting "brain MRI slices to detect tumors" (explicitly 2D slice-based); listed as "Sleeping" — found via search snippet
- `SURESHBEEKHANI/Brain_Tumor_Segmentation` — listed as "Sleeping"; the only inspectable content was a YOLO11 instance-segmentation notebook, suggesting it may not even be BraTS-based — found via search snippet
- `A-PolarBear/brain_tumor_segmentation` — app.py loads a MONAI bundle from the Hugging Face Hub via Gradio, with a slider for navigating slices; however the loaded bundle name in the code appears to reference a spleen CT model despite the Space's brain-tumor title, raising doubt about whether it actually runs brain tumor inference correctly; UI is 2D-slice-based with a disclaimer that it is "not to be used for diagnostic purposes" — found via search snippet
- `farahhamad/brats-segmentation` — a Hugging Face Space whose `inference.py` implements a FastAPI backend serving a 3D U-Net trained on BraTS2020 data, explicitly built to be called from a separate React frontend (CORS configured for `localhost:5173`); this is backend-only code visible — the actual frontend/viewer (2D vs 3D) could not be confirmed from available results — [huggingface.co/spaces/farahhamad/brats-segmentation](https://huggingface.co/spaces/farahhamad/brats-segmentation/blob/main/src/inference.py)

### Inferences
- Across all Spaces found, the pattern is: Gradio/Streamlit apps that take one slice or one volume, run a 2D or 3D model, and show a 2D image/slider output. None of the inspectable Spaces show an interactive 3D mesh or volumetric/Dice summary in their actual running UI — the "3D" framing, where it exists at all (e.g., 3D U-Net backend), refers to the model architecture, not the viewer.
- Several Spaces are non-functional (sleeping or build-errored) at time of research, which is itself informative: BraTS demo Spaces have a high abandonment/bitrot rate.

### Gaps
- Could not directly read `app.py` source for most Spaces (katielink, Ayan-12, hemants01, SURESHBEEKHANI) due to search-result limitations; descriptions are inferred from titles, filenames, and commit messages only.
- Could not determine if any Space reports Dice/sensitivity numbers to the user in the UI (vs. only during offline model evaluation).

## What did past hackathon teams (Devpost, Devfolio, etc.) actually build for "brain tumor segmentation" / "BraTS" / "glioma" / "NeuroScope" / "medical imaging 3D"? What polish level, and did any combine linked crosshair MPR + 3D mesh + volumetrics?

### Takeaway
The single closest match across all research is **MindView** (DeltaHacks 2026, Top-5 Finalist) — a deployed hackathon prototype with a working interactive 3D tumor/brain model, computed tumor volume, and multi-timepoint comparison, built on a fine-tuned MONAI SegResNet. However, it does NOT implement linked-crosshair multi-planar 2D views, and does not report Dice/sensitivity. No project found combines all three pieces (3D mesh + linked 2D MPR crosshair + visible volumetric calc) simultaneously.

### Cited Findings
- **MindView** (DeltaHacks 2026, Top 5 Finalist): Devpost describes it as a physician-facing tool "to replace side-by-side comparison of 2D scan slices," letting clinicians "explore a fully interactive 3D representation of the brain and tumor"; it "computes and visualizes measurable changes such as tumor volume and relative position" and supports "timepoint comparison across multiple scans" to track growth/regression/treatment response. The team states: "We had to use and fine-tune pre-trained models due to the complexity of our data" (MONAI SegResNet, in a `monai_brats_bundle/brats_mri_segmentation` folder name suggesting BraTS data/weights, though not explicitly confirmed in text) — [devpost.com/software/mindview](https://devpost.com/software/mindview); GitHub mirror — [GarfieldFluffJr/MindView](https://github.com/GarfieldFluffJr/MindView)
- MindView's stack per its README: React (with React Three Fiber's `useFrame` hook for 3D rendering — Three.js under the hood, though not named directly), Nibabel, scikit-image, SciPy, MONAI SegResNet, Gemini API, MongoDB GridFS, deployed on Vercel (frontend) + Render (backend) — [github.com/GarfieldFluffJr/MindView](https://github.com/GarfieldFluffJr/MindView)
- MindView does NOT mention: BraTS dataset by name (only inferred from a folder name), linked 2D crosshair/MPR slice views, or Dice/sensitivity metrics — only tumor volume and position are reported
- MindView is explicitly a degraded/limited live deployment: the README states "Disabled control operations (upload file, delete file, create patients and cases)" due to low server memory, and warns users "to expect long build and load times since backend goes inactive after a while" — a classic hackathon-deployment limitation — [github.com/GarfieldFluffJr/MindView](https://github.com/GarfieldFluffJr/MindView)
- **BrainTumor-Segmentation_Model** (Devpost): built with Kaggle datasets and a Reflex-based website; reports a Dice score of 0.8509 for a from-scratch model; team's stated obstacles were limited data and learning the Reflex framework. No mention of 3D visualization — appears to be classification/2D-segmentation-display only — [devpost.com/software/braintumor-segmentation_model](https://devpost.com/software/braintumor-segmentation_model)
- **DeepBrainSeg** (Devpost, and separately as a GitHub repo by koriavinash1): segments gliomas and internal substructures using an ensemble of two 3D networks + one 2D network in PyTorch, explicitly aimed at reducing false positives vs. radiologists. No web viewer or 3D rendering described — this is a model/inference pipeline, not a visualization demo — [devpost.com/software/deepbrainseg](https://devpost.com/software/deepbrainseg)
- **TumorDetect Aid** (Devpost): a classification (tumor/no-tumor), not segmentation, project; team says they still need to confirm reliability for medical use — [devpost.com/software/tumordetect-aid](https://devpost.com/software/tumordetect-aid)
- **nvAI** (AI Unite Hackathon, GitHub: parthasdey2304/nvAI, forked as Ak-801/nvAI): React frontend + Flask API on Linode + CNN segmentation, reports 89% test accuracy. No 3D visualization evident from README — [github.com/parthasdey2304/nvAI](https://github.com/parthasdey2304/nvAI)
- **Brain Tumor Segmentation Using ResUNet** (McMedHacks, winner of "Best Segmentation/Detection Application"): ResUNet model, reports mean IoU of 90%; described as producing tumor masks, no mention of a 3D viewer or volumetrics UI — found via search snippet
- **Brain Tumour Segmentation App** (MAIS Hacks 2020): UNet + batch norm in PyTorch, served via Flask; a 2D web app for segmenting tumors in MRI images, no 3D component — found via search snippet
- **CNN based brain tumor diagnosis** (Skynet Hacks v2 winner): classification only (tumor vs. non-tumor), not segmentation — found via search snippet
- Devmesh/platformOS lists a "Brain Tumor Segmentation" project but detail could not be retrieved in this research pass — [devmesh.platformos.com/projects/brain-tumor-segmentation](https://devmesh.platformos.com/projects/brain-tumor-segmentation) (unverified, gap)

### Inferences
- The overwhelming majority of hackathon/student brain-tumor-segmentation projects stop at "train a model, show Dice/IoU/accuracy in a writeup, maybe serve 2D slice output through Flask/Streamlit/Reflex." Only MindView (2026) reaches toward the full target feature set (interactive 3D + volumetrics), and even it omits linked 2D crosshair MPR and Dice/sensitivity reporting.
- This suggests that a prototype genuinely combining (a) pretrained BraTS multi-sequence inference, (b) 3D marching-cubes mesh of WT/TC/ET, (c) synchronized/linked 2D MPR crosshair views, AND (d) visible Dice/sensitivity + volume reporting, all in one browser demo, would be a meaningfully novel combination relative to found prior art — no single found project does all four together.

### Gaps
- Could not verify Devmesh's "Brain Tumor Segmentation" project details.
- Could not confirm whether MindView's `monai_brats_bundle` folder actually uses official BraTS-pretrained weights vs. a model merely trained on BraTS-formatted data by the team themselves.
- Devpost's own search/gallery UI could not be queried directly (pages returned 403 to automated fetch), so this list relies on web-search-engine indexing of Devpost pages rather than a direct gallery browse — some relevant hackathon submissions for "BraTS"/"NeuroScope" keyword specifically may not have been surfaced if they are not well-indexed by the external search engine.
- No project named "NeuroScope" matching the medical imaging context was found at all.

## Academic lab web demo pages (university radiology/CS labs) hosting live or video-demoed brain tumor segmentation + visualization

### Takeaway
Found desktop-software research tools (3D Slicer-based) with strong academic pedigree, but no browser-hosted live web demo from a university lab specifically for BraTS tumor segmentation + visualization together.

### Cited Findings
- **3D Slicer-based tools** are the dominant academic answer, but they are desktop applications, not web demos:
  - "3D Slicer as a tool for interactive brain tumor segmentation" (Harvard SPL/NAC) — paper states "the innovation in this work lies not in the algorithm, but in the accessibility of the algorithm" — [nac.spl.harvard.edu/publications/3d-slicer-tool-interactive-brain-tumor-segmentation](https://nac.spl.harvard.edu/publications/3d-slicer-tool-interactive-brain-tumor-segmentation)
  - **Slicer-DeepSeg** (2021 paper + GitHub github.com/razeineldin/Slicer-DeepSeg) — a customized GUI for brain tumor segmentation using deep learning, built as a 3D Slicer extension
  - **SlicerBatchBrainMRTumorSegmentation** (2024 SoftwareX paper) — a Python-scripted 3D Slicer module for automated batch brain tumor segmentation across many patients
- **CBICA Brain Tumor Viewer (BTV)**, University of Pennsylvania (NITRC) — a lightweight viewer for multimodal MRI volumes; maintainers note it has been "superceded by the Cancer Imaging Phenomics Toolkit (CaPTk) Console," i.e., it is a legacy/retired desktop tool, not an active web demo — [nitrc.org/projects/cbica_btv](https://nitrc.org/projects/cbica_btv)
- **Brainchop** (github.com/neuroneural/brainchop; JOSS paper, DOI 10.21105/joss.05098; arXiv 2310.16162) is the closest thing to an active, browser-hosted, client-side academic neuroimaging tool, but it does general brain parcellation/masking/GWM segmentation — NOT tumor segmentation, and NOT BraTS. It runs TensorFlow.js models fully client-side (privacy-preserving), with Three.js for 3D volume rendering and Papaya for other views. It reports a macro Dice of 0.96 for its GWM models, but no tumor volumes — [ar5iv.labs.arxiv.org/html/2310.16162](https://ar5iv.labs.arxiv.org/html/2310.16162)

### Inferences
- Academic labs working on brain tumor segmentation overwhelmingly publish either (a) a 3D Slicer plugin/extension (desktop, not browser) or (b) a paper describing a method with no interactive viewer at all. The "browser + interactive" pattern used by Brainchop exists in academia, but for general neuroanatomy, not tumors — suggesting the BraTS-plus-browser-3D combination is comparatively unexplored even in formal academic tooling, not just hackathons.

### Gaps
- Did not find any university lab page with a live, hosted (not just video-demoed) web app specifically for BraTS tumor segmentation + visualization.
- Did not locate any video-demo-only academic project (e.g., a YouTube-hosted lab demo) specifically matching the criteria; this avenue needs a more targeted video-platform search if still needed.

## Is there a project doing BOTH live 3D marching-cubes mesh rendering AND synchronized MPR crosshair 2D viewing AND visible volumetric calculation, together, in-browser, for brain tumors?

### Takeaway
No. The closest match (Safe Mind/NeuroView) claims 3D marching-cubes rendering plus synchronized axial/sagittal/coronal slices as feature-list items, but tumor segmentation accuracy/volumetrics are unverified and the project's source/demo could not be directly inspected. MindView has 3D mesh rendering and visible volume computation, but no linked 2D crosshair MPR views. No project combines all three with verifiable code/demo.

### Cited Findings
- (See above citations for Safe Mind/NeuroView and MindView — repeated here for this specific synthesis question.) Safe Mind/NeuroView: Three.js 3D mesh (scikit-image marching_cubes) + stated "synchronized axial, sagittal, and coronal slice views" — feature list only, unverified in running code — [devpost.com/software/safe-mind](https://devpost.com/software/safe-mind)
- MindView: React Three Fiber 3D mesh (skimage-based mesh conversion) + computed/visualized tumor volume and position — no 2D MPR crosshair feature mentioned — [github.com/GarfieldFluffJr/MindView](https://github.com/GarfieldFluffJr/MindView)

### Inferences
- If Safe Mind/NeuroView's feature list is accurate and functional, it would be the closest/only match for the full three-part combination, but this cannot be confirmed from available sources (Devpost page blocked automated access with HTTP 403; no GitHub repo located; hosted demo returned 404). Treat this as unverified prior art, not confirmed prior art.
- Absent that caveat, no verified project does all three (3D mesh + linked crosshair MPR + visible volumetrics) for brain tumors in-browser. This is a genuine gap in current prototype-level prior art.

### Gaps
- Direct inspection of Safe Mind/NeuroView source code or a working demo was not possible in this research pass (access blocked, repo not found, demo link dead). A follow-up with direct GitHub code search (`site:github.com safe-mind` or `site:github.com neuroview brain`) or direct Devpost browsing (not blocked) would be needed to fully confirm or refute this as real prior art.

## Papers/demos on test-time augmentation uncertainty / confidence-map visualization shown interactively in a web 3D viewer for medical segmentation

### Takeaway
No interactive, browser-based 3D viewer for TTA/uncertainty maps in medical segmentation was found. All uncertainty-visualization tools found are desktop applications (napari, 3D Slicer extensions) or paper/poster figures, not live web 3D demos.

### Cited Findings
- A Helmholtz/DLR-affiliated 2025 poster describes computing pixel-wise uncertainty via test-time augmentation, Monte-Carlo dropout, and softmax entropy, and mentions "an interactive interface for visualizing uncertainty maps" — but the abstract does not specify whether this interface is browser-based or what it's built on — [events.hifis.net/event/2061/contributions/16912/contribution.pdf](https://events.hifis.net/event/2061/contributions/16912/contribution.pdf)
- **VessQC** (github.com/MMV-Lab/VessQC) — an uncertainty visualization tool for 3D microscopy (not clinical/BraTS imaging), implemented as a **napari plugin** (desktop Python viewer, not a browser app); reports that uncertainty-guided correction improved error-detection recall from 67% to 94.0% in a preliminary study
- **FastSAM-3DSlicer** — an interactive 3D medical segmentation extension for 3D Slicer (desktop) including an uncertainty quantification scheme; not confirmed to use TTA specifically, and not browser-based
- Foundational TTA-uncertainty method paper: Wang et al. (arXiv 1807.07356) established that TTA-based aleatoric uncertainty estimation outperforms test-time-dropout-based model uncertainty alone for brain MRI segmentation — this is a methods paper with static figures, not an interactive viewer — [arxiv.org/abs/1807.07356v2](https://arxiv.org/abs/1807.07356v2)
- "ProbExplorer: Uncertainty-guided Exploration and Editing of Probabilistic Medical Image Segmentation" (Eurographics/diglib.eg.org) appears directly relevant by title but could not be fully reviewed in this pass to confirm whether it is browser-based or desktop — [diglib.eg.org/items/8222b237-fbce-497f-8f83-2ea0966133bb/full](https://diglib.eg.org/items/8222b237-fbce-497f-8f83-2ea0966133bb/full)

### Inferences
- Interactive uncertainty visualization for medical segmentation is an active research area, but tooling consistently lands on desktop platforms (napari, 3D Slicer) rather than browser/web deployments. A browser-based, interactive TTA/confidence-map 3D viewer for brain tumors appears to be unaddressed prior art — a potentially novel angle.

### Gaps
- Did not fully review the ProbExplorer paper's implementation platform (web vs. desktop) — this is the one lead worth a follow-up fetch if this question is high-priority.
- Did not find any BraTS-specific uncertainty visualization demo (all found tools are either generic medical imaging or non-brain, e.g., VessQC is microscopy).

## Overall summary of closest matches and explicit gap statement

### Takeaway
No project found implements the full requested pipeline (upload 4 NIfTI sequences → pretrained BraTS model inference → WT/TC/ET 3D mesh + linked 2D slices + volumes + Dice/sensitivity, all in a browser). The closest partial matches are: **MindView** (DeltaHacks 2026) for 3D mesh + volume computation with a fine-tuned MONAI model, and the unverified **Safe Mind/NeuroView** hackathon project for the combination of 3D mesh + synchronized multi-planar slices. Both are hackathon-grade with significant gaps relative to the full target feature set, and neither reports Dice/sensitivity. This supports treating the requested NeuroScope 3D demo as filling a genuine, specific gap in public prototype-level prior art.

### Cited Findings
(See individual sections above for full citation list.)

### Inferences
- A credible positioning for a new NeuroScope-style project: it would be the first found public prototype to combine pretrained-BraTS-model inference, 3D WT/TC/ET surface meshes, linked 2D MPR crosshair views, AND visible Dice/sensitivity + volumetric reporting in one browser session — each individual piece has precedent somewhere, but no found project combines all of them.

### Gaps
- This conclusion is bounded by the ~15-tool-call research budget and search-engine indexing limits (Devpost's own site blocked direct fetch, GitHub code search was not directly queryable as a dedicated tool in this pass — only via general web search). A dedicated GitHub code-search pass (e.g., via `gh` CLI or GitHub's own search UI) for exact phrase combinations like "BraTS" + "crosshair" or "BraTS" + "marching cubes" could still surface something not indexed by the general web search tool used here.
