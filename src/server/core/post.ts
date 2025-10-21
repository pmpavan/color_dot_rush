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
      backgroundUri: 'logo.png',
      buttonLabel: 'Play Color Dot Rush',
      description:
        'Test your reflexes! Tap the correct colored dots while avoiding bombs and wrong colors.',
      heading: 'Color Dot Rush - Reddit Community Games 2025',
      appIconUri: 'logo.png',
    },
    postData: {
      gameState: 'initial',
      score: 0,
    },
    subredditName: subredditName,
    title: 'Color Dot Rush - Test Your Reflexes!',
  });
};
