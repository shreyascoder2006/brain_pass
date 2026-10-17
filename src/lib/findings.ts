/**
 * Report-section content for a persona case.
 *
 * Two different kinds of fact feed the report and must stay visibly separate:
 *  - persona fields (name, vignette, anatomical location, WHO grade) are
 *    teaching-author-written narrative, fixed at persona creation time.
 *  - the quantitative findings below are read off the segmentation mask by
 *    this module. Mixing the two without a label would make an authored
 *    teaching note look like something the model concluded.
 *
 * The laterality/position check is geometric, not persona-authored, so it can
 * disagree with the persona's own anatomicalLocation string — that disagreement
 * is informative (either the mask or the narrative drifted) and is surfaced
 * rather than hidden.
 */

import type { StudyBundle } from '../state/study'
import { centroidVoxel, REGIONS, regionMask } from './regions'
import { axisOrientation, voxelToWorld, worldToVoxel, WORLD_AXIS_LETTERS, type Vec3 } from './volume'

const SIDE_WORD: Record<string, string> = {
  R: 'right', L: 'left', A: 'anterior', P: 'posterior', S: 'superior', I: 'inferior',
}

export interface LocationCheck {
  hemisphere: 'right' | 'left' | 'near the midline'
  anteroposterior: 'anterior' | 'posterior' | 'central'
  superoinferior: 'superior' | 'inferior' | 'mid'
  worldMm: Vec3
  voxel: Vec3
}

/**
 * Position is read relative to the head's own bounding box (bundle.crop), not
 * the world origin — real NIfTI affines are not guaranteed to centre the head
 * at (0,0,0), so an origin-relative read would silently go wrong on real data.
 */
export function locateTumour(bundle: StudyBundle): LocationCheck {
  const { study, crop } = bundle
  const wt = REGIONS.find((r) => r.key === 'WT')!
  const mask = regionMask(study.predicted, wt.codes)

  let voxel: Vec3
  if (study.persona?.tumour) {
    voxel = worldToVoxel(bundle.inverseAffine, ...study.persona.tumour.centre)
  } else {
    voxel = centroidVoxel(mask, study.dims)
  }
  const worldMm = voxelToWorld(study.affine, voxel[0], voxel[1], voxel[2])
  const orient = axisOrientation(study.affine)

  const centre: Vec3 = [
    (crop.lo[0] + crop.hi[0]) / 2,
    (crop.lo[1] + crop.hi[1]) / 2,
    (crop.lo[2] + crop.hi[2]) / 2,
  ]
  const span: Vec3 = [
    crop.hi[0] - crop.lo[0],
    crop.hi[1] - crop.lo[1],
    crop.hi[2] - crop.lo[2],
  ]

  let hemisphere: LocationCheck['hemisphere'] = 'near the midline'
  let anteroposterior: LocationCheck['anteroposterior'] = 'central'
  let superoinferior: LocationCheck['superoinferior'] = 'mid'

  for (let axis = 0; axis < 3; axis++) {
    const o = orient[axis]
    const diff = voxel[axis] - centre[axis]
    const frac = Math.abs(diff) / (span[axis] / 2 || 1)
    const towardsPositiveLetter = (diff >= 0) === o.positive
    const [posLetter, negLetter] = WORLD_AXIS_LETTERS[o.worldAxis]
    const word = SIDE_WORD[towardsPositiveLetter ? posLetter : negLetter]

    if (o.worldAxis === 0 && frac > 0.1) hemisphere = word as LocationCheck['hemisphere']
    if (o.worldAxis === 1 && frac > 0.15) anteroposterior = word as LocationCheck['anteroposterior']
    if (o.worldAxis === 2 && frac > 0.15) superoinferior = word as LocationCheck['superoinferior']
  }

  return { hemisphere, anteroposterior, superoinferior, worldMm, voxel }
}

export interface Findings {
  location: LocationCheck
  hasLesion: boolean
  sizeCategory: 'none' | 'small' | 'moderate' | 'large'
  multifocal: boolean
  summary: string
  pattern: string
  volumeAgreement: string
}

export function buildFindings(bundle: StudyBundle): Findings {
  const persona = bundle.study.persona
  const location = locateTumour(bundle)
  const wt = bundle.report.WT.predML
  const tc = bundle.report.TC.predML
  const et = bundle.report.ET.predML
  const hasLesion = Boolean(persona?.tumour) && wt > 0.05
  const multifocal = Boolean(persona?.secondaryTumour)

  if (!hasLesion) {
    return {
      location, hasLesion, sizeCategory: 'none', multifocal: false,
      summary: 'Automated segmentation finds no whole-tumour voxels above threshold in this study. '
        + 'The scan is consistent with the baseline, non-lesional case it was generated from.',
      pattern: 'No tumour core or enhancing component detected.',
      volumeAgreement: '',
    }
  }

  const sizeCategory: Findings['sizeCategory'] = wt < 15 ? 'small' : wt < 45 ? 'moderate' : 'large'

  const sideText = location.hemisphere === 'near the midline'
    ? 'near the midline'
    : `in the ${location.hemisphere} cerebral hemisphere`
  const depthWords = [location.anteroposterior, location.superoinferior]
    .filter((w) => w !== 'central' && w !== 'mid')
  const depthText = depthWords.length ? `, ${depthWords.join(', ')} in position` : ''
  const multifocalText = multifocal ? ' Two non-contiguous tumour foci are present.' : ''

  const corePct = wt > 0 ? (tc / wt) * 100 : 0
  const enhPct = wt > 0 ? (et / wt) * 100 : 0

  const enhancementPhrase =
    enhPct > 20 ? 'a substantial enhancing component'
      : enhPct > 5 ? 'a modest enhancing component'
        : 'minimal contrast enhancement'
  const corePhrase =
    corePct > 60 ? 'a large non-enhancing core relative to the surrounding oedema'
      : 'oedema forming the majority of the lesion volume'

  const summary =
    `Automated segmentation identifies a ${sizeCategory}-volume lesion ${sideText}${depthText}.` +
    `${multifocalText} The whole tumour region measures ${wt.toFixed(1)} mL, comprising a tumour core of ` +
    `${tc.toFixed(1)} mL (${corePct.toFixed(0)}% of whole tumour) and an enhancing component of ` +
    `${et.toFixed(1)} mL (${enhPct.toFixed(0)}% of whole tumour).`

  const pattern =
    `The lesion shows ${enhancementPhrase} and ${corePhrase}. These figures describe the shape ` +
    `and extent of the segmented regions only; they are not a radiological grading, a measure of ` +
    `malignancy, or a prediction of outcome.`

  const volumeAgreement = persona
    ? (() => {
        const diff = wt - persona.estimatedVolumeMl
        const pct = persona.estimatedVolumeMl > 0 ? (diff / persona.estimatedVolumeMl) * 100 : 0
        const dir = diff >= 0 ? 'above' : 'below'
        return `Case-reference whole-tumour volume: ${persona.estimatedVolumeMl.toFixed(1)} mL. ` +
          `Model measurement is ${Math.abs(pct).toFixed(0)}% ${dir} that reference.`
      })()
    : ''

  return { location, hasLesion, sizeCategory, multifocal, summary, pattern, volumeAgreement }
}
