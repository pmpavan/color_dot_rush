/**
 * Font Assets - Bundled font imports for Devvit app
 * This ensures fonts are properly bundled and served locally
 */

// Import Orbitron font files for local bundling
import orbitronRegularWoff2 from '/public/fonts/orbitron-regular.woff2?url';
import orbitronMediumWoff2 from '/public/fonts/orbitron-medium.woff2?url';
import orbitronBoldWoff2 from '/public/fonts/orbitron-bold.woff2?url';
import orbitronBlackWoff2 from '/public/fonts/orbitron-black.woff2?url';

export interface OrbitronFontAssets {
  regular: string;
  medium: string;
  bold: string;
  black: string;
}

/**
 * Bundled Orbitron font assets with correct URLs - WOFF2 only
 */
export const ORBITRON_FONT_ASSETS: OrbitronFontAssets = {
  regular: orbitronRegularWoff2,
  medium: orbitronMediumWoff2,
  bold: orbitronBoldWoff2,
  black: orbitronBlackWoff2,
};

/**
 * Generate CSS for font faces using bundled assets - WOFF2 only
 */
export function generateFontCSS(): string {
  return `
    @font-face {
      font-family: 'Orbitron';
      font-style: normal;
      font-weight: 400;
      src: url('${ORBITRON_FONT_ASSETS.regular}') format('woff2');
      font-display: swap;
    }
    @font-face {
      font-family: 'Orbitron';
      font-style: normal;
      font-weight: 500;
      src: url('${ORBITRON_FONT_ASSETS.medium}') format('woff2');
      font-display: swap;
    }
    @font-face {
      font-family: 'Orbitron';
      font-style: normal;
      font-weight: 700;
      src: url('${ORBITRON_FONT_ASSETS.bold}') format('woff2');
      font-display: swap;
    }
    @font-face {
      font-family: 'Orbitron';
      font-style: normal;
      font-weight: 900;
      src: url('${ORBITRON_FONT_ASSETS.black}') format('woff2');
      font-display: swap;
    }
  `;
}

/**
 * Generate CSS for Google Fonts (Orbitron) for Neon Pulse theme
 * DEPRECATED: Now using locally bundled Orbitron fonts for CSP compliance
 */
export function generateGoogleFontsCSS(): string {
  // No longer needed - using locally bundled fonts
  return '';
}

/**
 * Inject font CSS into the document
 */
export function injectFontCSS(): void {
  console.log('FontAssets: Injecting bundled font CSS');
  
  try {
    if (typeof document === 'undefined') {
      console.warn('FontAssets: Document not available, cannot inject CSS');
      return;
    }

    // Check if CSS is already injected
    const existingStyle = document.getElementById('bundled-font-css');
    if (existingStyle) {
      console.log('FontAssets: Font CSS already injected');
      return;
    }

    // Create and inject font CSS
    const style = document.createElement('style');
    style.id = 'bundled-font-css';
    style.textContent = generateFontCSS();
    
    document.head.appendChild(style);
    console.log('FontAssets: Bundled font CSS injected successfully');
    
  } catch (error) {
    console.error('FontAssets: Error injecting font CSS:', error);
  }
}

/**
 * Inject Google Fonts CSS for Neon Pulse theme
 * DEPRECATED: Now using locally bundled Orbitron fonts for CSP compliance
 */
export function injectGoogleFontsCSS(): void {
  console.log('FontAssets: Skipping Google Fonts CSS injection - using locally bundled fonts for CSP compliance');
  
  // No longer needed - using locally bundled fonts
  // This function is kept for backward compatibility but does nothing
}

/**
 * Preload fonts using WOFF2 format only
 */
export async function preloadFonts(): Promise<boolean> {
  console.log('FontAssets: Starting font preloading with WOFF2 format');
  
  try {
    if (typeof document === 'undefined' || !document.fonts) {
      console.warn('FontAssets: Font API not available');
      return false;
    }

    // Inject local fonts CSS (including bundled Orbitron)
    injectFontCSS();
    // Note: No longer injecting Google Fonts CSS - using locally bundled fonts for CSP compliance

    // Wait a bit for CSS to be processed
    await new Promise(resolve => setTimeout(resolve, 200));

    // Load fonts using the Font Loading API (optimized - only essential sizes)
    const fontPromises = [
      // Orbitron fonts (local) - only essential sizes
      document.fonts.load('16px Orbitron'),
      document.fonts.load('500 16px Orbitron'),
      document.fonts.load('700 16px Orbitron'),
      document.fonts.load('900 16px Orbitron')
    ];

    const results = await Promise.allSettled(fontPromises);
    const successCount = results.filter(result => result.status === 'fulfilled').length;
    
    console.log(`FontAssets: Font preloading completed - ${successCount}/${results.length} successful`);
    
    return successCount > 0;

  } catch (error) {
    console.error('FontAssets: Error preloading fonts:', error);
    return false;
  }
}

