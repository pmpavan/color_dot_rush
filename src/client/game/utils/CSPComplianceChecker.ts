/**
 * CSP Compliance Checker for Color Rush
 * Verifies all assets are bundled locally and no external resources are loaded
 * Ensures compliance with Content Security Policy requirements
 */

export interface CSPComplianceReport {
  compliant: boolean;
  issues: CSPIssue[];
  summary: {
    totalAssets: number;
    localAssets: number;
    externalAssets: number;
    missingAssets: number;
  };
}

export interface CSPIssue {
  type: 'external_resource' | 'missing_asset' | 'insecure_protocol' | 'cdn_usage';
  resource: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export class CSPComplianceChecker {
  private requiredAssets: string[] = [
    // Images
    'assets/bg.png',
    'assets/logo.png',
    'assets/dot-red.svg',
    'assets/dot-green.svg',
    'assets/dot-blue.svg',
    'assets/dot-yellow.svg',
    'assets/dot-purple.svg',
    'assets/bomb.svg',
    'assets/slowmo-dot.svg',
    'assets/clock-icon.svg',
    
    // Fonts
    'fonts/poppins-regular.woff2',
    'fonts/poppins-medium.woff2',
    'fonts/poppins-bold.woff2',
  ];

  private externalDomains: string[] = [
    'googleapis.com',
    'gstatic.com',
    'cdnjs.cloudflare.com',
    'unpkg.com',
    'jsdelivr.net',
    'cdn.jsdelivr.net',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
  ];

  /**
   * Check CSP compliance for the entire application
   */
  public async checkCompliance(): Promise<CSPComplianceReport> {
    const issues: CSPIssue[] = [];
    
    // Check for external resources in HTML
    await this.checkHTMLResources(issues);
    
    // Check for external resources in CSS
    await this.checkCSSResources(issues);
    
    // Check for missing required assets
    await this.checkRequiredAssets(issues);
    
    // Check for external script sources
    await this.checkScriptSources(issues);
    
    // Check network requests (if possible)
    this.checkNetworkRequests(issues);
    
    // Generate summary
    const summary = this.generateSummary(issues);
    
    return {
      compliant: issues.filter(issue => issue.severity === 'high').length === 0,
      issues,
      summary,
    };
  }

  /**
   * Check HTML for external resources
   */
  private async checkHTMLResources(issues: CSPIssue[]): Promise<void> {
    // Check link tags
    const linkTags = document.querySelectorAll('link[href]');
    linkTags.forEach(link => {
      const href = link.getAttribute('href');
      if (href && this.isExternalResource(href)) {
        issues.push({
          type: 'external_resource',
          resource: href,
          description: `External resource in HTML link tag: ${href}`,
          severity: 'high',
        });
      }
    });

    // Check img tags
    const imgTags = document.querySelectorAll('img[src]');
    imgTags.forEach(img => {
      const src = img.getAttribute('src');
      if (src && this.isExternalResource(src)) {
        issues.push({
          type: 'external_resource',
          resource: src,
          description: `External image source: ${src}`,
          severity: 'high',
        });
      }
    });

    // Check script tags
    const scriptTags = document.querySelectorAll('script[src]');
    scriptTags.forEach(script => {
      const src = script.getAttribute('src');
      if (src && this.isExternalResource(src)) {
        issues.push({
          type: 'external_resource',
          resource: src,
          description: `External script source: ${src}`,
          severity: 'high',
        });
      }
    });
  }

  /**
   * Check CSS for external resources
   */
  private async checkCSSResources(issues: CSPIssue[]): Promise<void> {
    // Check all stylesheets
    const stylesheets = document.styleSheets;
    
    for (let i = 0; i < stylesheets.length; i++) {
      try {
        const stylesheet = stylesheets[i];
        if (stylesheet.href && this.isExternalResource(stylesheet.href)) {
          issues.push({
            type: 'external_resource',
            resource: stylesheet.href,
            description: `External stylesheet: ${stylesheet.href}`,
            severity: 'high',
          });
        }

        // Check CSS rules for external resources
        if (stylesheet.cssRules) {
          this.checkCSSRules(stylesheet.cssRules, issues);
        }
      } catch (e) {
        // Cross-origin stylesheets may not be accessible
        console.warn('Could not access stylesheet rules (possibly cross-origin):', e);
      }
    }
  }

  /**
   * Check CSS rules for external resources
   */
  private checkCSSRules(rules: CSSRuleList, issues: CSPIssue[]): void {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      
      if (rule instanceof CSSStyleRule) {
        const style = rule.style;
        
        // Check background-image
        const backgroundImage = style.backgroundImage;
        if (backgroundImage && backgroundImage !== 'none') {
          const urls = this.extractURLsFromCSS(backgroundImage);
          urls.forEach(url => {
            if (this.isExternalResource(url)) {
              issues.push({
                type: 'external_resource',
                resource: url,
                description: `External background image in CSS: ${url}`,
                severity: 'medium',
              });
            }
          });
        }
      } else if (rule instanceof CSSFontFaceRule) {
        const style = rule.style;
        const src = style.src;
        if (src) {
          const urls = this.extractURLsFromCSS(src);
          urls.forEach(url => {
            if (this.isExternalResource(url)) {
              issues.push({
                type: 'external_resource',
                resource: url,
                description: `External font source in CSS: ${url}`,
                severity: 'high',
              });
            }
          });
        }
      } else if (rule instanceof CSSImportRule) {
        if (this.isExternalResource(rule.href)) {
          issues.push({
            type: 'external_resource',
            resource: rule.href,
            description: `External CSS import: ${rule.href}`,
            severity: 'high',
          });
        }
      }
    }
  }

  /**
   * Extract URLs from CSS property values
   */
  private extractURLsFromCSS(cssValue: string): string[] {
    const urlRegex = /url\(['"]?([^'"]+)['"]?\)/g;
    const urls: string[] = [];
    let match;
    
    while ((match = urlRegex.exec(cssValue)) !== null) {
      urls.push(match[1]);
    }
    
    return urls;
  }

  /**
   * Check for missing required assets
   */
  private async checkRequiredAssets(issues: CSPIssue[]): Promise<void> {
    for (const asset of this.requiredAssets) {
      try {
        const response = await fetch(asset, { method: 'HEAD' });
        if (!response.ok) {
          issues.push({
            type: 'missing_asset',
            resource: asset,
            description: `Required asset not found: ${asset} (${response.status})`,
            severity: 'high',
          });
        }
      } catch (error) {
        issues.push({
          type: 'missing_asset',
          resource: asset,
          description: `Required asset not accessible: ${asset}`,
          severity: 'high',
        });
      }
    }
  }

  /**
   * Check script sources for external dependencies
   */
  private async checkScriptSources(issues: CSPIssue[]): Promise<void> {
    // Check if Phaser is loaded from CDN
    if (window.Phaser) {
      // Try to determine if Phaser was loaded externally
      const scripts = document.querySelectorAll('script[src]');
      scripts.forEach(script => {
        const src = script.getAttribute('src');
        if (src && (src.includes('phaser') || src.includes('cdn'))) {
          if (this.isExternalResource(src)) {
            issues.push({
              type: 'cdn_usage',
              resource: src,
              description: `Phaser.js loaded from external CDN: ${src}`,
              severity: 'high',
            });
          }
        }
      });
    }
  }

  /**
   * Check for external network requests (limited browser capability)
   */
  private checkNetworkRequests(issues: CSPIssue[]): void {
    // Override fetch to monitor external requests
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const url = args[0] as string;
      
      if (this.isExternalResource(url)) {
        issues.push({
          type: 'external_resource',
          resource: url,
          description: `External fetch request: ${url}`,
          severity: 'medium',
        });
      }
      
      return originalFetch.apply(window, args);
    };
    
    // Note: This only catches fetch requests made after this point
    // XMLHttpRequest and other methods would need similar overrides
  }

  /**
   * Check if a resource URL is external
   */
  private isExternalResource(url: string): boolean {
    // Skip data URLs and blob URLs
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return false;
    }
    
    // Skip relative URLs
    if (!url.includes('://')) {
      return false;
    }
    
    // Check against known external domains
    return this.externalDomains.some(domain => url.includes(domain));
  }

  /**
   * Generate compliance summary
   */
  private generateSummary(issues: CSPIssue[]): CSPComplianceReport['summary'] {
    const externalAssets = issues.filter(issue => 
      issue.type === 'external_resource' || issue.type === 'cdn_usage'
    ).length;
    
    const missingAssets = issues.filter(issue => 
      issue.type === 'missing_asset'
    ).length;
    
    return {
      totalAssets: this.requiredAssets.length,
      localAssets: this.requiredAssets.length - missingAssets,
      externalAssets,
      missingAssets,
    };
  }

  /**
   * Generate a detailed compliance report
   */
  public generateReport(report: CSPComplianceReport): string {
    let output = '=== CSP Compliance Report ===\n';
    output += `Status: ${report.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}\n\n`;
    
    output += 'Summary:\n';
    output += `- Total Required Assets: ${report.summary.totalAssets}\n`;
    output += `- Local Assets: ${report.summary.localAssets}\n`;
    output += `- External Assets: ${report.summary.externalAssets}\n`;
    output += `- Missing Assets: ${report.summary.missingAssets}\n\n`;
    
    if (report.issues.length > 0) {
      output += 'Issues Found:\n';
      
      const highIssues = report.issues.filter(issue => issue.severity === 'high');
      const mediumIssues = report.issues.filter(issue => issue.severity === 'medium');
      const lowIssues = report.issues.filter(issue => issue.severity === 'low');
      
      if (highIssues.length > 0) {
        output += '\nHIGH SEVERITY:\n';
        highIssues.forEach(issue => {
          output += `- ${issue.description}\n`;
        });
      }
      
      if (mediumIssues.length > 0) {
        output += '\nMEDIUM SEVERITY:\n';
        mediumIssues.forEach(issue => {
          output += `- ${issue.description}\n`;
        });
      }
      
      if (lowIssues.length > 0) {
        output += '\nLOW SEVERITY:\n';
        lowIssues.forEach(issue => {
          output += `- ${issue.description}\n`;
        });
      }
    } else {
      output += 'No issues found - All assets are properly bundled locally!\n';
    }
    
    output += '\n========================\n';
    
    return output;
  }

  /**
   * Quick compliance check (returns boolean)
   */
  public async isCompliant(): Promise<boolean> {
    const report = await this.checkCompliance();
    return report.compliant;
  }

  /**
   * Log compliance report to console
   */
  public async logComplianceReport(): Promise<void> {
    const report = await this.checkCompliance();
    const reportText = this.generateReport(report);
    
    if (report.compliant) {
      console.log(reportText);
    } else {
      console.warn(reportText);
    }
  }
}
