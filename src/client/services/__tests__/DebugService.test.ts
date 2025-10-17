/**
 * @vitest-environment jsdom
 */
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { DebugService, ProductionDebugService } from '../DebugService';
import { DEFAULT_DIFFICULTY_PARAMS, DEFAULT_DEBUG_CONFIG } from '../../../shared/types/debug';

describe('DebugService', () => {
    let debugService: DebugService;

    beforeEach(() => {
        // Reset singleton instance
        (DebugService as any).instance = null;

        // Create new instance for testing
        debugService = new (DebugService as any)();

        // Clear all mocks
        vi.clearAllMocks();
    });

    afterEach(() => {
        debugService.destroy();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance when called multiple times', () => {
            const instance1 = DebugService.getInstance();
            const instance2 = DebugService.getInstance();

            expect(instance1).toBe(instance2);
        });

        it('should return ProductionDebugService in production environment', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            // Reset singleton
            (DebugService as any).instance = null;

            const instance = DebugService.getInstance();
            expect(instance).toBeInstanceOf(ProductionDebugService);

            process.env.NODE_ENV = originalEnv;
        });

        it('should return DebugService in development environment', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            // Reset singleton
            (DebugService as any).instance = null;

            const instance = DebugService.getInstance();
            expect(instance).toBeInstanceOf(DebugService);

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('Debug Panel Management', () => {
        it('should be enabled by default in non-production environment', () => {
            expect(debugService.isEnabled()).toBe(true);
        });

        it('should handle debug panel operations without errors', () => {
            expect(() => {
                debugService.showDebugPanel();
                debugService.hideDebugPanel();
                debugService.toggleDebugPanel();
            }).not.toThrow();
        });
    });

    describe('Difficulty Parameters Management', () => {
        it('should initialize with default difficulty parameters', () => {
            const params = debugService.getDifficultyParams();

            expect(params).toEqual(DEFAULT_DIFFICULTY_PARAMS);
        });

        it('should update difficulty parameters', () => {
            const newParams = { baseSpeed: 150, growthRate: 1.05 };

            debugService.updateDifficultyParams(newParams);
            const updatedParams = debugService.getDifficultyParams();

            expect(updatedParams.baseSpeed).toBe(150);
            expect(updatedParams.growthRate).toBe(1.05);
            expect(updatedParams.baseSize).toBe(DEFAULT_DIFFICULTY_PARAMS.baseSize); // Should remain unchanged
            expect(updatedParams.shrinkRate).toBe(DEFAULT_DIFFICULTY_PARAMS.shrinkRate); // Should remain unchanged
        });

        it('should call difficulty change callback when parameters are updated', () => {
            const callback = vi.fn();
            debugService.onDifficultyChange(callback);

            const newParams = { baseSpeed: 200 };
            debugService.updateDifficultyParams(newParams);

            expect(callback).toHaveBeenCalledWith(expect.objectContaining({ baseSpeed: 200 }));
        });
    });

    describe('Hitbox Visualization', () => {
        it('should initialize with hitbox visualization disabled', () => {
            expect(debugService.isHitboxVisualizationEnabled()).toBe(false);
        });

        it('should enable hitbox visualization', () => {
            debugService.visualizeHitboxes(true);

            expect(debugService.isHitboxVisualizationEnabled()).toBe(true);
        });

        it('should call hitbox toggle callback when visualization is toggled', () => {
            const callback = vi.fn();
            debugService.onHitboxToggle(callback);

            debugService.visualizeHitboxes(true);

            expect(callback).toHaveBeenCalledWith(true);
        });
    });

    describe('Debug Configuration', () => {
        it('should initialize with default debug configuration', () => {
            const config = debugService.getDebugConfig();

            expect(config.showHitboxes).toBe(DEFAULT_DEBUG_CONFIG.showHitboxes);
            expect(config.showFPS).toBe(DEFAULT_DEBUG_CONFIG.showFPS);
            expect(config.showObjectCount).toBe(DEFAULT_DEBUG_CONFIG.showObjectCount);
        });

        it('should update debug configuration', () => {
            debugService.updateDebugConfig({ showFPS: true, showObjectCount: true });

            const config = debugService.getDebugConfig();
            expect(config.showFPS).toBe(true);
            expect(config.showObjectCount).toBe(true);
            expect(config.showHitboxes).toBe(false); // Should remain unchanged
        });
    });

    describe('Cleanup', () => {
        it('should handle cleanup without errors', () => {
            debugService.showDebugPanel();

            expect(() => {
                debugService.destroy();
            }).not.toThrow();
        });
    });
});

describe('ProductionDebugService', () => {
    let prodDebugService: ProductionDebugService;

    beforeEach(() => {
        prodDebugService = new ProductionDebugService();
    });

    it('should be disabled', () => {
        expect(prodDebugService.isEnabled()).toBe(false);
    });

    it('should return default difficulty parameters', () => {
        const params = prodDebugService.getDifficultyParams();
        expect(params).toEqual(DEFAULT_DIFFICULTY_PARAMS);
    });

    it('should return disabled debug config', () => {
        const config = prodDebugService.getDebugConfig();
        expect(config.enabled).toBe(false);
    });

    it('should not show hitbox visualization', () => {
        expect(prodDebugService.isHitboxVisualizationEnabled()).toBe(false);
    });

    it('should handle all methods as no-ops without errors', () => {
        expect(() => {
            prodDebugService.showDebugPanel();
            prodDebugService.hideDebugPanel();
            prodDebugService.toggleDebugPanel();
            prodDebugService.updateDifficultyParams({ baseSpeed: 200 });
            prodDebugService.visualizeHitboxes(true);
            prodDebugService.updateDebugConfig({ showFPS: true });
            prodDebugService.onDifficultyChange(() => { });
            prodDebugService.onHitboxToggle(() => { });
        }).not.toThrow();
    });
});