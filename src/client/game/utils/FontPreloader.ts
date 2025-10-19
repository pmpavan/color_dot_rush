/**
 * Font Preloader Utility
 * Ensures fonts are loaded before UI creation
 */

import { preloadFonts, injectFontCSS } from '../assets/FontAssets';

export interface FontLoadResult {
  success: boolean;
  fontsLoaded: string[];
  fontsFailed: string[];
  fallbackUsed: boolean;
}

export interface FontLoadingStatus {
  isLoaded: boolean;
  fontsLoaded: string[];
  fontsFailed: string[];
  fallbackUsed: boolean;
  currentFontFamily: string;
}

export class FontPreloader {
  private static instance: FontPreloader;
  private loadedFonts: Set<string> = new Set();
  private loadingPromises: Map<string, Promise<boolean>> = new Map();
  private lastLoadResult: FontLoadResult | null = null;
  private currentFontFamily: string = 'Poppins, Arial, sans-serif';

  private constructor() {}

  public static getInstance(): FontPreloader {
    if (!FontPreloader.instance) {
      FontPreloader.instance = new FontPreloader();
    }
    return FontPreloader.instance;
  }

  /**
   * Preload all required fonts for the game
   */
  public async preloadFonts(): Promise<FontLoadResult> {
    console.log('FontPreloader: Starting font preload process');
    
    const results: FontLoadResult = {
      success: false,
      fontsLoaded: [],
      fontsFailed: [],
      fallbackUsed: false
    };

    try {
      // Use the bundled font assets for preloading
      const success = await preloadFonts();
      
      if (success) {
        results.success = true;
        results.fontsLoaded = ['Poppins Regular', 'Poppins Medium', 'Poppins Bold'];
        this.currentFontFamily = 'Poppins, Arial, sans-serif';
        this.loadedFonts.add('poppins-loaded');
      } else {
        results.fallbackUsed = true;
        results.success = false;
        results.fontsFailed = ['Poppins Regular', 'Poppins Medium', 'Poppins Bold'];
        this.currentFontFamily = 'Arial, sans-serif';
      }

      // Store the result for status queries
      this.lastLoadResult = results;

      console.log('FontPreloader: Font preload completed', {
        loaded: results.fontsLoaded.length,
        failed: results.fontsFailed.length,
        success: results.success,
        fallbackUsed: results.fallbackUsed,
        fontFamily: this.currentFontFamily
      });

      return results;

    } catch (error) {
      console.error('FontPreloader: Error during font preload:', error);
      results.fallbackUsed = true;
      results.success = false;
      results.fontsFailed = ['Poppins Regular', 'Poppins Medium', 'Poppins Bold'];
      this.currentFontFamily = 'Arial, sans-serif';
      this.lastLoadResult = results;
      return results;
    }
  }


  /**
   * Check if a font is loaded
   */
  public isFontLoaded(fontSpec: string): boolean {
    return this.loadedFonts.has(fontSpec);
  }

  /**
   * Get all loaded fonts
   */
  public getLoadedFonts(): string[] {
    return Array.from(this.loadedFonts);
  }

  /**
   * Clear loaded fonts cache (for testing)
   */
  public clearCache(): void {
    this.loadedFonts.clear();
    this.loadingPromises.clear();
    this.lastLoadResult = null;
  }

  /**
   * Get current loading status
   */
  public getLoadingStatus(): FontLoadingStatus {
    return {
      isLoaded: this.lastLoadResult?.success || false,
      fontsLoaded: this.lastLoadResult?.fontsLoaded || [],
      fontsFailed: this.lastLoadResult?.fontsFailed || [],
      fallbackUsed: this.lastLoadResult?.fallbackUsed || true,
      currentFontFamily: this.currentFontFamily
    };
  }

  /**
   * Get current font family
   */
  public getFontFamily(): string {
    return this.currentFontFamily;
  }

  /**
   * Inject font CSS for fallback loading
   */
  public injectFontCSS(): void {
    console.log('FontPreloader: Injecting bundled font CSS');
    injectFontCSS();
  }
}