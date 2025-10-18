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
        console.warn('FontPreloader: Font Loading API not available, using CSS fallback method');
        return this.handleAPIUnavailable();
      }

      // Create font loading promises for each weight with individual error handling
      const fontPromises = this.fontConfig.weights.map(weight => 
        this.loadSingleFontWithRetry(this.fontConfig.family, weight)
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
          Promise.allSettled(fontPromises), // Use allSettled to handle partial failures
          timeoutPromise
        ]);

        // Check if at least some fonts loaded successfully
        const hasLoadedFonts = this.loadingStatus.loadedFonts.length > 0;
        const hasFailedFonts = this.loadingStatus.failedFonts.length > 0;

        if (hasLoadedFonts && !hasFailedFonts) {
          // All fonts loaded successfully
          this.loadingStatus.isLoaded = true;
          this.loadingStatus.useFallback = false;
          this.loadingStatus.loadingTime = performance.now() - this.startTime;

          console.log(`FontPreloader: Successfully loaded all ${this.fontConfig.family} fonts in ${this.loadingStatus.loadingTime.toFixed(2)}ms`);
          return true;

        } else if (hasLoadedFonts && hasFailedFonts) {
          // Partial success - some fonts loaded
          this.loadingStatus.isLoaded = true;
          this.loadingStatus.useFallback = false;
          this.loadingStatus.loadingTime = performance.now() - this.startTime;

          console.warn(`FontPreloader: Partially loaded ${this.fontConfig.family} fonts. Loaded: ${this.loadingStatus.loadedFonts.length}, Failed: ${this.loadingStatus.failedFonts.length}`);
          return true;

        } else {
          // No fonts loaded successfully
          console.warn(`FontPreloader: Failed to load any ${this.fontConfig.family} fonts, using fallback fonts`);
          this.setFallbackMode();
          return false;
        }

      } catch (error) {
        // Timeout or critical loading error occurred
        if (error instanceof Error && error.message.includes('timeout')) {
          console.warn(`FontPreloader: Font loading timed out after ${this.fontConfig.timeout}ms, using fallback fonts`);
          this.handleTimeout();
        } else {
          console.warn(`FontPreloader: Font loading failed with error:`, error);
          this.handleLoadingError(error);
        }
        this.setFallbackMode();
        return false;
      }

    } catch (error) {
      console.error('FontPreloader: Unexpected critical error during font loading:', error);
      this.handleCriticalError(error);
      this.setFallbackMode();
      return false;
    }
  }

  /**
   * Load a single font with specific weight and retry logic
   */
  private async loadSingleFontWithRetry(family: string, weight: number): Promise<void> {
    const maxRetries = 2;
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.loadSingleFont(family, weight);
        return; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 200; // Exponential backoff: 200ms, 400ms
          console.log(`FontPreloader: Retry ${attempt + 1}/${maxRetries} for ${family} ${weight} in ${delay}ms`);
          await this.delay(delay);
        }
      }
    }

    // All retries failed
    console.warn(`FontPreloader: Failed to load ${family} ${weight} after ${maxRetries + 1} attempts:`, lastError);
    this.loadingStatus.failedFonts.push(`${family} ${weight}`);
    this.handleFontLoadError(family, weight, lastError);
  }

  /**
   * Load a single font with specific weight
   */
  private async loadSingleFont(family: string, weight: number): Promise<void> {
    try {
      const fontPath = `./fonts/poppins-${this.getWeightName(weight)}.woff2`;
      
      // Validate font path exists before attempting to load
      if (!this.validateFontPath(fontPath)) {
        throw new Error(`Font file not found: ${fontPath}`);
      }

      // Try WOFF2 first, fallback to TTF
      const woff2Path = `./fonts/poppins-${this.getWeightName(weight)}.woff2`;
      const ttfPath = `./fonts/poppins-${this.getWeightName(weight)}.ttf`;
      
      const fontFace = new FontFace(
        family,
        `url('${woff2Path}') format('woff2'), url('${ttfPath}') format('truetype')`,
        { 
          weight: weight.toString(),
          display: 'swap' // Ensure fallback fonts show immediately
        }
      );

      const loadedFont = await fontFace.load();
      
      // Verify the font loaded correctly
      if (loadedFont.status !== 'loaded') {
        throw new Error(`Font failed to load properly, status: ${loadedFont.status}`);
      }

      // Add to document fonts and wait for it to be ready
      (document.fonts as any).add(loadedFont);
      
      // Ensure font is actually ready for use by waiting for document.fonts.ready
      await document.fonts.ready;
      
      // Additional verification that font is available
      if (!this.verifyFontAvailable(family, weight)) {
        throw new Error(`Font ${family} ${weight} not available after loading`);
      }
      
      this.loadingStatus.loadedFonts.push(`${family} ${weight}`);
      console.log(`FontPreloader: Successfully loaded and verified ${family} ${weight}`);

    } catch (error) {
      // Categorize the error for better handling
      if (error instanceof Error) {
        if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
          throw new Error(`Network error loading font ${family} ${weight}: ${error.message}`);
        } else if (error.message.includes('not found')) {
          throw new Error(`Font file not found for ${family} ${weight}: ${error.message}`);
        } else if (error.message.includes('format')) {
          throw new Error(`Invalid font format for ${family} ${weight}: ${error.message}`);
        }
      }
      
      throw error; // Re-throw with original error if not categorized
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
          src: url('./fonts/poppins-${weightName}.woff2') format('woff2'),
               url('./fonts/poppins-${weightName}.ttf') format('truetype');
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

  /**
   * Handle Font Loading API unavailability
   */
  private async handleAPIUnavailable(): Promise<boolean> {
    console.info('FontPreloader: Font Loading API not available, using CSS fallback method');
    
    try {
      // Inject CSS font declarations
      this.injectFontCSS();
      
      // Wait a short time for CSS fonts to load
      await this.delay(500);
      
      // Check if fonts are available using CSS method
      const fontsAvailable = this.checkFontsAvailableCSS();
      
      if (fontsAvailable) {
        this.loadingStatus.isLoaded = true;
        this.loadingStatus.useFallback = false;
        this.loadingStatus.loadingTime = performance.now() - this.startTime;
        this.loadingStatus.loadedFonts = this.fontConfig.weights.map(w => `${this.fontConfig.family} ${w} (CSS)`);
        
        console.log(`FontPreloader: CSS fallback method succeeded in ${this.loadingStatus.loadingTime.toFixed(2)}ms`);
        return true;
      } else {
        console.warn('FontPreloader: CSS fallback method failed, using system fonts');
        this.setFallbackMode();
        return false;
      }
      
    } catch (error) {
      console.error('FontPreloader: CSS fallback method failed:', error);
      this.setFallbackMode();
      return false;
    }
  }

  /**
   * Handle font loading timeout
   */
  private handleTimeout(): void {
    const timeoutMs = this.fontConfig.timeout;
    console.warn(`FontPreloader: Font loading timed out after ${timeoutMs}ms`);
    
    // Log timeout details for debugging
    console.log('FontPreloader: Timeout details:', {
      elapsedTime: performance.now() - this.startTime,
      configuredTimeout: timeoutMs,
      loadedFonts: this.loadingStatus.loadedFonts,
      failedFonts: this.loadingStatus.failedFonts,
      userAgent: navigator.userAgent,
      connectionType: (navigator as any).connection?.effectiveType || 'unknown'
    });
  }

  /**
   * Handle general font loading errors
   */
  private handleLoadingError(error: any): void {
    console.warn('FontPreloader: Font loading error:', error);
    
    // Log error details for debugging
    console.log('FontPreloader: Error details:', {
      errorMessage: error?.message || 'Unknown error',
      errorType: error?.constructor?.name || 'Unknown',
      loadedFonts: this.loadingStatus.loadedFonts,
      failedFonts: this.loadingStatus.failedFonts,
      elapsedTime: performance.now() - this.startTime
    });
  }

  /**
   * Handle critical errors that prevent font loading entirely
   */
  private handleCriticalError(error: any): void {
    console.error('FontPreloader: Critical font loading error:', error);
    
    // Log critical error details for debugging
    console.error('FontPreloader: Critical error details:', {
      errorMessage: error?.message || 'Unknown critical error',
      errorStack: error?.stack || 'No stack trace',
      errorType: error?.constructor?.name || 'Unknown',
      browserInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      },
      documentState: document.readyState,
      fontAPISupport: 'fonts' in document
    });
  }

  /**
   * Handle individual font loading errors
   */
  private handleFontLoadError(family: string, weight: number, error: any): void {
    const errorType = this.categorizeError(error);
    
    console.warn(`FontPreloader: ${errorType} error loading ${family} ${weight}:`, error);
    
    // Log specific font error for debugging
    console.log('FontPreloader: Font-specific error details:', {
      family,
      weight,
      errorType,
      errorMessage: error?.message || 'Unknown error',
      fontPath: `./fonts/poppins-${this.getWeightName(weight)}.ttf`,
      loadedFonts: this.loadingStatus.loadedFonts,
      failedFonts: this.loadingStatus.failedFonts
    });
  }

  /**
   * Categorize error types for better debugging
   */
  private categorizeError(error: any): string {
    if (!error || !error.message) return 'Unknown';
    
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network';
    } else if (message.includes('not found') || message.includes('404')) {
      return 'File Not Found';
    } else if (message.includes('format') || message.includes('invalid')) {
      return 'Format';
    } else if (message.includes('timeout')) {
      return 'Timeout';
    } else if (message.includes('cors')) {
      return 'CORS';
    } else {
      return 'Unknown';
    }
  }

  /**
   * Validate font path exists (basic check)
   */
  private validateFontPath(fontPath: string): boolean {
    // Basic validation - check if path looks correct
    const validExtensions = ['.ttf', '.woff', '.woff2', '.otf'];
    const hasValidExtension = validExtensions.some(ext => fontPath.toLowerCase().includes(ext));
    
    if (!hasValidExtension) {
      console.warn(`FontPreloader: Invalid font file extension in path: ${fontPath}`);
      return false;
    }
    
    return true;
  }

  /**
   * Check if fonts are available using CSS method
   */
  private checkFontsAvailableCSS(): boolean {
    try {
      // Create a test element to check font availability
      const testElement = document.createElement('div');
      testElement.style.fontFamily = this.fontConfig.family;
      testElement.style.fontSize = '12px';
      testElement.style.position = 'absolute';
      testElement.style.left = '-9999px';
      testElement.style.top = '-9999px';
      testElement.textContent = 'Test';
      
      document.body.appendChild(testElement);
      
      // Get computed style to check if font is applied
      const computedStyle = window.getComputedStyle(testElement);
      const appliedFont = computedStyle.fontFamily;
      
      document.body.removeChild(testElement);
      
      // Check if our font family is in the applied font list
      const fontApplied = appliedFont.toLowerCase().includes(this.fontConfig.family.toLowerCase());
      
      console.log(`FontPreloader: CSS font check - Applied: ${appliedFont}, Target: ${this.fontConfig.family}, Success: ${fontApplied}`);
      
      return fontApplied;
      
    } catch (error) {
      console.warn('FontPreloader: CSS font availability check failed:', error);
      return false;
    }
  }

  /**
   * Verify that a font is actually available for use
   */
  private verifyFontAvailable(family: string, weight: number): boolean {
    try {
      // Create a test canvas to verify font rendering
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.warn('FontPreloader: Cannot create canvas context for font verification');
        return false;
      }
      
      // Set font and measure text
      ctx.font = `${weight} 16px ${family}`;
      const metrics = ctx.measureText('Test');
      
      // If we can measure text, the font is likely available
      const isAvailable = metrics.width > 0;
      
      console.log(`FontPreloader: Font verification for ${family} ${weight}: ${isAvailable ? 'PASS' : 'FAIL'}`);
      return isAvailable;
      
    } catch (error) {
      console.warn(`FontPreloader: Font verification failed for ${family} ${weight}:`, error);
      return false;
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get comprehensive error summary for debugging
   */
  public getErrorSummary(): {
    hasErrors: boolean;
    loadingTime: number;
    successRate: number;
    errors: string[];
    recommendations: string[];
  } {
    const totalFonts = this.fontConfig.weights.length;
    const loadedCount = this.loadingStatus.loadedFonts.length;
    const failedCount = this.loadingStatus.failedFonts.length;
    const successRate = totalFonts > 0 ? (loadedCount / totalFonts) * 100 : 0;
    
    const errors: string[] = [];
    const recommendations: string[] = [];
    
    if (failedCount > 0) {
      errors.push(`${failedCount} font(s) failed to load: ${this.loadingStatus.failedFonts.join(', ')}`);
    }
    
    if (this.loadingStatus.useFallback) {
      errors.push('Using fallback system fonts instead of primary font');
    }
    
    if (this.loadingStatus.loadingTime > 2000) {
      errors.push(`Font loading took ${this.loadingStatus.loadingTime.toFixed(0)}ms (>2s)`);
      recommendations.push('Consider optimizing font files or increasing timeout');
    }
    
    if (successRate < 100 && successRate > 0) {
      recommendations.push('Check font file paths and network connectivity');
    }
    
    if (successRate === 0) {
      recommendations.push('Verify font files exist and are accessible');
    }
    
    if (errors.length === 0) {
      recommendations.push('Font loading completed successfully');
    }
    
    return {
      hasErrors: errors.length > 0,
      loadingTime: this.loadingStatus.loadingTime,
      successRate,
      errors,
      recommendations
    };
  }
}
