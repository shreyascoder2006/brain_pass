/**
 * Lets the report reach the live WebGL canvas without plumbing a ref through
 * ThreeBrainTwin's props. There is exactly one instance of the twin on screen,
 * so a module-level singleton is simpler than a context for this one purpose.
 */
export const captureRegistry: { threeCanvas: HTMLCanvasElement | null } = {
  threeCanvas: null,
}
