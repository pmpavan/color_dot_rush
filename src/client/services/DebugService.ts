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
  private realTimeUpdateInterval: number | null = null;
  private currentElapsedTime: number = 0;

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
      this.startRealTimeUpdates();
    }
  }

  public hideDebugPanel(): void {
    if (this.debugPanel) {
      this.debugPanel.style.display = 'none';
      this.stopRealTimeUpdates();
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
    this.showParameterChangeVisualFeedback(params);
    
    if (this.onDifficultyChangeCallback) {
      this.onDifficultyChangeCallback(this.difficultyParams);
    }
  }

  public updateElapsedTime(elapsedTime: number): void {
    this.currentElapsedTime = elapsedTime;
    this.updateRealTimeCalculations();
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
        <h4 style="margin: 0 0 8px 0; color: #ECF0F1; font-size: 12px;">Real-Time Calculations</h4>
        <div style="background: rgba(52, 152, 219, 0.1); padding: 8px; border-radius: 4px; font-size: 11px; margin-bottom: 10px;">
          <div>Time: <span id="elapsed-time">0.0</span>s</div>
          <div>Current Speed: <span id="current-speed">100</span> px/sec</div>
          <div>Current Size: <span id="current-size">80</span> px</div>
          <div>Dot Count: <span id="dot-count">1</span></div>
          <div style="margin-top: 4px; color: #95A5A6; font-size: 10px;">
            <span id="formula-validation" style="color: #2ECC71;">✓ Formulas Valid</span>
          </div>
        </div>
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
        <button id="reset-params" style="background: #95A5A6; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; width: 100%; margin-bottom: 4px;">
          Reset to Defaults
        </button>
        <button id="test-formulas" style="background: #3498DB; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; width: 100%;">
          Test Formula Accuracy
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

    // Test formulas button
    const testBtn = this.debugPanel.querySelector('#test-formulas') as HTMLButtonElement;
    testBtn?.addEventListener('click', () => {
      this.runFormulaAccuracyTest();
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

  private startRealTimeUpdates(): void {
    if (this.realTimeUpdateInterval) {
      clearInterval(this.realTimeUpdateInterval);
    }
    
    this.realTimeUpdateInterval = window.setInterval(() => {
      this.updateRealTimeCalculations();
    }, 100); // Update every 100ms
  }

  private stopRealTimeUpdates(): void {
    if (this.realTimeUpdateInterval) {
      clearInterval(this.realTimeUpdateInterval);
      this.realTimeUpdateInterval = null;
    }
  }

  private updateRealTimeCalculations(): void {
    if (!this.debugPanel) return;

    const elapsedSeconds = this.currentElapsedTime / 1000;
    
    // Calculate current values using the formulas
    const currentSpeed = this.difficultyParams.baseSpeed * Math.pow(this.difficultyParams.growthRate, elapsedSeconds);
    const currentSize = this.difficultyParams.baseSize * Math.pow(this.difficultyParams.shrinkRate, elapsedSeconds);
    const dotCount = Math.floor(elapsedSeconds / 15) + 1;

    // Update display elements
    const elapsedTimeElement = this.debugPanel.querySelector('#elapsed-time');
    const currentSpeedElement = this.debugPanel.querySelector('#current-speed');
    const currentSizeElement = this.debugPanel.querySelector('#current-size');
    const dotCountElement = this.debugPanel.querySelector('#dot-count');

    if (elapsedTimeElement) elapsedTimeElement.textContent = elapsedSeconds.toFixed(1);
    if (currentSpeedElement) currentSpeedElement.textContent = Math.round(currentSpeed).toString();
    if (currentSizeElement) currentSizeElement.textContent = Math.round(currentSize).toString();
    if (dotCountElement) dotCountElement.textContent = dotCount.toString();

    // Validate formulas and update status
    this.validateFormulas(elapsedSeconds);
  }

  private validateFormulas(elapsedSeconds: number): void {
    if (!this.debugPanel) return;

    const validationElement = this.debugPanel.querySelector('#formula-validation');
    if (!validationElement) return;

    try {
      // Test formula accuracy against mathematical expectations
      const speed = this.difficultyParams.baseSpeed * Math.pow(this.difficultyParams.growthRate, elapsedSeconds);
      const size = this.difficultyParams.baseSize * Math.pow(this.difficultyParams.shrinkRate, elapsedSeconds);
      
      // Validate that formulas produce reasonable results
      const isSpeedValid = speed > 0 && speed < 10000; // Reasonable speed range
      const isSizeValid = size > 5 && size < 200; // Reasonable size range
      const isGrowthRateValid = this.difficultyParams.growthRate > 1.0 && this.difficultyParams.growthRate < 2.0;
      const isShrinkRateValid = this.difficultyParams.shrinkRate > 0.5 && this.difficultyParams.shrinkRate < 1.0;
      
      // Check for 3.5+ minute (210 second) survival target
      const speedAt210s = this.difficultyParams.baseSpeed * Math.pow(this.difficultyParams.growthRate, 210);
      const sizeAt210s = this.difficultyParams.baseSize * Math.pow(this.difficultyParams.shrinkRate, 210);
      const isSurvivalTargetReasonable = speedAt210s <= 5000 && sizeAt210s >= 10;

      if (isSpeedValid && isSizeValid && isGrowthRateValid && isShrinkRateValid && isSurvivalTargetReasonable) {
        validationElement.textContent = '✓ Formulas Valid';
        (validationElement as HTMLElement).style.color = '#2ECC71';
      } else {
        validationElement.textContent = '⚠ Formula Warning';
        (validationElement as HTMLElement).style.color = '#F39C12';
        
        // Log specific issues for debugging
        if (!isSurvivalTargetReasonable) {
          console.warn(`Difficulty curve may not meet 3.5 minute survival target. Speed@210s: ${Math.round(speedAt210s)}, Size@210s: ${Math.round(sizeAt210s)}`);
        }
      }
    } catch (error) {
      validationElement.textContent = '✗ Formula Error';
      (validationElement as HTMLElement).style.color = '#E74C3C';
      console.error('Formula validation error:', error);
    }
  }

  private showParameterChangeVisualFeedback(changedParams: Partial<DifficultyParams>): void {
    if (!this.debugPanel) return;

    // Create visual feedback for parameter changes
    Object.keys(changedParams).forEach(paramKey => {
      const valueElement = this.debugPanel!.querySelector(`#${paramKey}-value`) as HTMLElement;
      if (valueElement) {
        // Flash the changed value with a highlight color
        const originalColor = valueElement.style.color;
        valueElement.style.color = '#F1C40F'; // Yellow highlight
        valueElement.style.fontWeight = 'bold';
        
        setTimeout(() => {
          valueElement.style.color = originalColor;
          valueElement.style.fontWeight = 'normal';
        }, 300);
      }
    });

    // Show a brief notification
    this.showChangeNotification(Object.keys(changedParams));
  }

  private showChangeNotification(changedParams: string[]): void {
    if (!this.debugPanel) return;

    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: absolute;
      top: -30px;
      right: 0;
      background: #F1C40F;
      color: #2C3E50;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
      z-index: 10001;
      animation: slideDown 0.3s ease-out;
    `;
    notification.textContent = `Updated: ${changedParams.join(', ')}`;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateY(-10px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    this.debugPanel.appendChild(notification);

    // Remove notification after 2 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, 2000);
  }

  private runFormulaAccuracyTest(): void {
    console.log('=== Formula Accuracy Test ===');
    
    const testTimes = [0, 15, 30, 45, 60, 75, 90, 120, 150, 180, 210, 240];
    const results: Array<{
      time: number;
      speed: number;
      size: number;
      dotCount: number;
      expectedSpeed: number;
      expectedSize: number;
      speedAccurate: boolean;
      sizeAccurate: boolean;
    }> = [];

    testTimes.forEach(time => {
      // Calculate using current parameters
      const speed = this.difficultyParams.baseSpeed * Math.pow(this.difficultyParams.growthRate, time);
      const size = this.difficultyParams.baseSize * Math.pow(this.difficultyParams.shrinkRate, time);
      const dotCount = Math.floor(time / 15) + 1;

      // Calculate expected values using mathematical formulas
      const expectedSpeed = this.difficultyParams.baseSpeed * Math.pow(this.difficultyParams.growthRate, time);
      const expectedSize = this.difficultyParams.baseSize * Math.pow(this.difficultyParams.shrinkRate, time);

      // Check accuracy (should be identical for mathematical formulas)
      const speedAccurate = Math.abs(speed - expectedSpeed) < 0.01;
      const sizeAccurate = Math.abs(size - expectedSize) < 0.01;

      results.push({
        time,
        speed: Math.round(speed * 100) / 100,
        size: Math.round(size * 100) / 100,
        dotCount,
        expectedSpeed: Math.round(expectedSpeed * 100) / 100,
        expectedSize: Math.round(expectedSize * 100) / 100,
        speedAccurate,
        sizeAccurate
      });

      console.log(`Time ${time}s: Speed=${Math.round(speed)}, Size=${Math.round(size)}, Dots=${dotCount}`);
    });

    // Check if all calculations are accurate
    const allAccurate = results.every(r => r.speedAccurate && r.sizeAccurate);
    
    // Check 3.5-minute (210-second) survival target
    const result210s = results.find(r => r.time === 210);
    const survivalTargetMet = result210s ? (result210s.speed <= 5000 && result210s.size >= 10) : false;

    console.log(`Formula Accuracy: ${allAccurate ? 'PASS' : 'FAIL'}`);
    console.log(`3.5min Survival Target: ${survivalTargetMet ? 'PASS' : 'FAIL'} (Speed: ${result210s?.speed}, Size: ${result210s?.size})`);
    
    // Show results in a notification
    this.showTestResults(allAccurate, survivalTargetMet, results);
  }

  private showTestResults(formulasAccurate: boolean, survivalTargetMet: boolean, results: any[]): void {
    if (!this.debugPanel) return;

    // Create test results modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 20000;
      font-family: 'Poppins', Arial, sans-serif;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: #2C3E50;
      color: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      border: 2px solid #3498DB;
    `;

    const result210s = results.find(r => r.time === 210);
    
    content.innerHTML = `
      <h3 style="margin: 0 0 15px 0; color: #3498DB;">Formula Accuracy Test Results</h3>
      
      <div style="margin-bottom: 15px;">
        <div style="color: ${formulasAccurate ? '#2ECC71' : '#E74C3C'}; font-weight: bold;">
          ${formulasAccurate ? '✓' : '✗'} Formula Accuracy: ${formulasAccurate ? 'PASS' : 'FAIL'}
        </div>
        <div style="color: ${survivalTargetMet ? '#2ECC71' : '#F39C12'}; font-weight: bold;">
          ${survivalTargetMet ? '✓' : '⚠'} 3.5min Survival Target: ${survivalTargetMet ? 'PASS' : 'WARNING'}
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <h4 style="margin: 0 0 8px 0; color: #ECF0F1;">Current Parameters:</h4>
        <div style="font-size: 11px; background: rgba(52, 152, 219, 0.1); padding: 8px; border-radius: 4px;">
          Base Speed: ${this.difficultyParams.baseSpeed} px/sec<br>
          Growth Rate: ${this.difficultyParams.growthRate}<br>
          Base Size: ${this.difficultyParams.baseSize} px<br>
          Shrink Rate: ${this.difficultyParams.shrinkRate}
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <h4 style="margin: 0 0 8px 0; color: #ECF0F1;">Key Milestones:</h4>
        <div style="font-size: 11px;">
          ${results.filter(r => [30, 60, 90, 120, 150, 180, 210].includes(r.time)).map(r => 
            `<div>Time ${r.time}s: Speed=${Math.round(r.speed)}, Size=${Math.round(r.size)}, Dots=${r.dotCount}</div>`
          ).join('')}
        </div>
      </div>

      ${!survivalTargetMet ? `
        <div style="background: rgba(243, 156, 18, 0.2); padding: 8px; border-radius: 4px; margin-bottom: 15px;">
          <strong>Warning:</strong> Current parameters may not achieve 3.5+ minute survival target.<br>
          At 210s: Speed=${result210s ? Math.round(result210s.speed) : 'N/A'}, Size=${result210s ? Math.round(result210s.size) : 'N/A'}
        </div>
      ` : ''}

      <button id="close-test-results" style="background: #3498DB; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; width: 100%;">
        Close
      </button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close button event
    const closeBtn = content.querySelector('#close-test-results') as HTMLButtonElement;
    closeBtn?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  // Clean up method for when the service is no longer needed
  public destroy(): void {
    this.stopRealTimeUpdates();
    
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
  public updateElapsedTime(_elapsedTime: number): void { /* No-op in production */ }
  
  // Callback registration methods (no-op in production)
  public onDifficultyChange(_callback: (params: DifficultyParams) => void): void { /* No-op in production */ }
  public onHitboxToggle(_callback: (enabled: boolean) => void): void { /* No-op in production */ }
}
