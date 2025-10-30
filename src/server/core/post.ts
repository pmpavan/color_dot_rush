import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  // Format date for the title
  const now = new Date();
  // Use deterministic YYYY-MM-DD format to ensure date always appears
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const title = `Color Dot Rush - Tap into chaos! - ${dateStr}`;
  console.log('Creating Color Dot Rush post with title:', title);

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
    title,
  });
};
