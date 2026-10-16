export default function DisclaimerBanner() {
  return (
    <div className="shrink-0 px-3 pt-2">
      <div className="flex items-center justify-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/15 px-4 py-[5px] text-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0">
          <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01" />
        </svg>
        <span className="text-[11.5px] font-semibold tracking-wide text-amber-200">
          DISCLAIMER: Research and teaching prototype only. Never use model output as a diagnosis.
        </span>
      </div>
    </div>
  )
}
