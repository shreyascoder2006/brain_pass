# Commercial/Clinical AI Products for Brain Tumor MRI Segmentation and Visualization

## What does Brainlab Elements (Smartbrush / tumor segmentation / Elements Viewer) do for glioma/tumor contouring and 3D visualization? Is it desktop, cloud, or hybrid? What clinical use (surgical/radiotherapy planning)?

### Takeaway
Brainlab Elements is a modular, workstation-based (desktop/clinical-hardware) software suite for cranial/spine surgical and radiotherapy planning. Its two relevant tools are SmartBrush — an older, semi-automatic, user-guided contour-expansion tool used routinely for tumor outlining and volumetrics — and a newer "Elements AI Tumor Segmentation" module with FDA clearance for automatic cranial tumor (including glioma) segmentation. No evidence was found of a lightweight browser-based or cloud-native deployment; it is marketed as integrating into hospital planning workflows across departments.

### Cited Findings
- SmartBrush is described as a semi-automatic, user-guided, FDA-approved tumor-outlining program using contour expansion; current Brainlab marketing says it defines volumes from just two slices and supports quick, interactive outlining of cranial tumors and other structures across multiple modalities — [PLoS ONE study](https://doaj.org/article/705d1a650f02439999211abfb078f2b8) / [Brainlab product info via search](https://www.brainlab.com/radiosurgery-products/elements/multiple-brain-metastases/)
- In a 2016 PLoS ONE study (19 glioblastoma patients), SmartBrush segmentations by four expert raters had a mean Dice coefficient of 0.72–0.77, versus 0.68 for the fully automated BraTumIA tool, with significant differences between tools and raters — [PLoS ONE](https://doaj.org/article/705d1a650f02439999211abfb078f2b8)
- A 2019 Oncology Letters study states SmartBrush provides accurate, cross-sectional, diameter-based tumor-extent assessment and automated volume measurement of GBM, and is routinely used clinically for surgical planning and pre-/post-operative volumetric quantification; the same study found BraTumIA detected additional non-enhancing tumor regions missed by SmartBrush in 16 of 19 cases — [Spandidos Publications / Oncology Letters](https://www.spandidos-publications.com/10.3892/ol.2019.10734/download)
- Brainlab's newer "Elements AI Tumor Segmentation" is a distinct product from SmartBrush. FDA 510(k) K243633 reports validation on 412 patients (595 scans, 1,878 annotations) covering contrast-enhancing cranial tumors including gliomas, with mean Dice 0.75, mean precision 0.86, mean recall 0.85 — [FDA 510(k) K243633 via Innolitics](https://fda.innolitics.com/device/K243633)
- Brainlab marketing claims the AI tool can segment supported cranial tumors in under a minute — [FDA 510(k) summary / Brainlab marketing](https://fda.innolitics.com/device/K243633)
- A separate SmartBrush 510(k) (K250440) lists indications for [Angio, Spine] RT — current cranial glioma labeling should be separately verified — [FDA 510(k) K250440 via Innolitics](https://fda.innolitics.com/device/K250440)
- Brainlab Elements was introduced in 2013 as a suite of modular, "indication-specific" software applications for difficult-to-treat brain/spine cases, meant to complement (not replace) existing treatment planning systems; licensing scales from single licenses to multi-department deployments, with Elements modules "distributed dynamically across various workstations" — [Press release coverage](https://www.brainlab.com/press-releases/brainlab-showcases-elements-radiotherapy-planning-applications) / [itnonline.com, 2015](https://itnonline.com/node/68497)
- Early cranial Elements modules covered image fusion, MRI distortion correction, interactive segmentation of tumors and vascular structures, fiber tracking, dose review, and automatic segmentation of critical structures; a 2015 extension added automated SRS planning that generates conformal treatment plans across indications/sizes/shapes — [itnonline.com, 2015](https://itnonline.com/node/68497)
- Elements is also marketed for functional neurosurgery/stereotaxy (DBS, sEEG, biopsy), integrating into the surgeon's chosen delivery platform with advanced segmentation and white-matter tractography — [Brainlab press materials via search](https://brainlab.com/press-releases/brainlab-showcases-elements-radiotherapy-planning-applications)
- A sponsored case study (Scripps MD Anderson, San Diego) describes clinical use of Elements in a stereotactic radiosurgery program — [Physics World](https://physicsworld.com/a/automation-and-standardization-redefining-best-practice-in-stereotactic-radiosurgery/)

### Inferences
- Brainlab's architecture (workstation licenses distributed across departments) and absence of any found "cloud" or "web browser" messaging strongly suggest Elements is a desktop/clinical-workstation product (possibly with some data/license distribution infrastructure) rather than a lightweight browser SaaS tool.
- The coexistence of SmartBrush (semi-automatic, clinician-driven) and the newer AI Tumor Segmentation module (fully automatic, FDA-cleared with disclosed Dice/precision/recall) indicates Brainlab is transitioning from manual/semi-automatic contouring toward AI automation, but keeps the human-guided tool as the long-established clinical workhorse.

### Gaps
- Could not confirm from search results whether Brainlab offers any cloud or web-based component (e.g., for remote plan review) alongside the on-premises Elements Viewer.
- Could not independently verify current (2025/2026) FDA/CE labeling scope for SmartBrush specific to cranial glioma indications beyond the K250440 Angio/Spine RT listing found.
- No current (post-2021) primary-source detail on Elements Viewer's specific 3D rendering/interaction capabilities (desktop app features) was found; available sources are mostly press releases/sponsored content from 2013–2021.

---

## What does Quantib (quantib.com) offer for brain MRI AI around tumor volumetrics, and what regulatory clearance does it have?

### Takeaway
Quantib's cleared products (Quantib Brain / Quantib Brain 1.2 / Quantib ND) are FDA-cleared and CE-marked, but they are for general brain-tissue and white-matter-hyperintensity volumetry (neurodegeneration/atrophy workups), not tumor-specific segmentation — no evidence was found of a Quantib tumor/glioma product.

### Cited Findings
- Quantib Brain (original) was FDA-cleared under K173939 (decision date March 9, 2018); intended use is automatic labeling and volumetric measurement of brain tissue (grey matter, white matter, CSF) and white-matter-hyperintensity candidates, running as a plugin on GE Advantage Workstation platforms; clinical evidence was bench testing only (automatic vs. manual segmentation comparison, no prospective/retrospective clinical studies) — [FDA 510(k) K173939 via Innolitics](https://fda.innolitics.com/device/K173939)
- Quantib Brain 1.2 (an upgrade) adds longitudinal comparison of multiple MRI exams from the same patient, quantifying volume changes in brain tissue and white-matter hyperintensities — [Quantib news release](https://quantib.com/news/quantib-brain-1-2-cleared-for-u-s--market)
- Quantib ND (Neurodegenerative), the current flagship, is FDA-cleared under K213737 (with an earlier related 510(k) K182564 for a version on the Myrian platform), described by the vendor as FDA-cleared and CE-marked for atrophy quantification and white-matter-hyperintensity detection, with volumetric outputs compared to centile reference data drawn from the population-based Rotterdam Scan Study — [FDA 510(k) K213737 via Innolitics](https://fda.innolitics.com/device/K213737) / [Quantib ND product page](https://quantib.com/solutions/quantib-nd)
- The Quantib ND 510(k) summary reports Dice overlap against manual ground truth ranging from 0.78 (CSF) to 0.99 (cerebellum) for brain structures, and an average Dice of 0.61 ± 0.13 for white-matter hyperintensities; this is bench-level validation, not clinical outcome studies — [FDA 510(k) K213737 via Innolitics](https://fda.innolitics.com/device/K213737)

### Inferences
- Quantib's entire disclosed product line targets neurodegenerative/atrophy workups (dementia, MS-type white matter disease), not oncology; the company appears to have no glioma/tumor-specific clinical product.

### Gaps
- No CE certificate number, notified body, or exact CE scope per product version was found; Quantib's own page directs inquiries to services@quantib.com for availability by country.
- No evidence either way on whether Quantib has since (2023–2026) launched a tumor module; this should be checked directly against the current quantib.com site if confirmation is needed, as the most recent cited material (ND) predates verification of any newer product line.

---

## What does icometrix's icobrain offer for tumor-specific products or general brain MRI quantification, including volumetric/longitudinal tracking?

### Takeaway
icometrix's FDA-cleared icobrain products (icobrain cross / icobrain long) are for general segmentable brain-structure volumetry and longitudinal change detection — primarily framed for neurodegenerative disease — with no evidence of an icobrain tumor-specific product; the tumor-volumetry literature found during this research (BraTumIA) is an unrelated, separate tool, not confirmed to be an icometrix product.

### Cited Findings
- FDA filings describe icobrain as software for labeling and volumetric quantification of segmentable brain structures from MR images, consisting of two pipelines: icobrain cross (single time point) and icobrain long (change between two scans); icobrain long is restricted to MR images "acquired on the same scanner, with the same image acquisition protocol and with same contrast at two different timepoints," and results from icobrain cross cannot be compared with icobrain long results — [FDA filings via Innolitics (K181939, K161148, K180326)](https://fda.innolitics.com/device/K181939)
- A clearance summary states the software takes T1-weighted and FLAIR DICOM MR images (single or multiple timepoints) and outputs electronic reports (PDF/DICOM) with volumetric measures and segmentations overlaid on input images — [icometrix FDA filing via Innolitics](https://fda.innolitics.com/device/K181939)
- icometrix's own marketing describes icobrain as "the only software currently available that has been scientifically validated and clinically approved for longitudinal measurements" (a vendor claim, not independently verified) — [MassBio / press coverage](https://www.massbio.org/?p=16628)
- A separate, unrelated study found strong correlations (R = 0.83–0.96, p < 0.001) between BraTumIA (a fully automatic tumor segmentation tool) and human raters for contrast-enhancing and non-enhancing T2-hyperintense tumor compartments in 14 newly diagnosed glioblastoma patients, concluding automated longitudinal tumor segmentation could potentially substitute manual volumetric follow-up — [NCBI PMC4802217](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4802217/)
- GE HealthCare announced an agreement to acquire icometrix, describing icobrain as a platform for neurological disease analysis (e.g., Alzheimer's disease) — deal-closure status not found in search results — [Neuro News International / BioSpace coverage](https://neuronewsinternational.com/?p=1830)

### Inferences
- BraTumIA's tumor-volumetry validation is NOT evidence of an icometrix tumor product — the search results explicitly did not link BraTumIA to icometrix/icobrain branding, so this must not be conflated.
- icobrain's clearance language ("segmentable brain structures") likely does not extend to tumor compartments; its longitudinal pipeline's strict same-scanner/same-protocol/same-contrast requirement would also be a meaningful constraint for serial post-operative tumor imaging where contrast protocols often vary.

### Gaps
- Could not confirm whether icometrix has launched (or is developing) a tumor-specific icobrain module as of 2025/2026; would require checking icometrix's current product pages or BraTumIA's actual commercial/academic status directly.
- GE HealthCare–icometrix acquisition closing status and any resulting product roadmap changes (e.g., tumor expansion) not found.

---

## What does Qynapse's QyScore do for brain tumor volumetry and longitudinal tracking?

### Takeaway
QyScore is FDA-cleared (K192531) and CE-marked, but its validated/labeled scope is grey/white matter, hippocampus, amygdala, and white-matter-hyperintensity volumetry for neuroinflammatory/neurodegenerative use — not brain tumors. No evidence was found of a QyScore tumor-volumetry indication.

### Cited Findings
- FDA record: QyScore, product code LLZ, 21 CFR 892.2050, Class II, decision date December 13, 2019 (K192531); intended use is "automatic labeling, visualization and volumetric quantification of segmentable brain structures and lesions from a set of MR images" for patients aged 20–90 — [FDA 510(k) K192531 via Innolitics](https://fda.innolitics.com/device/K192531)
- A company profile describes QyScore as Qynapse's flagship product, FDA-cleared (Class II) and CE-marked (Class IIa); a trade report notes the company earned CE mark approval in 2017 — [Medindexer company profile](https://medindexer.com/directory/qynapse) / [Radiology Business](https://radiologybusiness.com/topics/medical-imaging/magnetic-resonance-imaging-mri/paris-tech-company-fda-clearance-brain-mri)
- Published validated uses are grey matter (GM), white matter (WM), hippocampus (HP), amygdala (AM), and white-matter hyperintensity (WMH) volumetry; the FDA intended-use language explicitly excludes clinical scenarios requiring evaluation of white-matter hyperintensities in some contexts — [Springer/PMC study](https://pmc.ncbi.nlm.nih.gov/articles/PMC9038894) / [FDA K192531](https://fda.innolitics.com/device/K192531)
- Company marketing frames QyScore's clinical use around neuroinflammation and neurodegeneration, not oncology — [Medical-Xprt product page](https://www.medical-xprt.com/software/qyscore-groundbreaking-neuroimaging-analysis-platform-796202)

### Inferences
- QyScore sits in the same market segment as Quantib ND and icobrain — atrophy/lesion volumetry for neurodegenerative disease — rather than oncology; none of these three European "brain quantification AI" vendors appear to have a glioma-specific product based on available sources.

### Gaps
- No tumor-specific QyScore module or roadmap item was found; would need direct confirmation from Qynapse that this remains the case as of 2026.

---

## What does Brainomix offer — do they have any glioma/tumor-specific product (beyond stroke)?

### Takeaway
Brainomix has no confirmed glioma or brain-tumor product. Its disclosed portfolio (Brainomix 360 Stroke, Brainomix 360 e-Lung, Brainomix 360 Vantage) covers stroke, lung disease, and enterprise analytics; a vague reference to "expansion into cancer" does not name any neuro-oncology product.

### Cited Findings
- Brainomix 360 Stroke: AI decision support for NCCT, CTA, CTP, and MRI across the acute stroke pathway — [search summary of company listings](https://www.cbinsights.com/company/brainomix)
- Brainomix 360 e-Lung: AI-powered workflow enhancement, visualization, and quantification for CT thoracic (lung) datasets — [search summary of company listings](https://www.cbinsights.com/company/brainomix)
- Brainomix 360 Vantage: enterprise analytics dashboard for network-wide clinical/operational insights — [search summary of company listings](https://www.cbinsights.com/company/brainomix)
- One source states the company is expanding into areas including lung disease and cancer generally, without naming a glioma or brain tumor product specifically — [Power Game (Greek trade press) via search](https://www.powergame.gr/start-ups-digital/1317743/)
- Brainomix's FAQ states its tools are FDA-cleared and CE-marked (for its existing stroke/lung products) — [Brainomix Trust Center FAQ](https://www.brainomix.com/support/trust-center/faq)

### Inferences
- Brainomix should be classified as "no glioma-specific product" for this report; do not overstate the vague "cancer expansion" mention as evidence of an actual tumor-segmentation tool.

### Gaps
- Could not verify whether Brainomix has launched any neuro-oncology product since the dates of the cited sources; recommend a direct check of brainomix.com's current product list if this matters for the final report.

---

## What do Siemens Healthineers (AI-Rad Companion Brain MR) and GE Healthcare offer — tumor segmentation, or mainly structural/volumetric brain quantification?

### Takeaway
Siemens' AI-Rad Companion Brain MR performs automated brain morphometry (structure segmentation + volumetric comparison to an ADNI-based normative database) for neurodegeneration workups — no tumor segmentation capability was found. GE Healthcare does not appear to have its own tumor-segmentation brain MRI product; its relevant neuro-AI activity is through partnerships/acquisitions (CorTechs Labs/NeuroQuant, and a pending icometrix acquisition), both of which are neurodegeneration-focused, not oncology.

### Cited Findings
- Siemens' AI-Rad Companion Brain MR (FDA-cleared as "Brain MR for Morphometry Analysis") automatically identifies roughly 30 brain segments on MRI, measures their volumes, and compares results to a normative reference database built from the Alzheimer's Disease Neuroimaging Initiative (ADNI); it measures volume changes in grey matter, white matter, and CSF across ~30 brain segments — [Siemens Healthineers product page](https://www.siemens-healthineers.com/en-th/digital-health-solutions/digital-solutions-overview/clinical-decision-support/ai-rad-companion/brain-mr) / [diagnosticimaging.com FDA clearance coverage](https://diagnosticimaging.com/view/fda-clears-two-siemens-healthineers-ai-based-mri-interpretation-tools)
- Siemens frames the product's clinical purpose around neurodegeneration: "reduced volume may indicate Parkinson's disease, Alzheimer's disease, or other forms of dementia" when combined with independent confirmation — [Siemens Healthineers / AxisImaging coverage](https://axisimagingnews.com/radiology-products/imaging-equipment/mri/fda-clears-siemens-healthineers-ai-mri-assistants)
- No search result described lesion or tumor segmentation capability for AI-Rad Companion Brain MR.
- GE HealthCare announced an agreement to acquire icometrix (described above), whose icobrain platform targets neurological disorders like Alzheimer's disease, not oncology — deal-closure status unconfirmed — [Neuro News International](https://neuronewsinternational.com/?p=1830)
- GE Healthcare and CorTechs Labs (2014) agreed to co-market an MRI solution combined with NeuroQuant, which automatically measures cortical/subcortical volumes to identify evidence of neurodegeneration — an older, non-oncology partnership — [BioSpace press release summary](https://www.biospace.com/ge-healthcare-and-cortechs-labs-inc-announce-strategic-agreement-to-co-market-neuroquant-and-0174-comprehensive-solutions-for-quantifying-brain-volum)
- A UCSF workflow (not GE-branded, though acquired with a GE 3D CUBE sequence) used ML to automatically segment longitudinal low-grade glioma tumors, computing volumetrics with lower variability than manual segmentation — this is a research workflow, not a packaged GE product — [search summary citing UCSF/GE sequence work](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12909261/)
- A 2025 retrospective study on an AI tool from MRIMath (a separate company, not GE) found automatic AI segmentation plus human review detected tumor growth a median of 21 months earlier than visual inspection alone — [PMC12909261](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12909261/)

### Inferences
- Both Siemens' and GE's own-branded neuro-AI offerings are concentrated in neurodegeneration/morphometry, mirroring Quantib, QyScore, and icobrain — suggesting the "big imaging OEM + volumetric brain quantification AI partner" model across the industry is currently oriented toward dementia/atrophy workups rather than oncology, leaving tumor segmentation to specialist vendors (Brainlab, Cortechs.ai/NeuroQuant tumor expansion, MRIMath) or research tools.

### Gaps
- Could not confirm current (2025/2026) status of the GE–icometrix acquisition (closed or pending) or whether it changes GE's tumor-related offerings.
- Did not find whether Siemens has any other, separately branded tumor segmentation product beyond AI-Rad Companion Brain MR; this would need a dedicated search of Siemens' oncology imaging portfolio.

---

## What does Olea Sphere (Olea Medical) offer for brain tumor perfusion/segmentation?

### Takeaway
Olea Sphere is a regulated (EU Class IIa, US Class II) post-processing platform with a brain-tumor perfusion workflow that uses semi-automated segmentation to generate volumes of interest (VOIs) for perfusion metrics (rCBV, rCBF, permeability/K2); the available evidence is largely vendor case reports rather than independent validation, with one multicenter comparison study found but its results not retrievable from search snippets.

### Cited Findings
- Olea Medical (France) builds Olea Sphere under an EN ISO 13485 quality system; it is a Class IIa device in Europe (notified body 0459) and Class II device in the US — [Olea Medical case report PDFs](https://www.olea-medical.com/wp-content/uploads/2021/10/Case-Report-021-Olea-Sphere-Brain-Tumor-Pilocytic-Astrocytoma.pdf)
- In a pilocytic astrocytoma case report, perfusion maps (rCBF, rCBV, permeability map K2) were computed via oSVD deconvolution in the brain tumor application; a semi-automated tumor segmentation tool created a VOI of the tumor's solid portion plus a reference VOI in supratentorial white matter, and relative rCBV (tumor VOI mean ÷ reference VOI mean) was 1.58 after leakage correction — [Olea Medical Case Report 021](https://www.olea-medical.com/wp-content/uploads/2021/10/Case-Report-021-Olea-Sphere-Brain-Tumor-Pilocytic-Astrocytoma.pdf)
- In a glioblastoma case example, the software showed rCBV of 7.57 mL/100 mL in the tumor's solid tissue, about 8x the contralateral healthy value; the vendor suggests adding a T1 DCE perfusion sequence when necrosis is present — [Olea Medical "DYK 029 Glioblastoma"](https://www.olea-medical.com/wp-content/uploads/2021/10/DYK-029-Glioblastoma.pdf)
- In a meningioma/lymphoma case report, DSC data were processed into CBV and K2 maps with regions of interest assessed on those maps — [Olea Medical Case Report 020](https://www.olea-medical.com/wp-content/uploads/2021/10/Case-Report-020-Olea-Sphere-Brain-Tumor-Meningioma-Lymphoma.pdf)
- A multicenter study of 260 patients (80 with brain tumors) ran identical raw DSC perfusion data through both Olea Sphere and NordicICE to assess inter-software agreement; the specific findings/conclusions were not retrievable from the search snippet — [cris.fau.de listing](https://cris.fau.de/publications/230834439)
- Outside tumors, Olea Sphere's segmentation has also been used in stroke, with automated ADC-threshold core segmentation and Tmax>6s penumbra segmentation — [PMC7986098 figure reference](https://pmc.ncbi.nlm.nih.gov/articles/PMC7986098/figure/ene14651-fig-0001)

### Inferences
- Olea Sphere's tumor workflow is semi-automated (clinician defines/edits VOI) rather than fully automatic AI segmentation, and its primary clinical value-add is quantitative perfusion characterization (rCBV/permeability) rather than tumor boundary delineation per se — differentiating it from Brainlab/Cortechs/MRIMath, which emphasize automated boundary/volume segmentation.
- Because most available sources are vendor-authored case reports, Olea's tumor capabilities should be treated as marketing-supported rather than independently validated, pending access to the multicenter NordicICE comparison study's actual results.

### Gaps
- Could not retrieve the conclusions of the 260-patient Olea Sphere vs. NordicICE multicenter comparison study.
- No Dice score, volumetric accuracy, or FDA/CE indication-specific-to-tumor labeling language was found for Olea Sphere's tumor segmentation function (its device clearance appears to be general-purpose perfusion/post-processing, not uniquely tumor-indicated).

---

## Notable startups/other vendors doing glioma/brain-tumor volumetric AI (beyond the above)

### Takeaway
Three notable additional vendors were identified with glioma-specific commercial or near-commercial tools: Cortechs.ai (NeuroQuant Brain Tumor expansion, 2025, cloud-connected to PACS), MRIMath (i2Contour, FDA-cleared glioblastoma tool with explainable AI review interface), and mediaire (mdbrain's "Tumor Differentiation" module, CE-marked in Europe). No evidence was found for Paige, Aidoc, Qure.ai, Subtle Medical, Corticometrics, or "neuro42" having a glioma/brain-tumor-specific product.

### Cited Findings
- Cortechs.ai announced (reported July 30, 2025) it is adding automated segmentation and volume reporting for brain metastases and meningiomas to its NeuroQuant platform, which it states already covered gliomas; the product is cloud-based and connects to hospital PACS systems — [Applied Radiology](https://www.appliedradiology.com/news/cortechs-ai-expands-neuroquant-to-revolutionize-brain-tumor-imaging-with-ai)
- MRIMath's i2Contour is an FDA-cleared glioblastoma tool; NCI reported the company received Small Business Innovation Research (SBIR) funding for it; its co-founder describes an interface letting clinicians outline tumors, review the AI's explanations, and check volumetric measurements (an explainability-oriented UI) — [NCI news item](https://www.cancer.gov/about-nci/organization/cbiit/news-events/news/2024/nci-funding-helps-bring-new-ai-aided-device-glioblastoma-market)
- A 2025 retrospective study of an MRIMath AI tool found automatic AI segmentation plus human review detected tumor growth in low-grade gliomas a median of 21 months earlier than visual inspection alone — [PMC12909261](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12909261/)
- mediaire's mdbrain platform includes a "Tumor Differentiation" module enabling automated differentiation between tumor core and surrounding marginal oedema in detected gliomas, separating tumor components by contrast-agent uptake, and tracking growth rate (% per year) over time for progression assessment; results are delivered as a PDF report with PACS overlays, with an API available to radiotherapy/neurosurgery software — [deepc.ai product description](https://deepc.ai/bt/mdbrain-tumour-segmentation)
- mdbrain (mediaire) is CE-marked in Europe per the company's medical-device quality certification — [bionity.com company profile](https://www.bionity.com/en/companies/1035180/mediaire-gmbh.html)
- QMENTA's 2020 press release says mdbrain was added to its clinical trials platform, providing volumetry and lesion-segmentation insights relevant to Alzheimer's, Parkinson's, and other conditions — a general, non-tumor-specific framing, and dated (2020), so may be outdated relative to the later tumor-module description — [QMENTA press release](https://www.qmenta.com/qmenta-partners-with-mediaire-to-transform-brain-research)
- Searches for "neuro42," Corticometrics, and Subtle Medical in connection with brain tumor segmentation returned no relevant product pages; Subtle Medical's documented tie-up with Cortechs.ai concerns imaging enhancement, not tumor segmentation — [search result summary](https://ensun.io/company/cortechs-labs-649dfbb3fb5c21e51e8f7c98)
- Academic/open-source tools identified but not commercial products: Raidionics (open software for pre-/post-operative CNS tumor segmentation and standardized reporting) and the BraTS/BraTS-METS/BraTS-PEDs challenges (benchmark datasets, not clinical products) — [Raidionics arXiv paper](https://arxiv.org/pdf/2305.14351) / [BraTS-METS 2023 paper](https://arxiv.org/pdf/2306.00838)

### Inferences
- The tumor-specific AI volumetrics space is less mature/crowded than the neurodegeneration-volumetrics space (Quantib, QyScore, icobrain, AI-Rad Companion) — only a handful of named vendors (Brainlab, Cortechs.ai, MRIMath, mediaire) have disclosed glioma-specific commercial capability, and most recent/active development (Cortechs.ai 2025 expansion, Brainlab's AI module, MRIMath) is very recent, suggesting this is still an emerging commercial category as of 2025–2026.
- MRIMath's emphasis on an explainable/reviewable interface (clinician reviews "the AI's explanation" and volumetric measurements) is the closest documented analog among clinical products to an uncertainty/transparency-oriented UI, though this was not described as showing formal confidence scores or step-by-step volumetric math.

### Gaps
- No information found on Paige's or Aidoc's brain tumor/glioma offerings (Paige is historically pathology-focused; Aidoc is broadly stroke/triage-focused per general knowledge, but this was not independently confirmed in this research pass).
- No information found on Qure.ai's glioma-specific capability (Qure.ai is known broadly for chest X-ray/stroke CT triage per general industry knowledge, not independently verified here for brain tumor MRI).
- "neuro42" and Corticometrics yielded no relevant search results connecting them to glioma/tumor segmentation — cannot confirm or deny a product exists; may require a more targeted search with exact company names/URLs.
- No funding or market-size data was retrieved for this startup cohort.

---

## Across all vendors: do any show interactive rotate/zoom/toggle 3D tumor meshes synchronized live with 2D MPR slices in a lightweight browser UI? Do any show step-by-step volumetric math or visible model uncertainty? Do any publish Dice scores/validation methodology publicly?

### Takeaway
No clinical/commercial product reviewed was confirmed to offer a lightweight browser-based, live-synchronized 3D mesh + 2D MPR viewer with visible uncertainty or step-by-step volumetric math — these features currently exist mainly in research prototypes (e.g., FastSAM-3DSlicer, Segment Any Tumour 3D) built on 3D Slicer (a heavy desktop research application), not in regulated clinical products. Dice scores are the one metric that several vendors do disclose, but only within FDA 510(k) submissions (bench validation), not as an ordinary, continuously visible, user-facing claim.

### Cited Findings
- FastSAM-3DSlicer is a 3D Slicer extension for interactive volumetric segmentation with an added uncertainty quantification scheme; it reports ~0.73 seconds per volume on GPU (1.09s on CPU) and makes its source code and a video demo public — [FastSAM paper/arXiv-linked description](https://pycad.co/?p=7977) (via search synthesis; 3D Slicer is a free desktop research application, not a regulated clinical product)
- Segment Any Tumour 3D (SAT3D) is a volumetric foundation model that incorporates uncertainty estimates during training (aimed at improving low-contrast boundary segmentation) and includes a "preliminary 3D Slicer plugin" for interactive visualization and prompt-based segmentation; authors describe it as "a step toward clinical workflows," i.e., not yet a deployed clinical product, and report performance roughly on par with the nnUNet baseline — [arXiv 2511.09592](https://arxiv.org/pdf/2511.09592)
- OsteoCAD (bone tumor, not brain, but methodologically relevant) is a human-in-the-loop, web-interface research system with a metrics dashboard and a 3D viewer overlaying model prediction vs. ground truth (red/blue), with results exportable for PACS integration — again a research system, not a cleared product — [arXiv paper on OsteoCAD](https://arxiv.org/pdf/2607.29266)
- A patent (US12322112B2) discloses a method for segmenting a tumor, producing an uncertainty measure (e.g., via Kullback-Leibler divergence), and displaying both to "improve trust of human annotators" — being a patent disclosure, this is not evidence of any shipped product — [Google Patents US12322112B2](https://patents.google.com/patent/US12322112)
- Uncertainty-quantification literature for brain tumor segmentation generally uses test-time dropout (epistemic/model uncertainty) and test-time augmentation (aleatoric/data uncertainty), framed as letting clinicians review the most uncertain regions — this is academic methodology, not confirmed in any commercial product UI — [search synthesis citing uncertainty-quantification literature]
- Dice scores ARE disclosed publicly, but only inside FDA 510(k) summaries, for: Brainlab's Elements AI Tumor Segmentation (mean Dice 0.75, precision 0.86, recall 0.85, K243633); Quantib ND (Dice 0.78–0.99 across brain structures, 0.61±0.13 for WMH, K213737); and independent academic studies of Brainlab's SmartBrush (Dice 0.72–0.77 vs. BraTumIA's 0.68, PLoS ONE 2016) — [FDA K243633](https://fda.innolitics.com/device/K243633), [FDA K213737](https://fda.innolitics.com/device/K213737), [PLoS ONE study](https://doaj.org/article/705d1a650f02439999211abfb078f2b8)
- MRIMath's i2Contour interface is described (by its co-founder) as letting clinicians "review the AI's explanations" alongside volumetric measurements — the closest found description of a commercial product offering some transparency into the AI's reasoning, though no detail on whether this is a 3D mesh view, an uncertainty heatmap, or simply a text/overlay explanation — [NCI news item](https://www.cancer.gov/about-nci/organization/cbiit/news-events/news/2024/nci-funding-helps-bring-new-ai-aided-device-glioblastoma-market)
- Vendor marketing for generic commercial browser DICOM viewers claims AI-overlay segmentation across axial/sagittal/coronal views in-browser, but no published uncertainty display or independent clinical validation was found for these — [search synthesis of commercial DICOM viewer marketing]

### Inferences
- There is a clear capability gap between (a) regulated clinical products (Brainlab Elements, Quantib, QyScore, icobrain, AI-Rad Companion, Cortechs.ai, MRIMath, mediaire, Olea Sphere) — all of which run as workstation plugins, PACS-integrated reports, or cloud-to-PACS pipelines, none confirmed to show a live-synchronized rotate/zoom 3D tumor mesh in a lightweight browser — and (b) research prototypes (FastSAM-3DSlicer, SAT3D, OsteoCAD) that do explore interactive 3D + uncertainty visualization, but only within 3D Slicer (a free, open-source, but still a full desktop research application, not "lightweight browser") or bespoke research web interfaces not cleared for clinical use.
- This strongly suggests a market gap/differentiation opportunity exists exactly where the user's lightweight research/teaching web tool would sit: no reviewed commercial/clinical vendor combines (1) a lightweight in-browser UI, (2) live-synced 3D mesh + 2D MPR, (3) visible/transparent volumetric math, and (4) visible model confidence/uncertainty — clinical products instead emphasize regulatory-grade accuracy metrics (disclosed only in FDA filings) and integration into existing radiology/surgical workflows (PACS, treatment-planning workstations), while the interactive-uncertainty-visualization features live only in academic 3D Slicer extensions.
- Publicly disclosed Dice scores are real but should be flagged precisely as 510(k)-submission bench data (not routinely surfaced to clinical end users in the product UI itself) — a transparency gap distinct from, but related to, the "no visible uncertainty in the live product UI" gap.

### Gaps
- Did not independently inspect any product's actual UI/UX (screenshots, demo videos, user manuals) to confirm the absence of 3D/MPR sync or uncertainty display — findings are based on available product descriptions, press coverage, and FDA filings, not direct UI review; a follow-up pass fetching vendor demo videos or UI screenshots (e.g., Brainlab Elements Viewer, Cortechs.ai NeuroQuant, MRIMath i2Contour) would strengthen this conclusion.
- No CE-mark technical documentation was accessed (CE dossiers are generally not public in the way FDA 510(k) summaries are), so validation methodology/Dice-equivalent disclosure for CE-only markets could not be assessed.
