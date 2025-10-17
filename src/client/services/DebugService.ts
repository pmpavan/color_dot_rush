import { 
  IDebugService, 
  DifficultyParams, 
  DebugConfig, 
  DEFAULT_DIFFICULTY_PARAMS, 
  DEFAULT_DEBUG_CONFIG 
} from '../../shared/types/debug';

export class DebugService implements IDebugService {
  private static instance: IDebugService;
  private difficultyParams: DifficultyParams;
  private debugConfig: DebugConfig;
  private debugPanel: HTMLElement | null = null;
  private onDifficultyChangeCallback: ((params: DifficultyParams) => void) | null = null;
  private onHitboxToggleCallback: ((enabled: boolean) => void) | null = null;

  private constructor() {
    this.difficultyParams = { ...DEFAULT_DIFFICULTY_PARAMS };
    this.debugConfig = { ...DEFAULT_DEBUG_CONFIG };
  }

  public static getInstance(): IDebugService {
    if (!DebugService.instance) {
      // Use environment variable to determine which service to instantiate
      if (process.env.NODE_ENV === 'production') {
        DebugService.instance = new ProductionDebugService();
      } else {
        DebugService.instance = new DebugService();
      }
    }
    return DebugService.instance;
  }

  public isEnabled(): boolean {
    return this.debugConfig.enabled;
  }

  public showDebugPanel(): void {
    if (!this.isEnabled()) return;
    
    if (!this.debugPanel) {
      this.createDebugPanel();
    }
    
    if (this.debugPanel) {
      this.debugPanel.style.display = 'block';
    }
  }

  public hideDebugPanel(): void {
    if (this.debugPanel) {
      this.debugPanel.style.display = 'none';
    }
  }

  public toggleDebugPanel(): void {
    if (!this.isEnabled()) return;
    
    if (!this.debugPanel) {
      this.showDebugPanel();
    } else {
      const isVisible = this.debugPanel.style.display !== 'none';
      if (isVisible) {
        this.hideDebugPanel();
      } else {
        this.showDebugPanel();
      }
    }
  }

  public updateDifficultyParams(params: Partial<DifficultyParams>): void {
    this.difficultyParams = { ...this.difficultyParams, ...params };
    this.updateDebugPanelValues();
    
    if (this.onDifficultyChangeCallback) {
      this.onDifficultyChangeCallback(this.difficultyParams);
    }
  }

  public getDifficultyParams(): DifficultyParams {
    return { ...this.difficultyParams };
  }

  public visualizeHitboxes(enabled: boolean): void {
    this.debugConfig.showHitboxes = enabled;
    
    if (this.onHitboxToggleCallback) {
      this.onHitboxToggleCallback(enabled);
    }
  }

  public isHitboxVisualizationEnabled(): boolean {
    return this.debugConfig.showHitboxes;
  }

  public getDebugConfig(): DebugConfig {
    return { ...this.debugConfig };
  }

  public updateDebugConfig(config: Partial<DebugConfig>): void {
    this.debugConfig = { ...this.debugConfig, ...config };
  }

  // Callback registration for game integration
  public onDifficultyChange(callback: (params: DifficultyParams) => void): void {
    this.onDifficultyChangeCallback = callback;
  }

  public onHitboxToggle(callback: (enabled: boolean) => void): void {
    this.onHitboxToggleCallback = callback;
  }

  private createDebugPanel(): void {
    // Create debug panel container
    this.debugPanel = document.createElement('div');
    this.debugPanel.id = 'debug-panel';
    this.debugPanel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px;
      border-radius: 8px;
      font-family: 'Poppins', Arial, sans-serif;
      font-size: 12px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      border: 1px solid #3498DB;
    `;

    // Create panel content
    this.debugPanel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h3 style="margin: 0; color: #3498DB; font-size: 14px;">Debug Panel</h3>
        <button id="debug-close" style="background: #E74C3C; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">×</button>
      </div>
      
      <div style="margin-bottom: 15px;">
        <h4 style="margin: 0 0 8px 0; color: #ECF0F1; font-size: 12px;">Difficulty Parameters</h4>
        
        <div style="margin-bottom: 8px;">
          <label style="display: block; margin-bottom: 2px;">Base Speed: <span id="baseSpeed-value">${this.difficultyParams.baseSpeed}</span> px/sec</label>
          <input type="range" id="baseSpeed" min="50" max="200" step="5" value="${this.difficultyParams.baseSpeed}" 
                 style="width: 100%; margin-bottom: 4px;">
        </div>
        
        <div style="margin-bottom: 8px;">
          <label style="display: block; margin-bottom: 2px;">Growth Rate: <span id="growthRate-value">${this.difficultyParams.growthRate}</span></label>
          <input type="range" id="growthRate" min="1.01" max="1.10" step="0.01" value="${this.difficultyParams.growthRate}" 
                 style="width: 100%; margin-bottom: 4px;">
        </div>
        
        <div style="margin-bottom: 8px;">
          <label style="display: block; margin-bottom: 2px;">Base Size: <span id="baseSize-value">${this.difficultyParams.baseSize}</span> px</label>
          <input type="range" id="baseSize" min="40" max="120" step="5" value="${this.difficultyParams.baseSize}" 
                 style="width: 100%; margin-bottom: 4px;">
        </div>
        
        <div style="margin-bottom: 8px;">
          <label style="display: block; margin-bottom: 2px;">Shrink Rate: <span id="shrinkRate-value">${this.difficultyParams.shrinkRate}</span></label>
          <input type="range" id="shrinkRate" min="0.95" max="0.99" step="0.01" value="${this.difficultyParams.shrinkRate}" 
                 style="width: 100%; margin-bottom: 4px;">
        </div>
      </div>
      
      <div style="margin-bottom: 15px;">
        <h4 style="margin: 0 0 8px 0; color: #ECF0F1; font-size: 12px;">Visualization</h4>
        
        <div style="margin-bottom: 8px;">
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="checkbox" id="showHitboxes" ${this.debugConfig.showHitboxes ? 'checked' : ''} 
                   style="margin-right: 8px;">
            Show Hitboxes
          </label>
        </div>
        
        <div style="margin-bottom: 8px;">
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="checkbox" id="showFPS" ${this.debugConfig.showFPS ? 'checked' : ''} 
                   style="margin-right: 8px;">
            Show FPS
          </label>
        </div>
        
        <div style="margin-bottom: 8px;">
          <label style="display: flex; align-items: center; cursor: pointer;">
            <input type="checkbox" id="showObjectCount" ${this.debugConfig.showObjectCount ? 'checked' : ''} 
                   style="margin-right: 8px;">
            Show Object Count
          </label>
        </div>
      </div>
      
      <div style="margin-bottom: 10px;">
        <button id="reset-params" style="background: #95A5A6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; width: 100%;">
          Reset to Defaults
        </button>
      </div>
      
      <div style="font-size: 10px; color: #95A5A6; text-align: center;">
        Press 'D' to toggle panel
      </div>
    `;

    // Add event listeners
    this.setupDebugPanelEvents();

    // Add to document
    document.body.appendChild(this.debugPanel);

    // Setup keyboard shortcut
    this.setupKeyboardShortcuts();
  }

  private setupDebugPanelEvents(): void {
    if (!this.debugPanel) return;

    // Close button
    const closeBtn = this.debugPanel.querySelector('#debug-close') as HTMLButtonElement;
    closeBtn?.addEventListener('click', () => this.hideDebugPanel());

    // Difficulty parameter sliders
    const baseSpeedSlider = this.debugPanel.querySelector('#baseSpeed') as HTMLInputElement;
    const growthRateSlider = this.debugPanel.querySelector('#growthRate') as HTMLInputElement;
    const baseSizeSlider = this.debugPanel.querySelector('#baseSize') as HTMLInputElement;
    const shrinkRateSlider = this.debugPanel.querySelector('#shrinkRate') as HTMLInputElement;

    baseSpeedSlider?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.updateDifficultyParams({ baseSpeed: value });
    });

    growthRateSlider?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.updateDifficultyParams({ growthRate: value });
    });

    baseSizeSlider?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.updateDifficultyParams({ baseSize: value });
    });

    shrinkRateSlider?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.updateDifficultyParams({ shrinkRate: value });
    });

    // Visualization checkboxes
    const hitboxCheckbox = this.debugPanel.querySelector('#showHitboxes') as HTMLInputElement;
    const fpsCheckbox = this.debugPanel.querySelector('#showFPS') as HTMLInputElement;
    const objectCountCheckbox = this.debugPanel.querySelector('#showObjectCount') as HTMLInputElement;

    hitboxCheckbox?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      this.visualizeHitboxes(enabled);
    });

    fpsCheckbox?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      this.updateDebugConfig({ showFPS: enabled });
    });

    objectCountCheckbox?.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      this.updateDebugConfig({ showObjectCount: enabled });
    });

    // Reset button
    const resetBtn = this.debugPanel.querySelector('#reset-params') as HTMLButtonElement;
    resetBtn?.addEventListener('click', () => {
      this.difficultyParams = { ...DEFAULT_DIFFICULTY_PARAMS };
      this.updateDebugPanelValues();
      
      if (this.onDifficultyChangeCallback) {
        this.onDifficultyChangeCallback(this.difficultyParams);
      }
    });
  }

  private updateDebugPanelValues(): void {
    if (!this.debugPanel) return;

    // Update slider values and labels
    const baseSpeedSlider = this.debugPanel.querySelector('#baseSpeed') as HTMLInputElement;
    const baseSpeedValue = this.debugPanel.querySelector('#baseSpeed-value') as HTMLSpanElement;
    if (baseSpeedSlider && baseSpeedValue) {
      baseSpeedSlider.value = this.difficultyParams.baseSpeed.toString();
      baseSpeedValue.textContent = this.difficultyParams.baseSpeed.toString();
    }

    const growthRateSlider = this.debugPanel.querySelector('#growthRate') as HTMLInputElement;
    const growthRateValue = this.debugPanel.querySelector('#growthRate-value') as HTMLSpanElement;
    if (growthRateSlider && growthRateValue) {
      growthRateSlider.value = this.difficultyParams.growthRate.toString();
      growthRateValue.textContent = this.difficultyParams.growthRate.toString();
    }

    const baseSizeSlider = this.debugPanel.querySelector('#baseSize') as HTMLInputElement;
    const baseSizeValue = this.debugPanel.querySelector('#baseSize-value') as HTMLSpanElement;
    if (baseSizeSlider && baseSizeValue) {
      baseSizeSlider.value = this.difficultyParams.baseSize.toString();
      baseSizeValue.textContent = this.difficultyParams.baseSize.toString();
    }

    const shrinkRateSlider = this.debugPanel.querySelector('#shrinkRate') as HTMLInputElement;
    const shrinkRateValue = this.debugPanel.querySelector('#shrinkRate-value') as HTMLSpanElement;
    if (shrinkRateSlider && shrinkRateValue) {
      shrinkRateSlider.value = this.difficultyParams.shrinkRate.toString();
      shrinkRateValue.textContent = this.difficultyParams.shrinkRate.toString();
    }
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      if (!this.isEnabled()) return;
      
      // Toggle debug panel with 'D' key
      if (event.key.toLowerCase() === 'd' && !event.ctrlKey && !event.altKey && !event.metaKey) {
        // Only if not typing in an input field
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          return;
        }
        
        event.preventDefault();
        this.toggleDebugPanel();
      }
    });
  }

  // Clean up method for when the service is no longer needed
  public destroy(): void {
    if (this.debugPanel) {
      document.body.removeChild(this.debugPanel);
      this.debugPanel = null;
    }
    
    this.onDifficultyChangeCallback = null;
    this.onHitboxToggleCallback = null;
  }
}

// Production stub - disabled debug service for production builds
export class ProductionDebugService implements IDebugService {
  public isEnabled(): boolean { return false; }
  public showDebugPanel(): void { /* No-op in production */ }
  public hideDebugPanel(): void { /* No-op in production */ }
  public toggleDebugPanel(): void { /* No-op in production */ }
  public updateDifficultyParams(_params: Partial<DifficultyParams>): void { /* No-op in production */ }
  public getDifficultyParams(): DifficultyParams { return { ...DEFAULT_DIFFICULTY_PARAMS }; }
  public visualizeHitboxes(_enabled: boolean): void { /* No-op in production */ }
  public isHitboxVisualizationEnabled(): boolean { return false; }
  public getDebugConfig(): DebugConfig { return { ...DEFAULT_DEBUG_CONFIG, enabled: false }; }
  public updateDebugConfig(_config: Partial<DebugConfig>): void { /* No-op in production */ }
  
  // Callback registration methods (no-op in production)
  public onDifficultyChange(_callback: (params: DifficultyParams) => void): void { /* No-op in production */ }
  public onHitboxToggle(_callback: (enabled: boolean) => void): void { /* No-op in production */ }
}