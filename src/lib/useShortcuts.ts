import { useEffect } from 'react'
import { useStore } from '../state/store'

/** Single-key shortcuts for the controls a user reaches for repeatedly.
 *  Deliberately unmodified keys — this is a viewer people drive one-handed
 *  while the other hand is on the mouse — but suppressed whenever focus is in
 *  a field, so typing a filename never toggles an overlay. */
export function useShortcuts(onHelp: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement || (el as HTMLElement)?.isContentEditable) return

      const s = useStore.getState()
      switch (e.key.toLowerCase()) {
        case 'c': s.setTool('crosshair'); break
        case 'm': s.setTool(s.tool === 'measure' ? 'crosshair' : 'measure'); break
        case 'w': s.setTool(s.tool === 'window' ? 'crosshair' : 'window'); break
        case 'o': s.toggleOverlay(); break
        case 'e': s.setMaskSource(s.maskSource === 'predicted' ? 'expert' : 'predicted'); break
        case 'u': s.setOverlayMode(s.overlayMode === 'uncertainty' ? 'segmentation' : 'uncertainty'); break
        case 'a': s.setOverlayMode(s.overlayMode === 'agreement' ? 'segmentation' : 'agreement'); break
        case 'b': s.toggleBrain(); break
        case '?': onHelp(); break
        case 'escape':
          s.setTool('crosshair')
          s.clearMeasure()
          break
        default: return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onHelp])
}
