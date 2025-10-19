/**
 * SafeCleanupHelpers - Common utility functions for safe property access during cleanup
 * Implements consistent error handling patterns across all utility classes
 * Enhanced with comprehensive error handling patterns for scene destruction
 */

import { Scene } from 'phaser';

export interface CleanupContext {
  sceneExists: boolean;
  propertyExists: boolean;
  methodExists: boolean;
  timestamp: string;
}

export interface DestructionContext {
  sceneExists: boolean;
  scaleExists: boolean;
  scaleOffExists: boolean;
  errorOccurred: boolean;
  errorMessage?: string;
  componentName: string;
  operation: string;
  timestamp: string;
}

export interface CleanupStatus {
  scaleListenerRemoved: boolean;
  callbacksCleared: boolean;
  layoutCleared: boolean;
  tweensKilled: boolean;
  childrenRemoved: boolean;
  completed: boolean;
  errors: string[];
}

/**
 * Safely remove event listeners with comprehensive error handling
 */
export function safelyRemoveEventListener(
  target: any,
  event: string,
  handler: Function,
  context?: any,
  componentName: string = 'Component'
): boolean {
  try {
    if (target && typeof target.off === 'function') {
      target.off(event, handler, context);
      console.log(`${componentName}: Event listener '${event}' removed successfully`);
      return true;
    } else {
      console.warn(`${componentName}: Event listener removal skipped - target or method not available`, {
        targetExists: !!target,
        offMethodExists: !!(target && typeof target.off === 'function'),
        event,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  } catch (error) {
    console.warn(`${componentName}: Error removing event listener '${event}':`, {
      error: error instanceof Error ? error.message : String(error),
      targetExists: !!target,
      event,
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

/**
 * Safely access scene properties with existence checks
 */
export function safelyAccessSceneProperty<T>(
  scene: Scene | null | undefined,
  propertyPath: string,
  componentName: string = 'Component'
): T | null {
  try {
    if (!scene) {
      console.warn(`${componentName}: Scene property access skipped - scene not available`, {
        propertyPath,
        sceneExists: false,
        timestamp: new Date().toISOString()
      });
      return null;
    }

    const properties = propertyPath.split('.');
    let current: any = scene;

    for (const prop of properties) {
      if (current && typeof current === 'object' && prop in current) {
        current = current[prop];
      } else {
        console.warn(`${componentName}: Scene property access failed - property not available`, {
          propertyPath,
          failedAt: prop,
          sceneExists: !!scene,
          timestamp: new Date().toISOString()
        });
        return null;
      }
    }

    return current as T;
  } catch (error) {
    console.warn(`${componentName}: Error accessing scene property '${propertyPath}':`, {
      error: error instanceof Error ? error.message : String(error),
      propertyPath,
      sceneExists: !!scene,
      timestamp: new Date().toISOString()
    });
    return null;
  }
}

/**
 * Safely kill scene tweens with error handling
 */
export function safelyKillTweens(
  scene: Scene | null | undefined,
  targets?: any | any[],
  componentName: string = 'Component'
): boolean {
  try {
    const tweens = safelyAccessSceneProperty(scene, 'tweens', componentName) as any;
    
    if (tweens && typeof tweens.killTweensOf === 'function' && targets) {
      // Kill tweens for specific targets
      if (Array.isArray(targets)) {
        targets.forEach(target => {
          if (target) {
            try {
              tweens.killTweensOf(target);
            } catch (error) {
              console.warn(`${componentName}: Error killing tweens for specific target:`, {
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
              });
            }
          }
        });
      } else {
        tweens.killTweensOf(targets);
      }
      console.log(`${componentName}: Tweens killed for specific targets`);
      return true;
    } else if (tweens && typeof tweens.killAll === 'function') {
      // Kill all tweens
      tweens.killAll();
      console.log(`${componentName}: All scene tweens killed successfully`);
      return true;
    } else {
      console.warn(`${componentName}: Tween cleanup skipped - tweens not available`, {
        sceneExists: !!scene,
        tweensExists: !!tweens,
        killAllExists: !!(tweens && typeof tweens.killAll === 'function'),
        killTweensOfExists: !!(tweens && typeof tweens.killTweensOf === 'function'),
        timestamp: new Date().toISOString()
      });
      return false;
    }
  } catch (error) {
    console.warn(`${componentName}: Error during tween cleanup:`, {
      error: error instanceof Error ? error.message : String(error),
      sceneExists: !!scene,
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

/**
 * Safely remove scene children with error handling
 */
export function safelyRemoveSceneChildren(
  scene: Scene | null | undefined,
  destroyChildren: boolean = true,
  componentName: string = 'Component'
): boolean {
  try {
    const children = safelyAccessSceneProperty(scene, 'children', componentName) as any;
    
    if (children && typeof children.removeAll === 'function') {
      children.removeAll(destroyChildren);
      console.log(`${componentName}: Scene children removed successfully`);
      return true;
    } else {
      console.warn(`${componentName}: Scene children cleanup skipped - children not available`, {
        sceneExists: !!scene,
        childrenExists: !!children,
        removeAllExists: !!(children && typeof children.removeAll === 'function'),
        timestamp: new Date().toISOString()
      });
      return false;
    }
  } catch (error) {
    console.warn(`${componentName}: Error removing scene children:`, {
      error: error instanceof Error ? error.message : String(error),
      sceneExists: !!scene,
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

/**
 * Create a cleanup context for logging and debugging
 */
export function createCleanupContext(
  scene: Scene | null | undefined,
  propertyPath: string,
  methodName?: string
): CleanupContext {
  const sceneExists = !!scene;
  let propertyExists = false;
  let methodExists = false;

  if (sceneExists && scene) {
    try {
      const properties = propertyPath.split('.');
      let current: any = scene;

      for (const prop of properties) {
        if (current && typeof current === 'object' && prop in current) {
          current = current[prop];
          propertyExists = true;
        } else {
          propertyExists = false;
          break;
        }
      }

      if (propertyExists && methodName && current && typeof current[methodName] === 'function') {
        methodExists = true;
      }
    } catch (error) {
      propertyExists = false;
      methodExists = false;
    }
  }

  return {
    sceneExists,
    propertyExists,
    methodExists,
    timestamp: new Date().toISOString()
  };
}

/**
 * Helper method for safe event listener removal with comprehensive error handling
 * Implements requirement: Create helper method for safe event listener removal
 */
export function safeEventListenerRemoval(
  target: any,
  event: string,
  handler: Function,
  context?: any,
  componentName: string = 'Component'
): DestructionContext {
  const destructionContext: DestructionContext = {
    sceneExists: !!target,
    scaleExists: !!(target && target.scale),
    scaleOffExists: !!(target && target.scale && typeof target.scale.off === 'function'),
    errorOccurred: false,
    componentName,
    operation: `removeEventListener_${event}`,
    timestamp: new Date().toISOString()
  };

  try {
    if (target && typeof target.off === 'function') {
      target.off(event, handler, context);
      console.log(`${componentName}: Event listener '${event}' removed successfully`, {
        targetExists: true,
        methodExists: true,
        timestamp: destructionContext.timestamp
      });
    } else if (target && target.scale && typeof target.scale.off === 'function') {
      // Handle scene.scale specific case
      target.scale.off(event, handler, context);
      console.log(`${componentName}: Scale event listener '${event}' removed successfully`, {
        scaleExists: true,
        scaleOffExists: true,
        timestamp: destructionContext.timestamp
      });
    } else {
      console.warn(`${componentName}: Event listener removal skipped - target or method not available`, {
        targetExists: !!target,
        scaleExists: destructionContext.scaleExists,
        scaleOffExists: destructionContext.scaleOffExists,
        event,
        timestamp: destructionContext.timestamp
      });
    }
  } catch (error) {
    destructionContext.errorOccurred = true;
    destructionContext.errorMessage = error instanceof Error ? error.message : String(error);
    
    logDestructionError(componentName, `removeEventListener_${event}`, error);
  }

  return destructionContext;
}

/**
 * Structured error logging with context information for destruction operations
 * Implements requirement: Implement structured error logging with context information
 */
export function logDestructionError(
  componentName: string,
  operation: string,
  error: Error | unknown,
  additionalContext?: Record<string, any>
): void {
  const errorContext = {
    component: componentName,
    operation,
    error: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
    ...additionalContext
  };

  console.warn(`${componentName}: ${operation} failed during destruction:`, errorContext);
  
  // Also log the full error for debugging if it's an Error object
  if (error instanceof Error) {
    console.error(`${componentName}: Full error details:`, error);
  }
}

/**
 * Validate scene state during destruction operations
 * Implements requirement: Add validation for scene state during destruction operations
 */
export function validateSceneState(
  scene: Scene | null | undefined,
  componentName: string = 'Component'
): {
  isValid: boolean;
  sceneExists: boolean;
  sceneActive: boolean;
  scaleExists: boolean;
  tweensExists: boolean;
  childrenExists: boolean;
  validationErrors: string[];
} {
  const validationResult = {
    isValid: true,
    sceneExists: !!scene,
    sceneActive: false,
    scaleExists: false,
    tweensExists: false,
    childrenExists: false,
    validationErrors: [] as string[]
  };

  try {
    if (!scene) {
      validationResult.validationErrors.push('Scene is null or undefined');
      validationResult.isValid = false;
      return validationResult;
    }

    // Check if scene is active
    if (scene.scene && typeof scene.scene.isActive === 'function') {
      validationResult.sceneActive = scene.scene.isActive();
    } else {
      validationResult.validationErrors.push('Scene.scene.isActive not available');
    }

    // Check scale property
    if (scene.scale) {
      validationResult.scaleExists = true;
    } else {
      validationResult.validationErrors.push('Scene.scale not available');
    }

    // Check tweens property
    if (scene.tweens) {
      validationResult.tweensExists = true;
    } else {
      validationResult.validationErrors.push('Scene.tweens not available');
    }

    // Check children property
    if (scene.children) {
      validationResult.childrenExists = true;
    } else {
      validationResult.validationErrors.push('Scene.children not available');
    }

    // Scene is considered valid if it exists and has at least some properties
    validationResult.isValid = validationResult.sceneExists && 
      (validationResult.scaleExists || validationResult.tweensExists || validationResult.childrenExists);

    console.log(`${componentName}: Scene state validation completed`, {
      isValid: validationResult.isValid,
      sceneExists: validationResult.sceneExists,
      sceneActive: validationResult.sceneActive,
      scaleExists: validationResult.scaleExists,
      tweensExists: validationResult.tweensExists,
      childrenExists: validationResult.childrenExists,
      errorCount: validationResult.validationErrors.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    validationResult.isValid = false;
    validationResult.validationErrors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    
    logDestructionError(componentName, 'validateSceneState', error);
  }

  return validationResult;
}

/**
 * Ensure all cleanup methods handle partial destruction states gracefully
 * Implements requirement: Ensure all cleanup methods handle partial destruction states gracefully
 */
export function handlePartialDestructionState(
  scene: Scene | null | undefined,
  cleanupOperations: Array<{
    name: string;
    operation: () => void;
    required: boolean;
  }>,
  componentName: string = 'Component'
): CleanupStatus {
  const cleanupStatus: CleanupStatus = {
    scaleListenerRemoved: false,
    callbacksCleared: false,
    layoutCleared: false,
    tweensKilled: false,
    childrenRemoved: false,
    completed: false,
    errors: []
  };

  // First validate the scene state
  const sceneValidation = validateSceneState(scene, componentName);
  
  if (!sceneValidation.isValid) {
    console.warn(`${componentName}: Scene validation failed, proceeding with limited cleanup`, {
      validationErrors: sceneValidation.validationErrors,
      timestamp: new Date().toISOString()
    });
  }

  let successfulOperations = 0;
  let requiredOperationsFailed = 0;

  // Execute each cleanup operation with error isolation
  for (const cleanupOp of cleanupOperations) {
    try {
      console.log(`${componentName}: Executing cleanup operation: ${cleanupOp.name}`);
      cleanupOp.operation();
      
      // Update specific status based on operation name
      switch (cleanupOp.name) {
        case 'removeScaleListener':
          cleanupStatus.scaleListenerRemoved = true;
          break;
        case 'clearCallbacks':
          cleanupStatus.callbacksCleared = true;
          break;
        case 'clearLayout':
          cleanupStatus.layoutCleared = true;
          break;
        case 'killTweens':
          cleanupStatus.tweensKilled = true;
          break;
        case 'removeChildren':
          cleanupStatus.childrenRemoved = true;
          break;
      }
      
      successfulOperations++;
      console.log(`${componentName}: Cleanup operation '${cleanupOp.name}' completed successfully`);
      
    } catch (error) {
      const errorMessage = `${cleanupOp.name}: ${error instanceof Error ? error.message : String(error)}`;
      cleanupStatus.errors.push(errorMessage);
      
      if (cleanupOp.required) {
        requiredOperationsFailed++;
      }
      
      logDestructionError(componentName, cleanupOp.name, error, {
        required: cleanupOp.required,
        operationIndex: cleanupOperations.indexOf(cleanupOp)
      });
      
      // Continue with next operation even if this one failed
      console.warn(`${componentName}: Cleanup operation '${cleanupOp.name}' failed, continuing with remaining operations`);
    }
  }

  // Determine if cleanup is considered completed
  // Completed if all required operations succeeded, or if no required operations failed
  cleanupStatus.completed = requiredOperationsFailed === 0;

  console.log(`${componentName}: Partial destruction state handling completed`, {
    totalOperations: cleanupOperations.length,
    successfulOperations,
    requiredOperationsFailed,
    completed: cleanupStatus.completed,
    errorCount: cleanupStatus.errors.length,
    timestamp: new Date().toISOString()
  });

  return cleanupStatus;
}

/**
 * Comprehensive cleanup function that combines all safe cleanup operations
 * Enhanced with partial destruction state handling
 */
export function performSafeCleanup(
  scene: Scene | null | undefined,
  options: {
    killTweens?: boolean;
    removeChildren?: boolean;
    removeEventListeners?: Array<{
      target: any;
      event: string;
      handler: Function;
      context?: any;
    }>;
    componentName?: string;
  } = {}
): {
  tweensCleared: boolean;
  childrenRemoved: boolean;
  eventListenersRemoved: number;
  totalOperations: number;
  successfulOperations: number;
  cleanupStatus: CleanupStatus;
} {
  const {
    killTweens = true,
    removeChildren = true,
    removeEventListeners = [],
    componentName = 'Component'
  } = options;

  let successfulOperations = 0;
  let totalOperations = 0;
  let tweensCleared = false;
  let childrenRemoved = false;
  let eventListenersRemoved = 0;

  // Prepare cleanup operations for partial destruction state handling
  const cleanupOperations: Array<{
    name: string;
    operation: () => void;
    required: boolean;
  }> = [];

  // Add tween cleanup operation
  if (killTweens) {
    totalOperations++;
    cleanupOperations.push({
      name: 'killTweens',
      operation: () => {
        if (safelyKillTweens(scene, undefined, componentName)) {
          tweensCleared = true;
          successfulOperations++;
        }
      },
      required: false
    });
  }

  // Add children removal operation
  if (removeChildren) {
    totalOperations++;
    cleanupOperations.push({
      name: 'removeChildren',
      operation: () => {
        if (safelyRemoveSceneChildren(scene, true, componentName)) {
          childrenRemoved = true;
          successfulOperations++;
        }
      },
      required: false
    });
  }

  // Add event listener removal operations
  for (const listener of removeEventListeners) {
    totalOperations++;
    cleanupOperations.push({
      name: `removeEventListener_${listener.event}`,
      operation: () => {
        if (safelyRemoveEventListener(
          listener.target,
          listener.event,
          listener.handler,
          listener.context,
          componentName
        )) {
          eventListenersRemoved++;
          successfulOperations++;
        }
      },
      required: true // Event listeners are considered required cleanup
    });
  }

  // Execute cleanup with partial destruction state handling
  const cleanupStatus = handlePartialDestructionState(scene, cleanupOperations, componentName);

  console.log(`${componentName}: Comprehensive cleanup completed - ${successfulOperations}/${totalOperations} operations successful`);

  return {
    tweensCleared,
    childrenRemoved,
    eventListenersRemoved,
    totalOperations,
    successfulOperations,
    cleanupStatus
  };
}
