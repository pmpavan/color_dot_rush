/**
 * Font Assets - Bundled font imports for Devvit app
 * This ensures fonts are properly bundled and served locally
 */

// Import font files as URLs - Vite will process these and provide the correct paths
import poppinsRegularWoff2 from '/public/fonts/poppins-regular.woff2?url';
import poppinsMediumWoff2 from '/public/fonts/poppins-medium.woff2?url';
import poppinsBoldWoff2 from '/public/fonts/poppins-bold.woff2?url';

export interface FontAssets {
  regular: string;
  medium: string;
  bold: string;
}

/**
 * Bundled font assets with correct URLs - WOFF2 only
 */
export const FONT_ASSETS: FontAssets = {
  regular: poppinsRegularWoff2,
  medium: poppinsMediumWoff2,
  bold: poppinsBoldWoff2,
};

/**
 * Generate CSS for font faces using bundled assets - WOFF2 only
 */
export function generateFontCSS(): string {
  return `
    @font-face {
      font-family: 'Poppins';
      font-style: normal;
      font-weight: 400;
      src: url('${FONT_ASSETS.regular}') format('woff2');
      font-display: swap;
    }
    @font-face {
      font-family: 'Poppins';
      font-style: normal;
      font-weight: 500;
      src: url('${FONT_ASSETS.medium}') format('woff2');
      font-display: swap;
    }
    @font-face {
      font-family: 'Poppins';
      font-style: normal;
      font-weight: 700;
      src: url('${FONT_ASSETS.bold}') format('woff2');
      font-display: swap;
    }
  `;
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
 * Preload fonts using WOFF2 format only
 */
export async function preloadFonts(): Promise<boolean> {
  console.log('FontAssets: Starting font preloading with WOFF2 format');
  
  try {
    if (typeof document === 'undefined' || !document.fonts) {
      console.warn('FontAssets: Font API not available');
      return false;
    }

    // Inject WOFF2-only CSS
    injectFontCSS();

    // Wait a bit for CSS to be processed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Load fonts using the Font Loading API
    const fontPromises = [
      document.fonts.load('16px Poppins'),
      document.fonts.load('24px Poppins'),
      document.fonts.load('32px Poppins'),
      document.fonts.load('500 16px Poppins'),
      document.fonts.load('700 16px Poppins')
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

