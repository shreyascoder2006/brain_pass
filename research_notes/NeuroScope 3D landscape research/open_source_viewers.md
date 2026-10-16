# Open-Source Brain MRI / Tumor Segmentation Visualization Tools and Viewers

## What does 3D Slicer (plus BraTS/tumor extensions, SlicerRT, Radiomics) actually provide out of the box? Web-based or desktop?

### Takeaway
3D Slicer is a desktop-only (Windows/Mac/Linux) application; it is not browser-based. Core Slicer provides generic 3D visualization/segmentation tooling but no built-in brain-tumor-specific AI model — tumor segmentation requires community extensions (e.g., Slicer-DeepSeg), which are experimental and of uncertain current maintenance status.

### Cited Findings
- 3D Slicer core repo (github.com/Slicer/Slicer) had approximately 2,150 stars, 652 forks, 633 open issues, with a last push dated October 28, 2025, per a third-party GitHub tracker snapshot — [gittrend/ecosyste.ms via search](https://summary.ecosyste.ms/projects/356202)
- Slicer-DeepSeg is described by its authors as "the first publicly available open-source 3D Slicer extension for automatic brain tumour segmentation using self-contained deep learning methods," validated on a public high-grade-glioma dataset, running inference locally (not cloud) — [Slicer-DeepSeg (cris.fau.de)](https://cris.fau.de/publications/293043838), code at github.com/razeineldin/Slicer-DeepSeg
- A Slicer user forum report shows Slicer-DeepSeg throwing a "Failed to compute results: Incomplete or corrupted file detected" hash-verification error on BraTS 2020 data when pressing Apply, indicating installation/model-download fragility — [Slicer Discourse](https://discourse.slicer.org/t/slicer-deepseg-issue/24786)
- A separate community extension, "Brain-Tumor-Segmentation-on-3D-Slicer," trained on BraTS 2018, was reported by users to crash on Ubuntu and throw Python errors on Windows 11, with "results not so good" on non-benchmark data — [Slicer Discourse](https://discourse.slicer.org/t/did-anyone-try-to-install-brain-tumor-segmentaion-on-3d-slicer-extension/35614)
- An older Supervised Segmentation Toolbox extension uses classical ML (e.g., Random Forest) rather than deep learning, tested on the original BraTS challenge data — [VUT thesis repository](https://dspace.vut.cz/items/34e31ae3-31b6-4078-9571-64f2889d3323/full)
- SlicerRT (radiation therapy extension) has approximately 151 stars/66 forks on a third-party tracker, with last push dated April 13, 2026, and provides close to 20 modules including deformable registration via Plastimatch — [gittrend.io](https://gittrend.io/repo/SlicerRt/SlicerRT), [slicer.org SlicerRT docs](https://www.slicer.org/wiki/Documentation/Nightly/Extensions/SlicerRT)
- SlicerRadiomics is the official 3D Slicer interface to the pyradiomics library, distributed via the Extension Manager — [SlicerRadiomics GitHub README](https://github.com/AIM-Harvard/SlicerRadiomics/blob/master/README.md), [slicer.org Radiomics docs](https://slicer.org/wiki/Documentation/Nightly/Extensions/Radiomics)
- MONAI Label's primary desktop-viewer integration is via a 3D Slicer plugin, installed through the Slicer Extension Manager — [MONAI Label PyPI release notes](https://pypi.org/project/monailabel/0.2.0)

### Inferences
- Tumor segmentation within the Slicer ecosystem is not a first-party, polished capability — it depends on third-party extensions with documented bugs/crashes, suggesting it is not production-ready out of the box.
- Slicer's strength is as a flexible desktop research platform (visualization, registration, radiomics, RT planning) rather than a ready tumor-segmentation product.

### Gaps
- Could not confirm current (2025–2026) maintenance status/last-release date of SlicerRadiomics or the specific "Brain-Tumor-Segmentation-on-3D-Slicer" repo.
- No confirmation of any web/browser deployment mode for 3D Slicer — all evidence points to desktop-only.

## What is MONAI Label and MONAI's own web demos — does MONAI ship a browser-based viewer, or is it purely a training/inference framework requiring a separate viewer?

### Takeaway
MONAI Label is a server-client annotation framework (Apache-2.0) that exposes AI models via REST API; it has no built-in viewer of its own — it plugs into existing third-party viewers (3D Slicer desktop, OHIF web, MITK, plus QuPath/DSA/CVAT for pathology). For a browser-based workflow, MONAI Label requires OHIF plus a DICOMweb server (e.g., Orthanc); OHIF's scribbles-based annotation was noted as unsupported in at least one release.

### Cited Findings
- MONAI Label repo (github.com/Project-MONAI/MONAILabel): 904 stars, 275 forks, 19 watchers, Apache-2.0 license, 164 open issues, 20 open PRs, 1,041 commits on main; no release/date metadata visible on the page — [GitHub MONAILabel](https://github.com/Project-MONAI/MONAILabel)
- MONAI Label is "an intelligent open source image labeling and learning tool" — a Python server exposing medical AI models via REST API, integrating as a plug-in with existing open-source viewer clients (3D Slicer, OHIF, MITK for radiology; QuPath, DSA, CVAT for pathology/video) — [GitHub MONAILabel README](https://github.com/Project-MONAI/MONAILabel), [third-party overview, noze.it](https://www.noze.it/en/insights/monai-label-ai-annotation/)
- OHIF integration requires an Orthanc DICOMweb server to be installed first; NIFTI files need conversion to DICOM (suggested tool: PlastiMatch); the served viewer runs locally at port 8000 under `/ohif/` — [MONAI Label release notes, PyPI](https://pypi.org/project/monailabel/0.2.0)
- At least one release noted OHIF does not yet support Scribbles-based annotations (a MONAI Label interactive-annotation feature available in the Slicer plugin) — [MONAI Label PyPI release notes](https://pypi.org/project/monailabel/0.2.0)

### Inferences
- MONAI (the broader project) is fundamentally a model-training/inference framework, not a viewer; any "demo" capability is contingent on wiring up a separate viewer (OHIF for web, Slicer for desktop) plus a DICOM server for the web path — a non-trivial deployment, not a drag-and-drop browser experience.
- The web (OHIF) path for MONAI Label is functionally behind the desktop (Slicer) path in annotation feature parity.

### Gaps
- Could not find a standalone "MONAI web demo" that ships its own browser viewer independent of OHIF/Slicer.
- Could not confirm current release cadence/last commit date for MONAI Label in 2025–2026 (GitHub page did not expose dated commit/release info in this capture).

## What do ITK-SNAP and MITK provide for 3D tumor segmentation and visualization? Desktop or web?

### Takeaway
Both ITK-SNAP and MITK are desktop-only applications (Windows/Mac/Linux) with no browser/web deployment found in any source. ITK-SNAP (GPLv3) supports semi-automatic multi-modality tumor segmentation with a linked cursor for 3D navigation and was validated on BRATS 2013 data; MITK (BSD 3-clause) offers a general-purpose Workbench with interactive 3D/4D/volume rendering but no confirmed tumor-specific workflow.

### Cited Findings
- ITK-SNAP is open-source under GNU GPL v3.0, cross-platform (Windows/Mac/Linux) — [LinuxLinks ITK-SNAP listing](https://www.linuxlinks.com/itk-snap-multi-platform-medical-image-segmentation-application/)
- ITK-SNAP supports semi-automatic segmentation across multi-modality MRI (T1, T2, FLAIR) and was evaluated on the MICCAI 2013 Multi-Modal Brain Tumor Segmentation Challenge (BRATS) reference dataset — [paper, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5493443)
- ITK-SNAP uses a "linked cursor for seamless 3D image navigation" per feature listing — [LinuxLinks ITK-SNAP listing](https://www.linuxlinks.com/itk-snap-multi-platform-medical-image-segmentation-application/)
- MITK is distributed under a 3-clause BSD license, officially supporting Linux, macOS, Windows — [docs.mitk.org](https://docs.mitk.org/latest/)
- MITK Workbench is a "ready-to-use application for viewing, processing, segmenting, and registering medical image data," offering interactive slice views, 3D visualization, 4D rendering, and volume rendering — [LinuxLinks MITK listing](https://www.linuxlinks.com/mitk-medical-imaging-interaction-toolkit/)
- MONAI Label lists MITK as one of its three radiology-viewer integration targets alongside 3D Slicer and OHIF — [noze.it overview](https://www.noze.it/en/insights/monai-label-ai-annotation/)

### Inferences
- Neither tool has any browser/web deployment mode; both require local installation.
- MITK's BSD license is more permissive for commercial reuse than ITK-SNAP's GPLv3, which is a material consideration if building a commercial product on top of either codebase.

### Gaps
- Could not confirm a tumor-specific MITK workflow/module (no source directly described one).
- Could not obtain current GitHub star counts or last-release dates for either project within the tool-call budget.

## What is NiiVue specifically capable of out of the box? Does it do linked MPR + 3D rendering + crosshair sync natively? What is it missing?

### Takeaway
NiiVue is a lightweight, browser-based (WebGL2) viewer supporting 30+ volume/mesh/tractography formats, embedded in projects like AFNI, FSL Clinical, and OpenNeuro; it is BSD-2-Clause licensed with roughly 499 stars. Direct documentation confirming native linked-MPR crosshair synchronization could not be retrieved (docs site had broken/redirected links), though changelog entries referencing "multi planar layout" and "avoid syncing with itself" suggest some multiplanar sync mechanism exists. NiiVue does not do AI inference, volumetric/region reporting, or (per available docs) explicit marching-cubes mesh extraction — it is a visualization library, not an analysis or AI tool.

### Cited Findings
- NiiVue: "a WebGL2 based medical image viewer. Supports over 30 formats of volumes and meshes," running on phones, tablets, and computers — [GitHub niivue/niivue](https://github.com/niivue/niivue)
- Format support includes NIfTI, NRRD, MRtrix MIF, AFNI, MGH/MGZ, ITK MHD, ECAT7, DSI-Studio SRC (volumes); GIfTI, FreeSurfer, PLY, OBJ, STL, VTK (meshes); TCK, TRK, TRX, TSF, TT (tractography); DICOM/MINC/TIFF via plugins — [GitHub niivue/niivue](https://github.com/niivue/niivue)
- License: BSD-2-Clause. Stars: 499 (125 forks, 13 watching), 3,743 commits on the repo as captured — [GitHub niivue/niivue](https://github.com/niivue/niivue)
- The project states it "is moving to niivue/mono," a rewrite adding WebGPU support alongside WebGL2, which will become the v1.0.0 release candidate — implying the current repo is in a transition/legacy-maintenance phase — [GitHub niivue/niivue](https://github.com/niivue/niivue)
- A NiiVue GitHub issue (#992) on view synchronization: a pan gesture on one canvas unintentionally propagated to a second independent canvas on the same demo page; the demo includes a 2D/3D zoom-sync checkbox, and a maintainer discussed possible zoom-center behaviors including "following the crosshair" — [GitHub niivue/niivue issue 992](https://github.com/niivue/niivue/issues/992)
- A Zenodo-archived NiiVue v0.41.0 changelog lists a pull request titled "Specify multi planar layout" and another "avoid syncing with itself," without further mechanism detail — [Zenodo record](https://zenodo.org/records/10845224)
- Brainchop (a separate project, see below) explicitly builds its 3D rendering on top of NiiVue plus three.js, indicating NiiVue is used by at least one AI-segmentation project as the viewer layer — [GitHub neuroneural/brainchop](https://github.com/neuroneural/brainchop)

### Inferences
- NiiVue appears to support some form of multiplanar/crosshair synchronization (referenced in its own changelog and demo code) but this could not be verified in detail from official docs within the research budget — flag as needing direct source-code/docs confirmation before citing specifics (e.g., exact API) in the final report.
- NiiVue is explicitly a rendering/visualization library; nothing in any retrieved source indicates it performs AI inference, computes region volumes, or exposes a marching-cubes mesh-extraction API — these would need to be built on top of it (as Brainchop does, pairing NiiVue with a separate tfjs inference pipeline and three.js for extra rendering).

### Gaps
- Could not directly access NiiVue's official docs/features page (niivue.github.io/niivue/features.html redirected to niivue.com/features.html, which returned HTTP 404 in this session) — the precise, current feature list and crosshair-sync API are unconfirmed from primary docs.
- No confirmed last-commit/last-release date for niivue/niivue found (Releases section appeared empty in the fetched snapshot).
- No evidence either way on built-in marching-cubes/mesh-extraction-from-volume capability (as opposed to loading pre-made mesh files, which is confirmed).

## What do OHIF Viewer, Papaya, and MRIcroGL/MRIcroWeb provide? Are any combined with a segmentation AI backend in real deployments?

### Takeaway
OHIF is an actively larger, MIT-licensed, web-based (progressive web app) viewer with confirmed MPR and 3D/MIP rendering, used as MONAI Label's browser-based integration target — it is purely a viewer (no built-in AI) and relies on external model servers for any AI segmentation. Papaya is a smaller, BSD-licensed, pure-JS orthogonal (2D multiplanar) web viewer with unclear 3D/mesh rendering and unclear current maintenance. MRIcroGL is a BSD-licensed, GPU-accelerated desktop (not web) 3D/2D viewer; MRIcroWeb is a distinct, unofficial, browser-based WebGL2 NIfTI volume renderer (not from the original MRIcroGL author, rordenlab) that is explicitly modeled on MRIcroGL's functionality.

### Cited Findings
- OHIF Viewer repo: ~4.4k stars/4.4k forks, MIT license, 7,471 commits on master (no visible release dates in this capture) — [GitHub OHIF/Viewers](https://github.com/OHIF/Viewers)
- OHIF is described as "a configurable and extensible progressive web application with out-of-the-box support for image archives which support DICOMweb"; features include 2D/3D viewing, Multiplanar Reconstruction (MPR), Maximum Intensity Projection (MIP), segmentation rendering (labelmaps/contours), DICOM SEG rendering/export, and a volume-rendering demo — [GitHub OHIF/Viewers](https://github.com/OHIF/Viewers)
- OHIF's UI is built with React and Tailwind CSS and uses Cornerstone3D for rendering — [search synthesis citing OHIF docs](https://v3p8.docs.ohif.org/)
- OHIF itself does not run AI models; MONAI Label plugs AI segmentation into OHIF via its server/plugin architecture — [MONAI Label PyPI release notes](https://pypi.org/project/monailabel/0.2.0)
- Papaya repo: 584 stars, 207 forks, 38 watching, 1,121 commits, 47 open issues, 1 open PR; license unconfirmed from the repo page itself (BSD license confirmed via SciCrunch registry entry) — [GitHub rii-mango/Papaya](https://github.com/rii-mango/Papaya), [SciCrunch SCR_014188](https://rrid.site/resolver/SCR_014188)
- Papaya is "a pure JavaScript medical research image viewer, supporting DICOM and NIFTI formats," described as an "orthogonal viewer" supporting overlays, atlases, GIFTI and VTK surface data, and DTI data via a `surfaces` parameter — [GitHub rii-mango/Papaya README](https://github.com/rii-mango/Papaya), [SciCrunch SCR_014188](https://rrid.site/resolver/SCR_014188)
- The R wrapper package `papayar` is GPL-3 licensed — this applies to the wrapper, not to Papaya's core JS license — [rdrr.io papayar](https://rdrr.io/cran/papayar/)
- MRIcroGL (rordenlab) performs GPU-accelerated 3D rendering plus 2D slices, with statistical-map overlays, clipping/cutout tools, mosaic views, atlas templates, and DICOM-to-NIfTI conversion; runs on Linux/macOS/Windows; requires an OpenGL 2.1-capable GPU; BSD-licensed — [LinuxLinks MRIcroGL listing](https://linuxlinks.com/mricrogl-3d-medical-viewer), [GitHub rordenlab/MRIcroGL12](https://github.com/rordenlab/MRIcroGL12)
- MRIcroWeb (github.com/hdary/MRIcroWeb) is a distinct, non-rordenlab repository described as a "NIfTI WebGL Volume Rendering" project that opens/displays NIfTI images in-browser using WebGL2, aiming to offer similar functions to MRIcroGL; it computes volume-intensity gradients to isolate tissue boundaries; noted limitation is that WebGL2 (and thus this tool) does not yet work on iOS Safari — [search result citing github.com/hdary/MRIcroWeb](https://github.com/hdary/MRIcroWeb)

### Inferences
- Of the three, OHIF is the most feature-complete, most actively developed, and most directly paired with real AI-segmentation deployments (via MONAI Label) — it is the closest existing building block for a "web viewer + AI backend" product, though it still requires assembling a DICOMweb server and a separate model-serving layer.
- Papaya and MRIcroWeb appear to be smaller/less-active projects better suited as lightweight embeddable viewers than as a foundation for a full AI-segmentation product.

### Gaps
- Could not confirm OHIF's or Papaya's exact last-release/last-commit date (no dated metadata surfaced in captured pages).
- Could not confirm whether Papaya performs true 3D surface/volume rendering versus only 2D orthogonal multiplanar display with mesh-file loading.
- Could not independently verify MRIcroWeb's current maintenance status, star count, or license.

## Existing open-source web demos/repos combining a BraTS-trained model with a browser-based 3D + linked-slice viewer, volumetric reporting, or uncertainty visualization

### Takeaway
The closest confirmed, publicly-codeable match is **Brainchop** (github.com/neuroneural/brainchop) — a mature, actively documented open-source project that runs deep-learning volumetric MRI segmentation entirely client-side in the browser (TensorFlow.js) and renders results in 3D using NiiVue + three.js — but it is a general-purpose brain-segmentation tool (built around lightweight MeshNet models for brain masking, gray/white-matter, and ~50/104-region cortical/subcortical atlases), not a BraTS-specific tumor-segmentation tool; a confirmed pretrained tumor model within brainchop's own model menu could not be found. No fully public, polished, BraTS-trained-model + 3D-browser-viewer combination (e.g., using SegResNet, nnU-Net, or Swin UNETR specifically) was found; several partial/broken attempts exist on Hugging Face Spaces.

### Cited Findings
- Brainchop "brings automatic 3D MRI volumetric segmentation capability to neuroimaging by running a lightweight deep learning model (e.g., MeshNet) in the web-browser for inference on the user side" — [GitHub neuroneural/brainchop](https://github.com/neuroneural/brainchop), confirmed by its JOSS paper — [JOSS paper](https://joss.theoj.org/papers/10.21105/joss.05098.pdf)
- Brainchop repo stats: 545 stars, 65 forks, 8 watchers, 610 commits, 7 open issues, 2 open PRs, MIT license; live demo shown at v4.1.0 (no explicit last-commit date surfaced) — [GitHub neuroneural/brainchop](https://github.com/neuroneural/brainchop)
- Brainchop's rendering stack combines the NiiVue viewer with three.js for 3D display of segmentation output; inference code is "pure javascript" via TensorFlow.js — [GitHub neuroneural/brainchop](https://github.com/neuroneural/brainchop)
- Brainchop's MeshNet models were trained in PyTorch using Human Connectome Project (HCP) data with FreeSurfer-derived labels; pretrained models cover brain masking, gray-matter/white-matter (GMWM) segmentation (model sizes as small as 0.89 MB / 0.022 MB), plus atlas models for 50 cortical regions and 104 cortical+subcortical structures — [Brainchop arXiv paper](https://arxiv.org/pdf/2310.16162), [JOSS paper](https://joss.theoj.org/papers/10.21105/joss.05098.pdf)
- A separate paper (Aperture Neuro) states brainchop "offers a simple mechanism for distributing models for additional image processing tasks, including registration and identification of abnormal tissue, including tumors, lesions and hyperintensities" — this describes extensibility/capability, not a confirmed shipped tumor model — [Aperture Neuro paper](https://apertureneuro.org/article/123059.pdf)
- A 2025 IEEE ISCAS paper describes an (apparently not-open-sourced) web application where users upload four MRI modalities and a "3D CATBraTS" CNN-ViT model segments whole tumor / enhancing tumor / tumor core, with results shown as 3D plots; no public code link was found — [ISCAS 2025 paper PDF](https://westminsterresearch.westminster.ac.uk/download/dfb3527ff6e1c90ce382071cd1cfc4d0c87e774d29489c61eea9d4f326c681fb/1577871/ISCAS_2025_Paper.pdf)
- A Hugging Face Space, "farahhamad/brats-segmentation," implements a BraTS2020 pipeline with a UNet3D model, FastAPI backend, and React frontend (commit log reports mean Dice 0.557 after 110 epochs); 3D rendering implementation could not be confirmed from available files — [Hugging Face Space files](https://huggingface.co/spaces/farahhamad/brats-segmentation/blob/main/frontend/src/App.css)
- Other Hugging Face Spaces found ("tp53/oncoseg-api," "ClassCat/Brain-tumor-3D-segmentation-with-MONAI" and its duplicate "Naati101," "A-PolarBear/brain_tumor_segmentation," "dagmawi101/Brain-tumor-3D-segmentation") were either showing Runtime errors at the time of search, used stubbed/demo model outputs, or were 2D-slice-only tools rather than true 3D viewers — [Hugging Face Spaces, multiple, see search result](https://huggingface.co/spaces/A-PolarBear/brain_tumor_segmentation/blame/main/app.py)
- BraTS-derived data itself (via Medical Segmentation Decathlon) is released under CC-BY-SA 4.0, relevant for any derivative demo's licensing — [MathWorks Volume Viewer doc](https://www.mathworks.com/help/images/explore-3-d-labeled-volumetric-data-with-volume-viewer-app.html)
- No GitHub project was found that explicitly combines nnU-Net or Swin UNETR with a browser-based 3D viewer; MONAI's own SegResNet tutorial for brain-tumor segmentation visualizes results via Weights & Biases (a hosted ML-experiment dashboard), not a standalone clinical-style 3D browser viewer — [MONAI/W&B tutorial](https://docs.wandb.ai/tutorials/monai_3d_segmentation)
- A BrainAR paper describes a research system that integrates segmentation output into a real-time 3D engine with server-side, patient-specific online inference, including AR visualization, but no public repository was found — [BrainAR, research-portal.uws.ac.uk](https://research-portal.uws.ac.uk/en/publications/brainar-automated-brain-tumor-diagnosis-with-deep-learning-and-3d/)
- DeepBrainSeg is a GitHub repo implementing an ensemble of 2D/3D fully convolutional networks for brain tumor segmentation; no browser-demo or viewer component was found associated with it — [search result referencing DeepBrainSeg]

### Inferences
- There is no mature, actively maintained, open-source repo that cleanly combines a modern BraTS-SOTA architecture (nnU-Net/SegResNet/Swin UNETR) with a polished browser-based linked-MPR + 3D viewer, volumetric reporting, and uncertainty visualization — this appears to be a genuine gap in the open-source landscape as of October 2026.
- Brainchop is the strongest existing architectural template for "runs entirely in-browser, 3D-renders results via NiiVue+three.js" even though its own pretrained models target brain masking/GM-WM/atlas segmentation rather than tumors — a tumor-specific product would likely need to either (a) train/convert a tumor model into Brainchop's TF.js pipeline, or (b) build a new server-side-inference + NiiVue/OHIF-based web frontend from scratch.
- Volumetric reporting (e.g., automatic region/tumor-volume computation and display) and uncertainty visualization were not confirmed as implemented in ANY of the open-source tools surveyed (Slicer extensions, MONAI Label, NiiVue, Brainchop, OHIF, Papaya, or the Hugging Face demos) — this is a second apparent gap.

### Gaps
- Could not confirm whether the ISCAS 2025 "3D CATBraTS" web app has any public code release — treat as a research prototype, not an available open-source tool.
- Could not verify current (live/working) status of any of the Hugging Face brain-tumor Spaces found; several showed Runtime errors at time of search and may be non-functional.
- No source found addressing uncertainty visualization (e.g., Monte Carlo dropout maps, ensemble-variance overlays) in any browser-based brain tumor tool.
- No source found describing automated "provenance report" generation (e.g., PDF/structured report of segmentation inputs, model version, confidence) in any of the surveyed open-source web tools.

## Are there any existing lightweight "drag in 4 NIfTI files, get instant 3D tumor segmentation in the browser" demos/products? If yes, how complete are they?

### Takeaway
No fully complete, production-ready product matching this exact description (upload 4 BraTS-style modalities, get instant AI tumor segmentation, view in 3D, entirely in-browser) was found. The closest functioning analog is Brainchop, which achieves the "drag a NIfTI file in, get instant in-browser 3D segmentation" workflow but for general brain structures/masks rather than tumors specifically and typically for a single volume rather than 4 co-registered modalities; several Hugging Face tumor-segmentation demos attempt the BraTS 4-modality tumor workflow but rely on a server-side backend (not pure in-browser inference) and multiple were found non-functional (Runtime errors) at time of search. None of the tools found do uncertainty quantification, provenance/audit reporting, or fail-safe input validation.

### Cited Findings
- Brainchop's workflow is "drag/upload a volume, run a selected lightweight pretrained model (MeshNet-based) entirely client-side via TensorFlow.js, see the 3D segmentation rendered via NiiVue+three.js" — this is the most complete "instant in-browser" implementation found, but operates on a single volume, not the 4-modality BraTS input format, and its documented models target brain masking/GM-WM/atlas parcellation, not tumors — [GitHub neuroneural/brainchop](https://github.com/neuroneural/brainchop), [JOSS paper](https://joss.theoj.org/papers/10.21105/joss.05098.pdf)
- The Hugging Face Space "farahhamad/brats-segmentation" (FastAPI backend + React frontend, UNet3D on BraTS2020, reported mean Dice 0.557) represents an attempt at the described workflow but uses a server-side Python backend for inference rather than in-browser inference, and its 3D-rendering implementation could not be confirmed as functional — [Hugging Face Space](https://huggingface.co/spaces/farahhamad/brats-segmentation/blob/main/frontend/src/App.css)
- Multiple other Hugging Face brain-tumor-3D-segmentation Spaces ("tp53/oncoseg-api," "ClassCat/Brain-tumor-3D-segmentation-with-MONAI," "Naati101/Brain-tumor-3D-segmentation-with-MONAI") were observed with Runtime errors on their Space pages, and at least one ("tp53/oncoseg-api") had a stub model that "generates demo output" rather than running a real model — [Hugging Face Spaces, see search citations above]
- None of the sources surveyed describe uncertainty visualization, provenance/audit reporting, or input fail-safe validation as implemented features in any of these lightweight demos.

### Inferences
- A genuinely complete "drag in 4 NIfTI files → instant AI tumor segmentation → linked 2D/3D browser viewing, with volumetric reporting and uncertainty" tool does not appear to exist yet in the open-source ecosystem as of October 2026 — every candidate found is either (a) a general (non-tumor) in-browser segmentation tool (Brainchop), (b) a research-paper prototype with no confirmed public code (3D CATBraTS web app, BrainAR), or (c) an incomplete/broken hobbyist demo (various Hugging Face Spaces).
- This represents a plausible market/product gap: combining Brainchop's "fully client-side TF.js inference + NiiVue 3D rendering" architecture with a BraTS-trained multi-modality tumor model, plus volumetric reporting and uncertainty overlays, does not currently exist as a shipped open-source tool.

### Gaps
- Could not confirm live/working status of any Hugging Face brain-tumor demo at present (search results show several in error states, and status can change without notice).
- Could not find any demo at all that ingests the standard 4-modality BraTS input set (T1, T1ce, T2, FLAIR) and performs fully client-side (in-browser) inference — all 4-modality attempts found use a server-side backend.
