import { reddit, redis, context } from '@devvit/web/server';

/**
 * Top Score Comment System
 * Posts a comment when a user beats the top score for a specific game post
 * Top scores are tracked per subreddit and per post
 */

/**
 * Check if the score beats the top score for the post and post a comment if it does
 * Top scores are tracked per subreddit and per post
 * @param postId The Reddit post ID
 * @param username The username who submitted the score
 * @param score The score achieved
 * @returns Promise<{ isNewTopScore: boolean; commentPosted?: boolean; error?: string }>
 */
export async function checkAndPostTopScoreComment(
  postId: string,
  username: string,
  score: number
): Promise<{ isNewTopScore: boolean; commentPosted?: boolean; error?: string }> {
  try {
    if (!postId) {
      return { isNewTopScore: false, error: 'Post ID is required' };
    }

    // Get subreddit name from context
    const { subredditName } = context;
    if (!subredditName) {
      return { isNewTopScore: false, error: 'Subreddit name is required' };
    }

    // Redis keys for storing top score and top scorer per subreddit and per post
    // Format: subreddit:{subredditName}:post-top-score:{postId}
    // Format: subreddit:{subredditName}:post-top-scorer:{postId}
    const topScoreKey = `subreddit:${subredditName}:post-top-score:${postId}`;
    const topScorerKey = `subreddit:${subredditName}:post-top-scorer:${postId}`;
    
    // Get current top score and top scorer for this post
    const currentTopScoreStr = await redis.get(topScoreKey);
    const currentTopScore = currentTopScoreStr ? parseInt(currentTopScoreStr, 10) : null;
    const previousTopScorer = await redis.get(topScorerKey);
    const isFirstScore = currentTopScore === null;
    const isNewTopScore = isFirstScore || score > currentTopScore;

    // Post comment if this is the first score OR if it beats the current top score
    if (isNewTopScore) {
      const previousScore = currentTopScore ?? 0;
      console.log(`New top score for r/${subredditName} post ${postId}: ${score} (previous: ${previousScore}) by ${username}${isFirstScore ? ' - FIRST SCORE!' : ''}`);
      
      // Update the top score and top scorer in Redis
      await redis.set(topScoreKey, score.toString());
      await redis.set(topScorerKey, username);
      // Set expiration to 30 days (posts can be active for a while)
      await redis.expire(topScoreKey, 30 * 24 * 60 * 60);
      await redis.expire(topScorerKey, 30 * 24 * 60 * 60);

      // Build comment message
      let commentText: string;
      if (isFirstScore) {
        // First score - congratulate and start the tournament chain
        commentText = `🎉 Congratulations u/${username}! You scored ${score.toLocaleString()} points and started the tournament chain! Who can beat this score? Let's see who comes out on top! 🏆`;
      } else {
        // Someone beat the top score - congratulate and motivate both players
        const isBeatingOwnScore = previousTopScorer && previousTopScorer === username;
        
        if (isBeatingOwnScore) {
          // Same person beat their own score - don't repeat the name
          commentText = `🎉 Congratulations u/${username}! You beat your own top score with ${score.toLocaleString()} points! Keep going higher! The chain continues! 🔥`;
        } else {
          // Different person beat the top score - tag both players
          const previousScorerTag = previousTopScorer ? `u/${previousTopScorer}` : 'the previous top scorer';
          commentText = `🎉 Congratulations u/${username}! You beat the top score with ${score.toLocaleString()} points! ${previousScorerTag}, don't slack - come back and beat this! And u/${username}, keep going higher! The chain continues! 🔥`;
        }
      }

      // Post a comment on the post
      try {
        await reddit.submitComment({
          id: postId as `t3_${string}`,
          text: commentText,
        });

        console.log(`Successfully posted top score comment for r/${subredditName} post ${postId}${isFirstScore ? ' (first score)' : ''}`);
        return {
          isNewTopScore: true,
          commentPosted: true,
        };
      } catch (commentError) {
        console.error('Error posting top score comment:', commentError);
        // Don't fail the whole operation if comment posting fails
        return {
          isNewTopScore: true,
          commentPosted: false,
          error: commentError instanceof Error ? commentError.message : 'Failed to post comment',
        };
      }
    }

    return { isNewTopScore: false };
  } catch (error) {
    console.error('Error checking top score:', error);
    return {
      isNewTopScore: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get the current top score for a post
 * Top scores are tracked per subreddit and per post
 * @param postId The Reddit post ID
 * @returns Promise<number> The current top score (0 if none exists)
 */
export async function getPostTopScore(postId: string): Promise<number> {
  try {
    const { subredditName } = context;
    if (!subredditName) {
      console.error('Subreddit name is required to get post top score');
      return 0;
    }

    // Redis key format: subreddit:{subredditName}:post-top-score:{postId}
    const topScoreKey = `subreddit:${subredditName}:post-top-score:${postId}`;
    const topScoreStr = await redis.get(topScoreKey);
    return topScoreStr ? parseInt(topScoreStr, 10) : 0;
  } catch (error) {
    console.error('Error getting post top score:', error);
    return 0;
  }
}

