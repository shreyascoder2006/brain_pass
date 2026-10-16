import BottomMetricsBar from './components/BottomMetricsBar'
import DisclaimerBanner from './components/DisclaimerBanner'
import LinkedMprGrid from './components/LinkedMprGrid'
import ThreeBrainTwin from './components/ThreeBrainTwin'
import TopBar from './components/TopBar'
import { StudyProvider } from './state/study'

function Loading({ stage }: { stage: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-ink">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-2 border-edge" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-sky-400" />
      </div>
      <div className="text-center">
        <div className="text-[13px] font-medium text-slate-200">NeuroScope 3D</div>
        <div className="mt-1 font-mono text-[11px] text-slate-500">{stage}…</div>
      </div>
      <p className="max-w-sm text-center text-[10.5px] leading-relaxed text-slate-600">
        Building the digital twin: isosurfaces are extracted in world millimetre space from the
        study affine, so geometry, slices and volumes share one coordinate system.
      </p>
    </div>
  )
}

export default function App() {
  return (
    <div className="flex h-full flex-col bg-ink">
      <TopBar />
      <DisclaimerBanner />
      <StudyProvider fallback={(stage) => <Loading stage={stage} />}>
        <main className="grid min-h-0 flex-1 grid-cols-2 gap-2 p-2 pt-2">
          <ThreeBrainTwin />
          <LinkedMprGrid />
        </main>
        <div className="shrink-0 px-2 pb-2">
          <BottomMetricsBar />
        </div>
      </StudyProvider>
    </div>
  )
}
