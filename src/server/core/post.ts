import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      // Splash screen customization for Color Rush - Reddit Community Games 2025
      appDisplayName: 'Color Rush',
      backgroundUri: 'default-splash.png',
      buttonLabel: 'Play Color Rush',
      description:
        'Test your reflexes! Tap the correct colored dots while avoiding bombs and wrong colors.',
      heading: 'Color Rush - Reddit Community Games 2025',
      appIconUri: 'default-icon.png',
    },
    postData: {
      gameState: 'initial',
      score: 0,
    },
    subredditName: subredditName,
    title: 'Color Rush - Test Your Reflexes!',
  });
};
