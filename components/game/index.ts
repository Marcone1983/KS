// Game components barrel export
// Only export components that are properly typed and working

export { default as SprayEffect } from './SprayEffect';
export { default as WaveIndicator } from './WaveIndicator';
export { default as TutorialOverlay } from './TutorialOverlay';

// Note: Other components need TypeScript fixes before they can be exported
// They use mock components with implicit any types that need to be properly typed
