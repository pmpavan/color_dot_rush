/**
 * Font Loader Utility
 * Handles dynamic font loading with proper asset paths
 */

export class FontLoader {
  private static instance: FontLoader;
  private loadedFonts: Set<string> = new Set();
  private fontUrls: Map<string, string> = new Map();

  private constructor() {
    this.initializeFontUrls();
  }

  public static getInstance(): FontLoader {
    if (!FontLoader.instance) {
      FontLoader.instance = new FontLoader();
    }
    return FontLoader.instance;
  }

  /**
   * Initialize font URLs using dynamic imports
   */
  private initializeFontUrls(): void {
    try {
      // Import font files dynamically to get the correct URLs
      // This will work with Vite's asset processing
      const fontImports = {
        'poppins-regular-woff2': () => import('/public/fonts/poppins-regular.woff2?url'),
        'poppins-regular-ttf': () => import('/public/fonts/poppins-regular.ttf?url'),
        'poppins-medium-woff2': () => import('/public/fonts/poppins-medium.woff2?url'),
        'poppins-medium-ttf': () => import('/public/fonts/poppins-medium.ttf?url'),
        'poppins-bold-woff2': () => import('/public/fonts/poppins-bold.woff2?url'),
        'poppins-bold-ttf': () => import('/public/fonts/poppins-bold.ttf?url'),
      };

      // Store the import functions for later use
      Object.entries(fontImports).forEach(([key, importFn]) => {
        this.fontUrls.set(key, importFn.toString());
      });

      console.log('FontLoader: Font URLs initialized');
    } catch (error) {
      console.warn('FontLoader: Error initializing font URLs:', error);
    }
  }

  /**
   * Load fonts dynamically and inject CSS
   */
  public async loadFonts(): Promise<boolean> {
    console.log('FontLoader: Starting dynamic font loading');
    
    try {
      // Try to load fonts using the Font Loading API
      if (typeof document !== 'undefined' && document.fonts) {
        // Load fonts with fallback to system fonts (optimized - only essential sizes)
        const fontPromises = [
          document.fonts.load('16px Orbitron'),
          document.fonts.load('500 16px Orbitron'),
          document.fonts.load('700 16px Orbitron'),
          document.fonts.load('900 16px Orbitron')
        ];

        const results = await Promise.allSettled(fontPromises);
        const successCount = results.filter(result => result.status === 'fulfilled').length;
        
        console.log(`FontLoader: Font loading completed - ${successCount}/${results.length} successful`);
        
        if (successCount > 0) {
          this.loadedFonts.add('poppins-loaded');
          return true;
        }
      }

      // Fallback: inject CSS with system fonts
      this.injectFallbackCSS();
      return false;

    } catch (error) {
      console.error('FontLoader: Error loading fonts:', error);
      this.injectFallbackCSS();
      return false;
    }
  }

  /**
   * Inject fallback CSS with system fonts
   */
  private injectFallbackCSS(): void {
    console.log('FontLoader: Injecting fallback CSS with system fonts');
    
    try {
      if (typeof document === 'undefined') {
        return;
      }

      // Check if CSS is already injected
      const existingStyle = document.getElementById('font-loader-fallback-css');
      if (existingStyle) {
        return;
      }

      const style = document.createElement('style');
      style.id = 'font-loader-fallback-css';
      style.textContent = `
        @font-face {
          font-family: 'Orbitron';
          font-style: normal;
          font-weight: 400;
          src: local('Arial'), local('Helvetica'), local('sans-serif');
          font-display: swap;
        }
        @font-face {
          font-family: 'Orbitron';
          font-style: normal;
          font-weight: 500;
          src: local('Arial'), local('Helvetica'), local('sans-serif');
          font-display: swap;
        }
        @font-face {
          font-family: 'Orbitron';
          font-style: normal;
          font-weight: 700;
          src: local('Arial Bold'), local('Helvetica Bold'), local('sans-serif');
          font-display: swap;
        }
      `;
      
      document.head.appendChild(style);
      console.log('FontLoader: Fallback CSS injected successfully');
      
    } catch (error) {
      console.error('FontLoader: Error injecting fallback CSS:', error);
    }
  }

  /**
   * Check if fonts are loaded
   */
  public areFontsLoaded(): boolean {
    return this.loadedFonts.has('poppins-loaded');
  }

  /**
   * Get current font family
   */
  public getFontFamily(): string {
    return this.areFontsLoaded() ? 'Orbitron, Arial, sans-serif' : 'Arial, sans-serif';
  }

  /**
   * Clear loaded fonts cache
   */
  public clearCache(): void {
    this.loadedFonts.clear();
    this.fontUrls.clear();
  }
}
