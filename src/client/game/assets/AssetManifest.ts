/**
 * Asset Manifest for Color Rush
 * Centralized asset management for CSP compliance
 */

export interface AssetDefinition {
  key: string;
  type: 'image' | 'audio' | 'font';
  path: string;
  description: string;
}

export const GAME_ASSETS: AssetDefinition[] = [
  // Background and UI
  {
    key: 'background',
    type: 'image',
    path: 'assets/bg.png',
    description: 'Game background image',
  },
  {
    key: 'logo',
    type: 'image',
    path: 'assets/logo.png',
    description: 'Color Rush logo',
  },

  // Colored dots for gameplay
  {
    key: 'dot-red',
    type: 'image',
    path: 'assets/dot-red.svg',
    description: 'Red colored dot (#E74C3C)',
  },
  {
    key: 'dot-green',
    type: 'image',
    path: 'assets/dot-green.svg',
    description: 'Green colored dot (#2ECC71)',
  },
  {
    key: 'dot-blue',
    type: 'image',
    path: 'assets/dot-blue.svg',
    description: 'Blue colored dot (#3498DB)',
  },
  {
    key: 'dot-yellow',
    type: 'image',
    path: 'assets/dot-yellow.svg',
    description: 'Yellow colored dot (#F1C40F)',
  },
  {
    key: 'dot-purple',
    type: 'image',
    path: 'assets/dot-purple.svg',
    description: 'Purple colored dot (#9B59B6)',
  },

  // Special game objects
  {
    key: 'bomb',
    type: 'image',
    path: 'assets/bomb.svg',
    description: 'Bomb with fuse icon (#34495E)',
  },
  {
    key: 'slowmo-dot',
    type: 'image',
    path: 'assets/slowmo-dot.svg',
    description: 'Slow-motion power-up dot with clock icon',
  },

  // UI icons
  {
    key: 'clock-icon',
    type: 'image',
    path: 'assets/clock-icon.svg',
    description: 'Clock icon for slow-mo charges display',
  },
];

/**
 * Get asset by key
 */
export function getAsset(key: string): AssetDefinition | undefined {
  return GAME_ASSETS.find(asset => asset.key === key);
}

/**
 * Get all assets of a specific type
 */
export function getAssetsByType(type: AssetDefinition['type']): AssetDefinition[] {
  return GAME_ASSETS.filter(asset => asset.type === type);
}

/**
 * Validate that all required assets are defined
 */
export function validateAssets(): { valid: boolean; missing: string[] } {
  const requiredAssets = [
    'background', 'logo',
    'dot-red', 'dot-green', 'dot-blue', 'dot-yellow', 'dot-purple',
    'bomb', 'slowmo-dot', 'clock-icon'
  ];

  const definedKeys = GAME_ASSETS.map(asset => asset.key);
  const missing = requiredAssets.filter(key => !definedKeys.includes(key));

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Color mapping for dot assets
 */
export const DOT_ASSET_MAP = {
  '#E74C3C': 'dot-red',
  '#2ECC71': 'dot-green',
  '#3498DB': 'dot-blue',
  '#F1C40F': 'dot-yellow',
  '#9B59B6': 'dot-purple',
} as const;

/**
 * Get dot asset key by color
 */
export function getDotAssetByColor(color: string): string | undefined {
  return DOT_ASSET_MAP[color as keyof typeof DOT_ASSET_MAP];
}