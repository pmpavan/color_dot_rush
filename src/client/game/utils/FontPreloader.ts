/**
 * FontPreloader - Handles async font loading with timeout and fallback management
 * 
 * Requirements addressed:
 * - 1.1: Display Poppins font family with proper fallbacks
 * - 1.2: Display system fonts without visual degradation if Poppins unavailable
 * - 1.3: Preload all required font weights before displaying text elements
 * - 5.1: Progressive font loading with immediate fallback display
 * - 5.2: Proceed with system fonts if loading exceeds timeout threshold
 */

export interface FontLoadingStatus {
  isLoaded: boolean;
  loadedFonts: string[];
  failedFonts: string[];
  useFallback: boolean;
  loadingTime: number;
}

export interface FontConfig {
  family: string;
  weights: number[];
  timeout: number;
  fallbackFonts: string[];
}

export class FontPreloader {
  private static instance: FontPreloader | null = null;
  private fontConfig: FontConfig;
  private loadingStatus: FontLoadingStatus;
  private loadingPromise: Promise<boolean> | null = null;
  private startTime: number = 0;

  constructor(config?: Partial<FontConfig>) {
    this.fontConfig = {
      family: 'Poppins',
      weights: [400, 500, 700], // Regular, Medium, Bold
      timeout: 2000, // 2 seconds as per requirements
      fallbackFonts: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      ...config
    };

    this.loadingStatus = {
      isLoaded: false,
      loadedFonts: [],
      failedFonts: [],
      useFallback: false,
      loadingTime: 0
    };
  }

  /**
   * Get singleton instance of FontPreloader
   */
  public static getInstance(config?: Partial<FontConfig>): FontPreloader {
    if (!FontPreloader.instance) {
      FontPreloader.instance = new FontPreloader(config);
    }
    return FontPreloader.instance;
  }

  /**
   * Preload fonts with timeout handling
   * Returns true if fonts loaded successfully, false if using fallbacks
   */
  public async preloadFonts(): Promise<boolean> {
    // Return existing promise if already loading
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.startTime = performance.now();
    console.log(`FontPreloader: Starting font loading for ${this.fontConfig.family}...`);

    this.loadingPromise = this.loadFontsWithTimeout();
    return this.loadingPromise;
  }

  /**
   * Load fonts with timeout handling
   */
  private async loadFontsWithTimeout(): Promise<boolean> {
    try {
      // Check if Font Loading API is available
      if (!('fonts' in document)) {
        console.warn('FontPreloader: Font Loading API not available, using fallback fonts');
        this.setFallbackMode();
        return false;
      }

      // Create font loading promises for each weight
      const fontPromises = this.fontConfig.weights.map(weight => 
        this.loadSingleFont(this.fontConfig.family, weight)
      );

      // Race between font loading and timeout
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Font loading timeout after ${this.fontConfig.timeout}ms`));
        }, this.fontConfig.timeout);
      });

      try {
        // Wait for all fonts to load or timeout
        await Promise.race([
          Promise.all(fontPromises),
          timeoutPromise
        ]);

        // All fonts loaded successfully
        this.loadingStatus.isLoaded = true;
        this.loadingStatus.useFallback = false;
        this.loadingStatus.loadingTime = performance.now() - this.startTime;

        console.log(`FontPreloader: Successfully loaded ${this.fontConfig.family} fonts in ${this.loadingStatus.loadingTime.toFixed(2)}ms`);
        return true;

      } catch (error) {
        // Timeout or loading error occurred
        console.warn(`FontPreloader: Font loading failed or timed out:`, error);
        this.setFallbackMode();
        return false;
      }

    } catch (error) {
      console.error('FontPreloader: Unexpected error during font loading:', error);
      this.setFallbackMode();
      return false;
    }
  }

  /**
   * Load a single font with specific weight
   */
  private async loadSingleFont(family: string, weight: number): Promise<void> {
    try {
      const fontFace = new FontFace(
        family,
        `url('./fonts/poppins-${this.getWeightName(weight)}.ttf')`,
        { weight: weight.toString() }
      );

      const loadedFont = await fontFace.load();
      (document.fonts as any).add(loadedFont);
      
      this.loadingStatus.loadedFonts.push(`${family} ${weight}`);
      console.log(`FontPreloader: Loaded ${family} ${weight}`);

    } catch (error) {
      console.warn(`FontPreloader: Failed to load ${family} ${weight}:`, error);
      this.loadingStatus.failedFonts.push(`${family} ${weight}`);
      throw error; // Re-throw to trigger fallback mode
    }
  }

  /**
   * Get weight name for font file
   */
  private getWeightName(weight: number): string {
    switch (weight) {
      case 400: return 'regular';
      case 500: return 'medium';
      case 700: return 'bold';
      default: return 'regular';
    }
  }

  /**
   * Set fallback mode when font loading fails
   */
  private setFallbackMode(): void {
    this.loadingStatus.isLoaded = true; // Mark as "loaded" to proceed
    this.loadingStatus.useFallback = true;
    this.loadingStatus.loadingTime = performance.now() - this.startTime;
    
    console.log(`FontPreloader: Using fallback fonts after ${this.loadingStatus.loadingTime.toFixed(2)}ms`);
  }

  /**
   * Get the complete font family string with fallbacks
   */
  public getFontFamily(): string {
    if (this.loadingStatus.useFallback) {
      // Return only system fonts if Poppins failed to load
      return this.fontConfig.fallbackFonts.join(', ');
    }
    
    // Return Poppins with fallbacks
    return `${this.fontConfig.family}, ${this.fontConfig.fallbackFonts.join(', ')}`;
  }

  /**
   * Check if fonts are loaded (or fallback mode is active)
   */
  public isLoaded(): boolean {
    return this.loadingStatus.isLoaded;
  }

  /**
   * Check if using fallback fonts
   */
  public isUsingFallback(): boolean {
    return this.loadingStatus.useFallback;
  }

  /**
   * Get detailed loading status for debugging
   */
  public getLoadingStatus(): FontLoadingStatus {
    return { ...this.loadingStatus };
  }

  /**
   * Get font loading indicators for UI display
   */
  public getLoadingIndicators(): {
    isLoading: boolean;
    progress: number;
    message: string;
  } {
    if (this.loadingStatus.isLoaded) {
      return {
        isLoading: false,
        progress: 100,
        message: this.loadingStatus.useFallback ? 'Using system fonts' : 'Fonts loaded'
      };
    }

    if (this.loadingPromise) {
      const elapsed = performance.now() - this.startTime;
      const progress = Math.min((elapsed / this.fontConfig.timeout) * 100, 95);
      
      return {
        isLoading: true,
        progress,
        message: 'Loading fonts...'
      };
    }

    return {
      isLoading: false,
      progress: 0,
      message: 'Ready to load fonts'
    };
  }

  /**
   * Reset the font preloader (useful for testing)
   */
  public reset(): void {
    this.loadingPromise = null;
    this.loadingStatus = {
      isLoaded: false,
      loadedFonts: [],
      failedFonts: [],
      useFallback: false,
      loadingTime: 0
    };
    this.startTime = 0;
  }

  /**
   * Create CSS @font-face declarations for manual loading
   * (Alternative approach if Font Loading API is not available)
   */
  public createFontFaceCSS(): string {
    const fontFaces = this.fontConfig.weights.map(weight => {
      const weightName = this.getWeightName(weight);
      return `
        @font-face {
          font-family: '${this.fontConfig.family}';
          src: url('./fonts/poppins-${weightName}.ttf') format('truetype');
          font-weight: ${weight};
          font-display: swap;
        }
      `;
    }).join('\n');

    return fontFaces;
  }

  /**
   * Inject font CSS into document head
   */
  public injectFontCSS(): void {
    const existingStyle = document.getElementById('font-preloader-css');
    if (existingStyle) {
      return; // Already injected
    }

    const style = document.createElement('style');
    style.id = 'font-preloader-css';
    style.textContent = this.createFontFaceCSS();
    document.head.appendChild(style);
    
    console.log('FontPreloader: Injected font CSS declarations');
  }
}
