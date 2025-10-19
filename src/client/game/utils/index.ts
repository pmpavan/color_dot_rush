/**
 * Font preloading system exports
 */

export { FontPreloader } from './FontPreloader';
export type { FontLoadResult, FontLoadingStatus } from './FontPreloader';

export { FONT_ASSETS, generateFontCSS, injectFontCSS, preloadFonts } from '../assets/FontAssets';
export type { FontAsset, FontAssets } from '../assets/FontAssets';

/**
 * Responsive layout system exports
 */
export { ResponsiveLayoutManager, ButtonType } from './ResponsiveLayoutManager';
export type { IResponsiveLayoutManager, LayoutConfig } from './ResponsiveLayoutManager';

/**
 * Viewport and camera management exports
 */
export { ViewportManager } from './ViewportManager';
export type { IViewportManager, ViewportDimensions, CameraBounds } from './ViewportManager';

/**
 * Integrated responsive system exports
 */
export { ResponsiveSystem } from './ResponsiveSystem';
export type { IResponsiveSystem } from './ResponsiveSystem';

/**
 * Unified text rendering system exports
 */
export { PhaserTextRenderer } from './PhaserTextRenderer';
export type { ITextRenderer, TextStyle, GradientConfig } from './PhaserTextRenderer';

export { DOMTextRenderer } from './DOMTextRenderer';
export type { DOMTextStyle, GradientTextConfig, DOMTextElement } from './DOMTextRenderer';

/**
 * Interactive button management system exports
 */
export { InteractiveButtonManager, ButtonState } from './InteractiveButtonManager';
export type { IButtonManager, ButtonConfig, InteractiveButton } from './InteractiveButtonManager';

/**
 * Modal system exports
 */
export { HowToPlayModal, ModalState } from './HowToPlayModal';
export type { IHowToPlayModal } from './HowToPlayModal';

/**
 * UI Element Factory and Fallback System exports
 */
export { UIElementFactory, UIElementType } from './UIElementFactory';
export type { UIElement, LayoutConfig as UILayoutConfig } from './UIElementFactory';

export { ResponsiveLayoutManager } from './ResponsiveLayoutManager';
export type { UIElementMap, Position } from './ResponsiveLayoutManager';

export { FallbackRenderer, FallbackMode } from './FallbackRenderer';

// Re-export existing utilities
export { CSPComplianceChecker } from './CSPComplianceChecker';
export { PerformanceMonitor } from './PerformanceMonitor';
export { PerformanceOptimizer } from './PerformanceOptimizer';
export { ResponsiveCanvas } from './ResponsiveCanvas';

/**
 * Safe cleanup utilities exports
 */
export {
  safelyRemoveEventListener,
  safelyAccessSceneProperty,
  safelyKillTweens,
  safelyRemoveSceneChildren,
  createCleanupContext,
  performSafeCleanup
} from './SafeCleanupHelpers';
export type { CleanupContext } from './SafeCleanupHelpers';
