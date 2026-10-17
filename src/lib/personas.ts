import type { Vec3 } from './volume'

export interface TumourConfig {
  centre: Vec3
  rNcr: number
  rEt: number
  rEd: number
  phase?: number
}

export interface PatientPersona {
  id: string
  name: string
  age: number
  gender: 'Female' | 'Male' | 'Other'
  mrn: string
  primarySymptom: string
  clinicalVignette: string
  anatomicalLocation: string
  lesionType: string
  whoGrade: 'Grade II' | 'Grade III' | 'Grade IV' | 'Non-Neoplastic'
  estimatedVolumeMl: number
  seed: number
  brainScale?: { rx: number; ry: number; rz: number }
  tumour: TumourConfig | null
  secondaryTumour?: TumourConfig | null
}

export const PATIENT_PERSONAS: PatientPersona[] = [
  {
    id: 'persona_01_sarah',
    name: 'Sarah Jenkins',
    age: 42,
    gender: 'Female',
    mrn: 'MRN-41829',
    primarySymptom: 'Morning headaches & subtle expressive speech hesitation',
    clinicalVignette: '42-year-old female presenting with 3-week history of worsening morning cephalalgia unresponsive to NSAIDs. Subtle expressive word-finding difficulty.',
    anatomicalLocation: 'Right Frontal Lobe (Anterior Opercular)',
    lesionType: 'Glioblastoma Multiforme',
    whoGrade: 'Grade IV',
    estimatedVolumeMl: 41.2,
    seed: 101,
    brainScale: { rx: 72, ry: 92, rz: 70 },
    tumour: {
      centre: [33, 24, 16],
      rNcr: 11.2,
      rEt: 15.6,
      rEd: 22.0,
      phase: 0,
    },
  },
  {
    id: 'persona_02_david',
    name: 'David Chen',
    age: 58,
    gender: 'Male',
    mrn: 'MRN-59302',
    primarySymptom: 'Focal sensory-motor seizures affecting right upper extremity',
    clinicalVignette: '58-year-old male with new-onset focal motor twitching in right hand spreading to forearm. Post-ictal confusion lasting 15 minutes.',
    anatomicalLocation: 'Left Superior Temporal Gyrus (Posterior)',
    lesionType: 'High-Grade Infiltrative Glioma',
    whoGrade: 'Grade IV',
    estimatedVolumeMl: 58.7,
    seed: 202,
    brainScale: { rx: 74, ry: 94, rz: 68 },
    tumour: {
      centre: [-36, -18, 4],
      rNcr: 13.0,
      rEt: 17.5,
      rEd: 25.0,
      phase: 1,
    },
  },
  {
    id: 'persona_03_elena',
    name: 'Elena Rodriguez',
    age: 35,
    gender: 'Female',
    mrn: 'MRN-32091',
    primarySymptom: 'Progressive spatial disorientation & left-sided sensory neglect',
    clinicalVignette: '35-year-old architect noting progressive difficulty with 3D spatial calculations and bumping into objects on her left side over 2 months.',
    anatomicalLocation: 'Right High Parietal Convexity',
    lesionType: 'Diffuse Infiltrative Astrocytoma',
    whoGrade: 'Grade II',
    estimatedVolumeMl: 72.4,
    seed: 303,
    brainScale: { rx: 71, ry: 90, rz: 72 },
    tumour: {
      centre: [24, -36, 36],
      rNcr: 4.0,
      rEt: 7.5,
      rEd: 27.5,
      phase: 2,
    },
  },
  {
    id: 'persona_04_james',
    name: 'James Thorne',
    age: 64,
    gender: 'Male',
    mrn: 'MRN-78144',
    primarySymptom: 'Subtle right hemiparesis & progressive gait unsteadiness',
    clinicalVignette: '64-year-old male with gradual unilateral right leg dragging and lethargy. Contrast MRI demonstrates a deep subcortical mass abutting internal capsule.',
    anatomicalLocation: 'Left Deep Thalamic / Basal Ganglia',
    lesionType: 'Deep Subcortical Glioblastoma',
    whoGrade: 'Grade IV',
    estimatedVolumeMl: 26.8,
    seed: 404,
    brainScale: { rx: 70, ry: 89, rz: 69 },
    tumour: {
      centre: [-14, -8, 6],
      rNcr: 8.5,
      rEt: 12.5,
      rEd: 17.0,
      phase: 3,
    },
  },
  {
    id: 'persona_05_priya',
    name: 'Priya Patel',
    age: 29,
    gender: 'Female',
    mrn: 'MRN-19483',
    primarySymptom: 'First-time nocturnal generalized tonic-clonic seizure',
    clinicalVignette: '29-year-old previously athletic female presenting following unwitnessed nocturnal seizure with tongue bite. Neurological exam completely non-focal.',
    anatomicalLocation: 'Right Occipito-Parietal Junction',
    lesionType: 'Oligodendroglioma (IDH-mutant)',
    whoGrade: 'Grade II',
    estimatedVolumeMl: 14.5,
    seed: 505,
    brainScale: { rx: 70, ry: 91, rz: 68 },
    tumour: {
      centre: [28, -62, 14],
      rNcr: 2.8,
      rEt: 5.8,
      rEd: 13.5,
      phase: 4,
    },
  },
  {
    id: 'persona_06_arthur',
    name: 'Arthur Mitchell',
    age: 71,
    gender: 'Male',
    mrn: 'MRN-88219',
    primarySymptom: 'Bifrontal headache, rapid executive dysfunction & apathy',
    clinicalVignette: '71-year-old retired judge presenting with marked personality blunting and memory lapses. Scan reveals two separate non-contiguous enhancing masses.',
    anatomicalLocation: 'Multifocal (Left Frontal + Satellite Parietal)',
    lesionType: 'Multifocal Glioblastoma (Dual Foci)',
    whoGrade: 'Grade IV',
    estimatedVolumeMl: 49.3,
    seed: 606,
    brainScale: { rx: 73, ry: 93, rz: 71 },
    tumour: {
      centre: [-30, 16, 26],
      rNcr: 9.5,
      rEt: 13.5,
      rEd: 19.5,
      phase: 1,
    },
    secondaryTumour: {
      centre: [-38, -30, 22],
      rNcr: 4.2,
      rEt: 7.6,
      rEd: 11.5,
      phase: 5,
    },
  },
  {
    id: 'persona_07_chloe',
    name: 'Chloe Bennett',
    age: 47,
    gender: 'Female',
    mrn: 'MRN-63720',
    primarySymptom: 'Persistent vertigo, intention tremor & truncal imbalance',
    clinicalVignette: '47-year-old accountant with 6-week progressive spinning sensation, past-pointing on finger-to-nose testing, and suboccipital tightness.',
    anatomicalLocation: 'Left Infratentorial Cerebellar Hemisphere',
    lesionType: 'Anaplastic Astrocytoma',
    whoGrade: 'Grade III',
    estimatedVolumeMl: 28.1,
    seed: 707,
    brainScale: { rx: 71, ry: 91, rz: 70 },
    tumour: {
      centre: [-24, -56, -30],
      rNcr: 7.8,
      rEt: 11.4,
      rEd: 16.8,
      phase: 2,
    },
  },
  {
    id: 'persona_08_marcus',
    name: 'Marcus Brody',
    age: 53,
    gender: 'Male',
    mrn: 'MRN-50912',
    primarySymptom: 'Right hand intrinsic muscle weakness & localized twitching',
    clinicalVignette: '53-year-old master mechanic noting loss of fine dexterity in right hand when holding tools. Scan reveals lesion immediately anterior to the central sulcus.',
    anatomicalLocation: 'Left Pre-Central Gyrus (Motor Hand Knob)',
    lesionType: 'High-Grade Eloquent Cortex Glioma',
    whoGrade: 'Grade IV',
    estimatedVolumeMl: 34.6,
    seed: 808,
    brainScale: { rx: 72, ry: 93, rz: 71 },
    tumour: {
      centre: [-34, -2, 38],
      rNcr: 9.8,
      rEt: 14.2,
      rEd: 20.4,
      phase: 3,
    },
  },
  {
    id: 'persona_09_linda',
    name: 'Linda Vasquez',
    age: 62,
    gender: 'Female',
    mrn: 'MRN-91045',
    primarySymptom: 'Abulia, bilateral leg weakness & urinary urgency',
    clinicalVignette: '62-year-old female presenting with progressive loss of motivation, slowed spontaneous movements, and paraparesis. Imaging shows lesion spanning the corpus callosum.',
    anatomicalLocation: 'Parasagittal Frontal (Bifrontal Midline / Corpus Callosum)',
    lesionType: 'Butterfly Glioblastoma',
    whoGrade: 'Grade IV',
    estimatedVolumeMl: 66.0,
    seed: 909,
    brainScale: { rx: 73, ry: 94, rz: 72 },
    tumour: {
      centre: [4, 14, 30],
      rNcr: 12.5,
      rEt: 17.2,
      rEd: 26.5,
      phase: 4,
    },
  },
  {
    id: 'persona_10_robert',
    name: 'Robert Taylor',
    age: 39,
    gender: 'Male',
    mrn: 'MRN-20158',
    primarySymptom: 'Episodic band-like tension headaches under occupational stress',
    clinicalVignette: '39-year-old software executive with refractory tension headaches. Comprehensive 4-sequence MRI obtained to rule out structural intracranial pathology.',
    anatomicalLocation: 'Bilateral Cerebral Hemispheres (Non-Lesional Baseline)',
    lesionType: 'Healthy Baseline Control (Non-Lesional)',
    whoGrade: 'Non-Neoplastic',
    estimatedVolumeMl: 0.0,
    seed: 1010,
    brainScale: { rx: 72, ry: 92, rz: 70 },
    tumour: null, // Zero lesion - completely healthy normal brain twin
  },
]

export function getPersonaById(id: string): PatientPersona {
  return PATIENT_PERSONAS.find((p) => p.id === id) ?? PATIENT_PERSONAS[0]
}

export function getDefaultPersona(): PatientPersona {
  return PATIENT_PERSONAS[0]
}
