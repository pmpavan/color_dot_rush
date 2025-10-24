import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      // Splash screen customization for Color Dot Rush - Reddit Community Games 2025
      appDisplayName: 'Color Dot Rush',
      backgroundUri: 'neon-pulse-background.png', // Use the neon pulse background image
      buttonLabel: 'Play Color Dot Rush',
      description:
        'Tap into chaos! Tap the correct colored dots while avoiding bombs and wrong colors.',
      heading: 'Color Dot Rush',
      appIconUri: 'app-icon.png', // Use the Gemini generated app icon image
    },
    postData: {
      gameState: 'initial',
      score: 0,
    },
    subredditName: subredditName,
    title: 'Color Dot Rush - Tap into chaos!',
  });
};
